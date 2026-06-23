# Blueprint de Integración: Punto de Venta (POS) y Plano de Mesas Interactivo

Este documento detalla la arquitectura, bases de datos, lógica de backend y frontend necesaria para replicar la sección del **Punto de Venta (POS)**, **Diseño de Plano de Mesas con Drag & Drop** y **División de Cuentas** en cualquier otro proyecto.

Al final del archivo encontrarás un **prompt optimizado** para alimentar a una Inteligencia Artificial para que genere este sistema desde cero en la tecnología que desees (ej. Node.js, Next.js, Django, etc.).

---

## 🗄️ 1. Estructura de Base de Datos (Esquema Relacional)

Para que el sistema funcione, necesitas definir las siguientes tablas y relaciones en tu base de datos:

### A. Tabla: `areas` (Zonas o Salones)
Define los espacios físicos del restaurante (ej: Terraza, Salón Principal, Barra).
* `id` (Clave primaria, Autoincremental)
* `name` (VARCHAR 255 - Nombre de la zona)
* `timestamps` (`created_at`, `updated_at`)

### B. Tabla: `tables` (Mesas)
Define las mesas físicas dentro de cada salón y su coordenadas en el plano interactivo.
* `id` (Clave primaria, Autoincremental)
* `area_id` (Clave foránea hacia `areas.id` con eliminación en cascada)
* `name` (VARCHAR 255 - Ej: "Mesa 1", "T-2")
* `seats` (INT - Capacidad de personas)
* `status` (ENUM: `'available'`, `'occupied'`, `'reserved'` - Estado por defecto: `'available'`)
* `x_pos` (INT - Coordenada X en píxeles para el plano - Por defecto: `50`)
* `y_pos` (INT - Coordenada Y en píxeles para el plano - Por defecto: `50`)
* `timestamps`

### C. Tabla: `orders` (Órdenes / Cuentas)
Almacena el estado de la cuenta vinculada a una mesa y los montos finales.
* `id` (Clave primaria, Autoincremental)
* `table_id` (Clave foránea hacia `tables.id`)
* `user_id` (Clave foránea hacia `users.id` - Mozo o Cajero que inició la orden)
* `client_id` (Clave foránea opcional hacia `clients.id`)
* `status` (ENUM: `'pending'`, `'completed'`, `'cancelled'` - Estado por defecto: `'pending'`)
* `document_type` (VARCHAR - Ej: "Ticket", "Factura", "Boleta")
* `client_name` (VARCHAR - Por defecto: "Público General")
* `client_document` (VARCHAR - Documento de identidad)
* `total` (DECIMAL 10,2 - Monto total neto de la orden)
* `discount` (DECIMAL 10,2 - Descuento aplicado)
* `tip` (DECIMAL 10,2 - Propina agregada)
* `payment_method` (VARCHAR - Ej: "cash", "card", "transfer")
* `received_amount` (DECIMAL 10,2 - Dinero entregado por el cliente)
* `change_amount` (DECIMAL 10,2 - Vuelto calculado)
* `notes` (TEXT - Indicaciones generales de la orden)
* `timestamps`

### D. Tabla: `order_details` (Detalle de la Orden)
Define los ítems/platos solicitados en una orden específica.
* `id` (Clave primaria, Autoincremental)
* `order_id` (Clave foránea hacia `orders.id` con eliminación en cascada)
* `product_id` (Clave foránea hacia `products.id`)
* `quantity` (INT - Cantidad solicitada)
* `price` (DECIMAL 10,2 - Precio unitario del producto al momento de la venta)
* `note` (VARCHAR 255 - Indicaciones específicas de cocina, ej: "Sin cebolla")
* `status` (ENUM: `'pending'`, `'cooking'`, `'served'` - Control para el Monitor de Cocina KDS)
* `timestamps`

---

## 🧠 2. Flujo de Controladores y Endpoints

Debes implementar los siguientes controladores y rutas para manejar las operaciones clave:

```
GET    /pos                          -> Dashboard de Zonas y Mesas
GET    /pos/table/{table}            -> Pantalla de toma de pedido de una mesa específica
POST   /pos/order/{table}/add        -> Agregar producto al carrito (AJAX)
POST   /pos/order/{table}/barcode    -> Buscar y agregar producto por código de barras (AJAX)
POST   /pos/detail/{detail}/update   -> Modificar cantidad del ítem en la orden (AJAX)
POST   /pos/detail/{detail}/note     -> Añadir nota de cocina en el ítem (AJAX)
DELETE /pos/detail/{detail}          -> Eliminar un ítem de la orden (AJAX)
POST   /pos/order/{order}/discount   -> Aplicar descuentos o propinas a la cuenta (AJAX)
POST   /pos/order/{order}/move       -> Cambiar orden completa de una mesa a otra mesa libre
GET    /pos/order/{order}/split      -> Renderizar vista de división de cuentas
POST   /pos/order/{order}/split      -> Procesar cobro de los ítems seleccionados en la división (Transacción)
POST   /pos/order/{order}/checkout   -> Procesar pago total y cerrar la mesa
```

---

## 🎨 3. Lógica del Frontend y Estructura Visual

### A. El Plano de Mesas Interactivo (Grid con absolute positioning)
El contenedor de la zona debe tener posición relativa (`position: relative`) y dimensiones fijas o proporcionales (ej: `min-height: 500px`). Cada mesa se dibuja de forma absoluta en base a sus coordenadas guardadas (`x_pos`, `y_pos`).

**CSS Básico para el renderizado del mapa:**
```css
.canvas-zona {
    position: relative;
    width: 100%;
    height: 550px;
    background-color: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 16px;
    overflow: hidden;
}

.mesa-tarjeta {
    position: absolute;
    width: 100px;
    height: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    cursor: pointer;
    user-select: none;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    transition: transform 0.2s, box-shadow 0.2s;
}

/* Colores de estado */
.mesa-tarjeta.disponible { background-color: #10b981; color: white; }
.mesa-tarjeta.ocupada { background-color: #ef4444; color: white; }
.mesa-tarjeta.reservada { background-color: #eab308; color: white; }
```

### B. Implementación de Drag & Drop para Guardar la Distribución (JS Vanilla)
Para permitir al usuario reorganizar sus salones arrastrando las mesas con el mouse:

1. Agrega a los elementos de las mesas el atributo `draggable="true"` únicamente cuando esté activa la edición del mapa.
2. Utiliza JavaScript para actualizar las posiciones temporales y enviarlas al backend:

```javascript
let activeDraggable = null;

// Escuchadores de eventos de arrastre
document.querySelectorAll('.mesa-tarjeta-editable').forEach(mesa => {
    mesa.addEventListener('dragstart', (e) => {
        activeDraggable = e.target;
        e.dataTransfer.setData('text/plain', null); // Requerido por Firefox
    });
});

const canvas = document.querySelector('.canvas-zona');
canvas.addEventListener('dragover', (e) => {
    e.preventDefault(); // Permite soltar el elemento
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!activeDraggable) return;

    // Calcular las coordenadas relativas al contenedor
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left - (activeDraggable.offsetWidth / 2);
    let y = e.clientY - rect.top - (activeDraggable.offsetHeight / 2);

    // Evitar que la mesa salga de los límites del contenedor
    x = Math.max(0, Math.min(x, rect.width - activeDraggable.offsetWidth));
    y = Math.max(0, Math.min(y, rect.height - activeDraggable.offsetHeight));

    // Posicionar la mesa visualmente
    activeDraggable.style.left = `${x}px`;
    activeDraggable.style.top = `${y}px`;
    activeDraggable.setAttribute('data-x', Math.round(x));
    activeDraggable.setAttribute('data-y', Math.round(y));
});

// Guardar los datos del plano vía AJAX POST
function guardarPosiciones() {
    const mesas = [];
    document.querySelectorAll('.mesa-tarjeta-editable').forEach(m => {
        mesas.push({
            id: m.getAttribute('data-id'),
            x: m.getAttribute('data-x'),
            y: m.getAttribute('data-y')
        });
    });

    fetch('/tables/update-positions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ positions: mesas })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            alert('Mapa guardado correctamente');
        }
    });
}
```

---

## ⚡ 4. Lógica de Negocio de la División de Cuentas (Split Bill)

El backend debe resolver la división de cuentas realizando las siguientes tareas de manera atómica (dentro de una transacción de base de datos):

1. **Recibir:** Un array con los IDs de los detalles de orden seleccionados (`OrderDetail`) y el método de pago elegido.
2. **Crear una Nueva Orden:** Generar un registro en la tabla `orders` con estado `'completed'`, asignando el método de pago y el total acumulado de los detalles seleccionados.
3. **Mudar Detalles:** Cambiar la clave foránea `order_id` de los detalles seleccionados para que ahora apunten a la nueva orden cobrada.
4. **Descontar Stock e Historial:** Para cada ítem trasladado a la orden completada:
   - Descontar el stock (si el producto usa insumos, restar el stock a nivel de ingredientes según su receta; si no, restar directo del stock del producto).
   - Crear una fila de historial/kardex en `inventory_logs` con tipo `'sale'` (venta) para auditar la salida.
5. **Ajuste Final:**
   - Calcular el total de la nueva orden completada y guardarlo.
   - Recalcular el subtotal y el total neto de la orden original restante de la mesa.
   - **Cierre Inteligente:** Si la orden original se queda vacía (porque ya cobraron todo), eliminar la orden original para que la mesa vuelva a quedar en estado disponible (verde) inmediatamente.

---

## 🤖 5. PROMPT PARA IA (Replicar esta sección en tu otro proyecto)

Copia y pega el siguiente prompt en tu chat de IA para que genere todo el código en el lenguaje y framework que utilices:

```text
Actúa como un desarrollador web experto full stack. Quiero que me crees e integres un sistema de Punto de Venta (POS) y Gestión Visual de Mesas para Restaurante en mi aplicación. 

Tecnologías a utilizar en mi proyecto: [ESCRIBE AQUÍ TU STACK, EJ: Node.js, Express, React y PostgreSQL / o Next.js con TailwindCSS].

El sistema debe incluir las siguientes funcionalidades clave estructuradas paso a paso:

1. Base de Datos:
- Tabla 'areas' (Zonas físicas del restaurante, ej: Salón, Terraza).
- Tabla 'tables' (Mesas pertenecientes a un área. Deben almacenar nombre de mesa, capacidad de asientos, estado ('disponible', 'ocupada', 'reservada') y las coordenadas 'x_pos' e 'y_pos' en píxeles).
- Tabla 'orders' (Cuentas con columnas para total, propina, descuento, método de pago, monto recibido, vuelto, y estado ('pending', 'completed', 'cancelled')).
- Tabla 'order_details' (Platos incluidos en un pedido, con relación a producto, cantidad, precio histórico y un campo de texto para notas especiales de cocina).

2. Panel de Punto de Venta (POS):
- Una interfaz donde se filtren las mesas por áreas mediante pestañas.
- Las mesas deben dibujarse de manera absoluta en base a sus coordenadas 'x_pos' e 'y_pos' sobre un contenedor con posición relativa.
- El color de las mesas debe indicar su estado actual: Verde (disponible, sin órdenes pendientes), Rojo (ocupada, con orden pendiente de cobro) y Amarillo (reservada).
- Al hacer clic en una mesa disponible, se debe abrir la pantalla de pedido. Al hacer clic en una ocupada, debe cargar la orden activa con opción de agregar productos o proceder a cobrarla.

3. Plano de Mesas con Drag & Drop:
- Una interfaz interactiva de diseño donde el usuario pueda agregar salones (áreas) y mesas.
- Habilita arrastrar las mesas (utilizando mousedown/mousemove o HTML5 drag and drop) para acomodarlas dentro del espacio de la sala física.
- Incluye un botón "Guardar Posiciones" que envíe las coordenadas actualizadas de todas las mesas al servidor mediante un endpoint AJAX (POST) y las actualice en la base de datos.

4. División de Cuenta (Split Bill):
- Crea una vista/modal dentro del carrito de la mesa ocupada para dividir la cuenta.
- El usuario puede marcar con casillas de verificación (checkboxes) los ítems específicos de la comanda de la mesa que desea cobrar por separado.
- Al confirmar el cobro, el backend debe:
  a. Crear una orden independiente completada con los ítems seleccionados.
  b. Mover la referencia de esos detalles a la nueva orden completada.
  c. Descontar el stock correspondiente de los insumos y registrar la venta en los logs de inventario (Kardex).
  d. Recalcular el total remanente en la mesa para los comensales que quedan consumiendo.
  e. Si ya no quedan platos pendientes por cobrar en la mesa original, eliminar/cerrar la orden para liberar la mesa automáticamente.

Escríbeme todo el código limpio, estructurado y listo para producción, separando la lógica del backend (controladores, rutas y base de datos) del frontend (HTML, estilos CSS, y JavaScript AJAX).
```

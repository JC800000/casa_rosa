# Plan de Handoff e Implementación: Combos y Módulo de Reportes (Fase 3)

Este documento sirve como especificación y plan de trabajo para implementar el sistema de **Combos y Promociones** y el nuevo **Módulo de Reportes Históricos** de la cafetería Casa Rosa.

---

## 1. Punto de Partida (Qué tenemos ahorita)

### Backend (Django & GraphQL)
* **Modelos de Base de Datos:**
  * El modelo `Combo` ya existe en `productos/models.py`. Cuenta con los campos: `nombre` (CharField), `foto` (ImageField, carpeta `combos/`), `precio` (DecimalField), `productos` (ManyToManyField a `Producto`), `activo` (BooleanField), `fecha_inicio` (DateField) y `fecha_fin` (DateField).
  * El modelo `DetallePedido` en `pedidos/models.py` ya cuenta con una relación `combo = models.ForeignKey('productos.Combo', ...)` además del de `producto`.
* **Esquema GraphQL:**
  * En `productos/schema.py` ya existe el tipo `ComboType` expuesto, la query `combos_activos` en `ProductoQuery` y las mutaciones para crear, editar y eliminar combos (implementadas con argumentos planos).

### Frontend (React & Tailwind)
* **Menú del Cliente (`MenuMesa.jsx` / `Online.jsx`):**
  * Cargan el menú de productos agrupados por categorías e interactúan con el carrito de compra local. (Ambos ya fueron actualizados para soportar combos).
* **Panel Administrativo (`/panel/*`):**
  * La barra lateral (`AdminLayout.jsx`) contiene accesos rápidos a Productos, Categorías, Mesas, Pedidos, Caja, Roles, Usuarios, Combos y Reportes.
  * El `Dashboard.jsx` muestra resúmenes dinámicos en tiempo real únicamente del día **hoy** (ventas brutas, neto, egresos y mesas ocupadas). El módulo `/panel/reportes` ya se encuentra implementado para permitir navegación histórica y exportaciones.

---

## 2. Lo que se debe hacer (Paso a Paso)

### 2.1 Módulo de Combos y Promociones

#### Backend (GraphQL):
1. **Actualizar `productos/schema.py`:**
   * Utilizar las mutaciones de argumentos planos existentes (`crear_combo`, `actualizar_combo`, `eliminar_combo`) alineadas con el frontend.
   * Ajustar la query `combos_activos` para filtrar combos donde `activo=True` y la fecha de hoy esté dentro del rango `[fecha_inicio, fecha_fin]` (si están definidos).
2. **Actualizar `pedidos/schema.py`:**
   * Asegurar que las mutaciones `crear_pedido_mesa`, `agregar_items` y `crear_pedido_online` lean la propiedad `combo_id` opcional del detalle, busquen el `Combo` y registren la compra guardando su precio unitario en `DetallePedido`.

#### Frontend (Admin & Clientes):
1. **Crear `/panel/combos` (`Combos.jsx`):**
   * Crear una vista administrativa con una tabla de combos (con buscador, estado activo/inactivo e indicador de vigencia).
   * Un modal o formulario para crear/editar combos:
     * Campos de texto, precio y fechas.
     * Lista interactiva con casillas de verificación (checkboxes) para seleccionar qué productos del inventario pertenecen al combo.
     * Subida de imágenes conectada al endpoint REST `/api/upload-foto/` (que devuelve la ruta de la foto cargada).
2. **Actualizar Menú de Clientes (`MenuMesa.jsx` y `Online.jsx`):**
   * Consultar la query `combos_activos` mediante Apollo Client.
   * Mostrar una pestaña destacada **"🎁 Combos y Promos"** al principio del menú.
   * Permitir agregar combos al carrito local (estructurando el ítem con `comboId`, nombre, precio y cantidad).
   * Al confirmar el pedido, enviar el `comboId` en el arreglo de detalles de la mutación.

---

### 2.2 Módulo de Reportes Históricos

#### Backend (GraphQL):
1. **Actualizar `caja/schema.py`:**
   * Exponer la query `reporte_ventas(fecha_inicio: String, fecha_fin: String)` que devuelva un objeto con:
     * Sumatoria de ventas totales brutas, netas, efectivas, por QR y total de gastos en el rango.
     * Listado de ventas agrupadas por día (para graficar tendencias).
     * Top 5 de productos y top 5 de combos más vendidos.
     * Listado de objetos `CajaDiariaType` de cajas cerradas en ese periodo de tiempo.
   * Asegurar que el filtro temporal aplique sobre la zona horaria **America/La_Paz**.

#### Frontend (Auditoría e informes):
1. **Crear `/panel/reportes` (`Reportes.jsx`):**
   * **Filtros de rango:** Calendario o botones rápidos para: "Hoy", "Últimos 7 días", "Este mes", "Mes anterior" y "Rango personalizado".
   * **Tarjetas Financieras (Neto/Bruto):** Mostrar resumen acumulado del rango.
   * **Gráfico de tendencias:** Representación visual de ventas diarias y top artículos.
   * **Historial de Cajas:** Tabla interactiva mostrando los arqueos históricos (Fecha, Fondo Inicial, Egresos, Esperado vs Real, Diferencia, Observación y usuario que cerró).
   * **Exportación CSV:** Generar un archivo descargable con los datos crudos del reporte financiero.
   * **Vista de Impresión:** Botón de impresión que utilice media queries de CSS (`@media print`) para renderizar un informe limpio en blanco y negro, ocultando las barras laterales y botones de navegación.
2. **Integrar enlaces:**
   * Agregar enlaces para "🍔 Combos" y "📈 Reportes" en el sidebar en `AdminLayout.jsx`.

---

## 3. Resultado Final Esperado (El Objetivo)

### Flujo de Combos:
1. El **Administrador** entra a `/panel/combos`, hace clic en "Crear Combo", le pone por nombre *"Combo Desayuno Rosa"*, precio *"Bs 22.00"*, selecciona del listado *"Café Americano"* y *"Torta de Vainilla"*, sube una foto y guarda.
2. Un **Cliente** escanea el QR en la Mesa 3. En su celular se abre el menú, entra a la pestaña "Combos y Promos", ve el *"Combo Desayuno Rosa"* por Bs 22.00, lo agrega al carrito y confirma el pedido.
3. En **Cocina (KDS)** suena la alerta y aparece una tarjeta: **"Mesa 3: 1x Combo Desayuno Rosa"**.
4. Al pedir la cuenta, la **Cajera** visualiza el total correcto (Bs 22.00) en su pantalla de cobro y cierra la transacción.

### Flujo de Reportes:
1. El **Administrador** entra a `/panel/reportes`.
2. Selecciona en el filtro: *Desde 01/05/2026 hasta 31/05/2026*.
3. La interfaz le muestra que hubo **Bs 5,420.00** en ventas brutas, **Bs 320.00** en gastos de caja y un neto de **Bs 5,100.00**.
4. Ve un gráfico donde se muestra que el producto más vendido fue el *Café Capuccino* y que se cobró un 60% por QR y un 40% en Efectivo.
5. Abajo visualiza la lista de arqueos de caja del mes. Ve que el día 15 de mayo hubo una diferencia de `-Bs 10.00` con la observación: *"Sencillo faltante al dar cambio a cliente"*.
6. Hace clic en **"Exportar CSV"** para guardar el informe en su computadora, o en **"Imprimir"** para generar un PDF físico del arqueo consolidado.

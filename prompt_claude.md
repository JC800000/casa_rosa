# Prompt para Claude: Implementación de la Personalización de la Página de Inicio

Copia y pega las siguientes instrucciones en Claude (o en tu asistente de desarrollo de IA) para ejecutar de forma autónoma el plan:

```markdown
Hola, necesito que implementes una funcionalidad para personalizar dinámicamente la información de la página de inicio (landing page) desde el panel de administración en React. El proyecto está construido con un backend Django (utilizando Strawberry GraphQL) y un frontend en React (usando Apollo Client).

Sigue detalladamente estos pasos para realizar la implementación:

### Paso 1: Modificaciones en el Backend (Django)

1. **Modelos (`backend/configuracion/models.py`)**:
   Añade los siguientes campos al modelo `Configuracion` (que funciona como un Singleton):
   - `direccion_fisica` (models.CharField, max_length=300, default='Av. Las Rosas #123, Zona Central, Bolivia')
   - `horario_atencion` (models.CharField, max_length=150, default='Lunes a Domingo: 8:00 AM – 10:00 PM')
   - `google_maps_url` (models.URLField, max_length=500, default='https://maps.google.com')
   - `estacionamiento_detalle` (models.CharField, max_length=200, default='Disponible frente al local')

2. **Esquema GraphQL (`backend/configuracion/schema.py`)**:
   - Agrega estos campos en el tipo `ConfiguracionType`.
   - Mapea los campos en la función helper `_to_type` para obtenerlos de la base de datos.
   - Agrega los parámetros correspondientes (todos de tipo `Optional[str] = None`) a la mutación `actualizar_configuracion`.
   - Modifica la lógica interna de `actualizar_configuracion` para que, si el argumento no es nulo, actualice el campo en la base de datos y llame a `c.save()`.

3. **Migraciones**:
   Ejecuta los comandos en la consola del backend para generar y aplicar los cambios en la base de datos:
   `python manage.py makemigrations configuracion`
   `python manage.py migrate`

---

### Paso 2: Modificaciones en el Frontend (React + GraphQL)

1. **Queries GraphQL (`frontend/src/graphql/configuracion.js`)**:
   Extiende tanto la consulta `GET_CONFIGURACION` como la mutación `ACTUALIZAR_CONFIGURACION` para incluir los nuevos campos:
   - `direccionFisica`
   - `horarioAtencion`
   - `googleMapsUrl`
   - `estacionamientoDetalle`

2. **Formulario de Administración (`frontend/src/pages/admin/Configuracion.jsx`)**:
   Crea una nueva página de configuración general en el panel administrativo.
   - El componente debe estar envuelto en `<AdminLayout titulo="Configuración General">`.
   - Usa `useQuery(GET_CONFIGURACION)` para precargar el estado del formulario.
   - Crea campos de entrada para el Nombre del Negocio, Teléfono WhatsApp, Costo de Envío, Dirección Física, Horario de Atención, Enlace de Google Maps y Detalle del Estacionamiento.
   - Usa `useMutation(ACTUALIZAR_CONFIGURACION)` y maneja el estado de carga (`loading`) y alertas visuales (puedes usar el sistema de notificaciones/toasts existente en otros componentes de `frontend/src/pages/admin/`).

3. **Rutas e Integración de Menú (`frontend/src/App.jsx` y `frontend/src/layouts/AdminLayout.jsx`)**:
   - En `App.jsx`, importa el nuevo componente `Configuracion` y añade la ruta protegida por permisos:
     `<Route path="/panel/configuracion" element={<PermisoRoute codigo="gestionar_usuarios"><Configuracion /></PermisoRoute>} />`
   - En `AdminLayout.jsx`, añade el item en el arreglo de navegación `NAV_ITEMS`:
     `{ to: '/panel/configuracion', label: 'Configuración', icon: '⚙️', permiso: 'gestionar_usuarios' }`

4. **Vinculación de Datos Dinámicos en la Página de Inicio (`frontend/src/pages/Inicio.jsx`)**:
   - Importa `useQuery` de `@apollo/client` y la query `GET_CONFIGURACION`.
   - Carga la información al inicio del componente `Inicio()`.
   - Reemplaza el arreglo estático `INFO_ITEMS` por un arreglo dinámico generado dentro del componente que use los valores de `configuracion` del backend, proporcionando fallbacks por defecto (los valores hardcoded actuales) en caso de que vengan nulos.
   - Modifica el botón de "Google Maps" (`href={conf?.googleMapsUrl || 'https://maps.google.com'}`) y el enlace de "WhatsApp" (`href={`https://wa.me/${conf?.telefonoWhatsapp || '59176543210'}`}`) para que operen con los datos de configuración reales de la base de datos.
```

# Sistema de caja y cocina 

Este proyecto lo hice para organizar el proceso de toma de pedidos de Comidas La 9. La idea principal fue tener un sistema sencillo para registrar las ventas, consultar los pedidos, controlar los estados en cocina y llevar el seguimiento de los pagos.

## Qué puedo hacer con el sistema

Con la aplicación puedo:

- Registrar nuevos pedidos.
- Agregar productos y cantidades.
- Añadir instrucciones especiales para cada producto.
- Consultar los pedidos registrados.
- Cambiar el estado de un pedido mientras avanza en cocina.
- Registrar si el pedido fue pagado en efectivo o por transferencia.
- Consultar un resumen de pedidos y ventas por fechas.
- Trabajar con productos disponibles, categorías y precios variables.
- Abrir una vista independiente para el trabajo de cocina.

## Cómo está organizado

Separé el proyecto en una parte visual y una parte de servidor:

- `index.html`: pantalla principal del sistema de caja.
- `app.js`: lógica de la caja, pedidos y comunicación con el backend.
- `cocina.html`: pantalla utilizada para consultar y gestionar los pedidos en cocina.
- `cocina.js`: lógica de la vista de cocina.
- `api.php`: backend que recibe las solicitudes y trabaja con la base de datos.
- `database.sql`: estructura inicial de la base de datos.
- `migracion_menu.sql`: productos, categorías y opciones iniciales del menú.
- `migracion_rendimiento.sql`: índices para mejorar algunas consultas.
- `config.example.php`: ejemplo de configuración para conectarse a MySQL.
- `styles.css`, `final-design.css`, `design.css` y `options.css`: estilos de la aplicación.
- `boot.js` y `api.json`: archivos auxiliares de configuración.
- `backup.ps1`: script para generar respaldos de la base de datos.
- `REGISTRO_ERRORES.md`: registro de problemas encontrados durante el desarrollo.

## Tecnologías utilizadas

Para construirlo utilicé:

- HTML, CSS y JavaScript para la interfaz.
- PHP para el backend.
- MySQL para guardar los productos, pedidos, pagos y eventos.
- Apache y XAMPP para ejecutarlo localmente.

## Instalación local

Para probarlo localmente sigo estos pasos.

### 1. Preparar XAMPP

Primero inicio Apache y MySQL desde XAMPP. Después copio esta carpeta dentro de:

```text
C:\xampp\htdocs
```

Por ejemplo:

```text
C:\xampp\htdocs\comidas-la-9
```

### 2. Crear la base de datos

En phpMyAdmin creo la base de datos llamada `restaurante_pedidos` y ejecuto el archivo `database.sql`.

Si la base de datos ya existía, ejecuto también, una sola vez, `migracion_menu.sql` y `migracion_rendimiento.sql`.

### 3. Configurar la conexión

Copio `config.example.php` con el nombre `config.php` y reviso los datos de conexión a MySQL. En una instalación normal de XAMPP utilizo `root` y dejo la contraseña vacía, pero esa configuración depende del equipo donde se vaya a instalar.

El archivo `config.php` no se sube al repositorio porque puede contener credenciales locales.

### 4. Abrir el sistema

Con Apache y MySQL encendidos, abro en el navegador:

```text
http://localhost/direccion/
```

La vista de cocina se puede abrir desde:

```text
http://localhost/direccion/cocina.html
```

## Rutas principales del backend

El archivo `api.php` maneja las operaciones principales del sistema:

```text
GET    api.php?action=productos
GET    api.php?action=pedidos
POST   api.php?action=pedidos
POST   api.php?action=agregar-item&id=1
PATCH  api.php?action=estado&id=1
PATCH  api.php?action=pago&id=1
GET    api.php?action=resumen&desde=2026-09-30&hasta=2026-09-30
```

La consulta de pedidos utiliza paginación. Por ejemplo:

```text
api.php?action=pedidos&pagina=1&limite=50
```

El límite máximo por consulta es de 100 pedidos.

## Respaldos

Incluí el archivo `backup.ps1` para generar un respaldo de la base de datos usando `mysqldump`.

El respaldo se guarda en:

```text
C:\xampp\backups\restaurante
```

Para ejecutarlo desde PowerShell puedo usar:

```powershell
.\backup.ps1
```

El script no elimina los pedidos existentes.

## Estado actual

El sistema ya cuenta con el flujo principal de caja, registro de pedidos y cocina. Por ahora los pagos se registran como efectivo o transferencia. La integración de pagos mediante QR de Nequi queda pendiente para una etapa posterior.

## Consideraciones

Este proyecto está pensado para ejecutarse inicialmente en un entorno local con XAMPP, Apache y MySQL. Antes de ponerlo en producción tendría que agregar autenticación de usuarios, permisos por rol, protección adicional para las rutas del backend y una estrategia de respaldo automatizada.


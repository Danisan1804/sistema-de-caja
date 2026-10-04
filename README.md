# Backend separado del sistema de restaurante

Este backend no modifica `C:\xampp\htdocs\restaurante`.

## Instalación local

1. Crear la base de datos ejecutando `database.sql` en phpMyAdmin.
2. Copiar `config.example.php` como `config.php` y ajustar credenciales de XAMPP.
3. Copiar esta carpeta dentro de `C:\xampp\htdocs` cuando se vaya a probar desde Apache.
4. Cargar productos en la tabla `productos`.

Si la base de datos ya existía, ejecuta `migracion_menu.sql` en phpMyAdmin para agregar el menú inicial, precios variables y tipo de servicio. Ejecuta una vez `migracion_rendimiento.sql` para agregar los índices de crecimiento.

`GET pedidos` usa paginación: `?pagina=1&limite=50`. El máximo por consulta es 100 pedidos y los productos de todos ellos se cargan en una sola consulta agrupada.

Para respaldar la base de datos ejecuta `backup.ps1`. El respaldo se guarda en `C:\xampp\backups\restaurante` y no borra pedidos.

## Rutas iniciales

- `GET api.php?action=productos`
- `GET api.php?action=pedidos`
- `POST api.php?action=pedidos`
- `POST api.php?action=agregar-item&id=1`
- `PATCH api.php?action=estado&id=1`
- `PATCH api.php?action=pago&id=1`
- `GET api.php?action=resumen&desde=2026-09-30&hasta=2026-09-30`

La integración QR de Nequi queda para una fase posterior. Por ahora solo se registra efectivo o transferencia al finalizar el pedido.

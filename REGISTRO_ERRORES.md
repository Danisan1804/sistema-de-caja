# Registro de errores

## Error 001 · 2026-10-02

**Mensaje:** `Uncaught TypeError: Cannot set properties of null (setting 'onclick')`

**Archivo:** `app.js`, línea 50.

**Causa:** La interfaz se separó en `index.html` y `cocina.html`, pero `app.js` seguía intentando asignar eventos a `refreshOrders`. Ese elemento ya no existe en `index.html`.

**Corrección:** Verificar que cada elemento exista antes de asignar `onclick`:

```js
if ($('refreshOrders')) $('refreshOrders').onclick = loadOrders;
```

**Prevención:** Cada archivo JavaScript debe trabajar únicamente con los elementos de su propia interfaz o comprobar su existencia antes de usarlos.

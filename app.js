const API = "api.json";
const state = { products: [], cart: [] };
const money = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const esc = (value) =>
  String(value || "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const productIcon = (name) =>
  /hamburg/i.test(name)
    ? "🍔"
    : /perro/i.test(name)
      ? "🌭"
      : /chuzo/i.test(name)
        ? "🍢"
        : /carne/i.test(name)
          ? "🥩"
          : /picada/i.test(name)
            ? "🍟"
            : "🍽️";
const $ = (id) => document.getElementById(id);
if ($("connection")) $("connection").textContent = "Conectando…";

async function request(action, options = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      options.method || "GET",
      `${API}?action=${action}${options.id ? `&id=${options.id}` : ""}`,
      true,
    );
    xhr.timeout = 8000;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (_) {
        reject(new Error("Respuesta inválida del servidor"));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !data.ok) {
        reject(new Error(data.error || "No se pudo completar la solicitud"));
        return;
      }
      resolve(data);
    };
    xhr.onerror = () => reject(new Error("No se pudo conectar con el backend"));
    xhr.ontimeout = () =>
      reject(new Error("El backend tardó demasiado en responder"));
    xhr.send(options.body || null);
  });
}

function toast(message, error = false) {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast visible ${error ? "error" : ""}`;
  setTimeout(() => (el.className = "toast"), 2600);
}
function renderCart() {
  const target = $("cart");
  if (!state.cart.length) {
    target.innerHTML = '<p class="muted">No hay productos agregados.</p>';
    $("cartTotal").textContent = money(0);
    return;
  }
  target.innerHTML = state.cart
    .map(
      (item, i) =>
        `<div class="cart-line"><div><b>${esc(item.name)}</b><small>${item.quantity} × ${money(item.price)}${item.note ? ` · ${esc(item.note)}` : ""}</small></div><button class="remove" data-remove="${i}">×</button></div>`,
    )
    .join("");
  $("cartTotal").textContent = money(
    state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  target.querySelectorAll("[data-remove]").forEach(
    (button) =>
      (button.onclick = () => {
        state.cart.splice(Number(button.dataset.remove), 1);
        renderCart();
      }),
  );
}
function renderProducts() {
  const sauces = [
    "Rosada",
    "Tomate",
    "Ajo",
    "Piña",
    "Mostaza",
    "BBQ",
    "Mayonesa",
    "Tártara",
    "Sin salsa",
  ];
  const extras = ["Butifarra", "Salchicha", "Huevo", "Papas", "Carne picada"];
  $("products").innerHTML = state.products.length
    ? state.products
        .map(
          (p) =>
            `<article class="product"><div class="product-body"><div class="product-title"><b>${esc(p.nombre)}</b><small>${Number(p.precio_variable) ? "$10.000 a $100.000" : money(p.precio)}</small></div>${Number(p.precio_variable) ? `<div class="price-buttons">${[10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000].map((v) => `<button type="button" data-price="${p.id}" data-value="${v}">${money(v)}</button>`).join("")}</div><input class="custom-price" type="number" min="10000" max="100000" step="1000" placeholder="Precio específico" data-custom-price="${p.id}">` : ""}<div class="option-group extras-group"><span>Porciones aparte</span>${extras.map((x) => `<label><input type="checkbox" data-extra="${p.id}" value="${x}"> ${x}</label>`).join("")}</div><details class="sauce-drawer"><summary>Salsas <span>⌄</span></summary><div class="option-group sauce-options">${sauces.map((s) => `<label><input type="checkbox" data-sauce="${p.id}" value="${s}"> ${s}</label>`).join("")}</div></details><div class="product-actions"><input type="number" min="1" value="1" data-qty="${p.id}"><input placeholder="Otra instrucción" data-note="${p.id}"></div><button class="add-button" data-add="${p.id}">+</button></div></article>`,
        )
        .join("")
    : '<p class="muted">No hay productos. Ejecuta migracion_menu.sql en la base de datos.</p>';
  $("extraProduct").innerHTML = state.products
    .map(
      (p) =>
        `<option value="${p.id}">${esc(p.nombre)} · ${money(p.precio)}</option>`,
    )
    .join("");
  document.querySelectorAll("[data-price]").forEach(
    (button) =>
      (button.onclick = () => {
        const input = document.querySelector(
          `[data-custom-price="${button.dataset.price}"]`,
        );
        input.value = button.dataset.value;
        document
          .querySelectorAll(`[data-price="${button.dataset.price}"]`)
          .forEach((b) => b.classList.remove("selected"));
        button.classList.add("selected");
      }),
  );
  document.querySelectorAll("[data-add]").forEach(
    (button) =>
      (button.onclick = () => {
        const p = state.products.find(
          (x) => x.id === Number(button.dataset.add),
        );
        const quantity = Math.max(
          1,
          Number(document.querySelector(`[data-qty="${p.id}"]`).value || 1),
        );
        const priceInput = document.querySelector(
          `[data-custom-price="${p.id}"]`,
        );
        const basePrice = Number(p.precio_variable)
          ? Number(priceInput ? priceInput.value : 0)
          : Number(p.precio);
        if (
          Number(p.precio_variable) &&
          (basePrice < 10000 || basePrice > 100000)
        )
          return toast("Elige un precio entre $10.000 y $100.000", true);
        const saucesSelected = [
          ...document.querySelectorAll(`[data-sauce="${p.id}"]:checked`),
        ].map((x) => x.value);
        const extrasSelected = [
          ...document.querySelectorAll(`[data-extra="${p.id}"]:checked`),
        ].map((x) => x.value);
        const note = document
          .querySelector(`[data-note="${p.id}"]`)
          .value.trim();
        const parts = [];
        if (saucesSelected.length)
          parts.push(`Salsas: ${saucesSelected.join(", ")}`);
        if (extrasSelected.length)
          parts.push(`Aparte (+$5.000 c/u): ${extrasSelected.join(", ")}`);
        if (note) parts.push(note);
        state.cart.push({
          producto_id: p.id,
          name: p.nombre,
          price: basePrice + extrasSelected.length * 5000,
          basePrice,
          extras: extrasSelected,
          quantity,
          note: parts.join(" · "),
        });
        renderCart();
      }),
  );
}
async function loadProducts() {
  try {
    const result = await request("productos");
    state.products = result.data;
    renderProducts();
    $("connection").textContent = "Backend conectado";
    $("connection").className = "connection online";
  } catch (e) {
    $("connection").textContent = "Backend sin conexión";
    $("connection").className = "connection offline";
    toast(e.message, true);
  }
}
async function createOrder() {
  if (!state.cart.length) return toast("Agrega al menos un producto", true);
  try {
    const result = await request("pedidos", {
      method: "POST",
      body: JSON.stringify({
        tipo_servicio: $("serviceType").value,
        metodo_pago: $("paymentType").value,
        items: state.cart.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.quantity,
          precio: item.basePrice,
          extras: item.extras,
          instrucciones: item.note,
        })),
      }),
    });
    $("orderMessage").textContent =
      `Pedido #${result.data.id} enviado a cocina`;
    state.cart = [];
    $("paymentType").value = "";
    renderCart();
    toast("Pedido enviado a cocina");
    loadOrders();
  } catch (e) {
    toast(e.message, true);
  }
}
function orderCard(order) {
  const next = {
    recibido: "preparando",
    preparando: "finalizado",
    finalizado: null,
    cancelado: null,
  }[order.estado];
  const button = next
    ? `<button class="primary" data-state="${order.id}" data-next="${next}">${next === "preparando" ? "Iniciar preparación" : "Marcar finalizado"}</button>`
    : "";
  const cancel = !["finalizado", "cancelado"].includes(order.estado)
    ? `<button class="danger" data-state="${order.id}" data-next="cancelado">Cancelar</button>`
    : "";
  const options = ["Butifarra", "Salchicha", "Huevo", "Papas", "Carne picada"]
    .map((p) => `<option value="${p}">${p}</option>`)
    .join("");
  const canAdd = !["finalizado", "cancelado"].includes(order.estado);
  return `<article class="order-card"><div class="order-head"><b>Pedido #${order.id}</b><span class="service-badge">${order.tipo_servicio === "llevar" ? "Para llevar" : "Comer aquí"}</span><span class="status ${order.estado}">${order.estado}</span></div><div class="order-items">${order.items.map((item) => `<div><span>${item.cantidad} × ${esc(item.nombre_producto)}<small>${item.instrucciones ? esc(item.instrucciones) : ""}</small></span><span class="item-price"><strong>${money(item.precio_unitario)} c/u<br><small>${money(Number(item.precio_unitario) * Number(item.cantidad))}</small></strong>${canAdd ? `<select data-admin-portion-item="${item.id}"><option value="">+ Porción</option>${options}</select><button class="secondary admin-portion-button" data-portion-order="${order.id}" data-portion-item="${item.id}">Agregar</button>` : ""}</span></div>`).join("")}</div><div class="order-foot"><strong>Total: ${money(order.total)}</strong><span>${new Date(order.creado_en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span></div><div class="actions">${button}${cancel}<button class="secondary" data-more="${order.id}">Agregar producto</button></div></article>`;
}
function renderPaymentQueue(orders) {
  const pending = orders.filter(
    (o) => o.estado === "finalizado" && !o.metodo_pago,
  );
  $("paymentQueue").innerHTML = pending.length
    ? pending
        .map(
          (o) =>
            `<div class="payment-row"><div><b>Pedido #${o.id}</b><small>${o.items.map((i) => `${i.cantidad} × ${esc(i.nombre_producto)}`).join(", ")} · ${money(o.total)}</small></div><div class="payment-actions"><button data-pay="${o.id}" data-method="efectivo">Efectivo</button><button data-pay="${o.id}" data-method="transferencia">Transferencia</button></div></div>`,
        )
        .join("")
    : '<p class="muted">No hay pedidos pendientes por cobrar.</p>';
}
async function loadOrders() {
  try {
    const result = await request(
      "pedidos&estado=recibido,preparando&orden=asc&limite=100",
    );
    if ($("orders"))
      $("orders").innerHTML = result.data.length
        ? result.data.map(orderCard).join("")
        : '<p class="muted">No hay pedidos activos.</p>';
    bindOrderActions();
  } catch (e) {
    toast(e.message, true);
  }
}
function recordCard(order) {
  const items = order.items
    .map(
      (item) =>
        `<li>${item.cantidad} × ${esc(item.nombre_producto)} — ${money(item.precio_unitario)} c/u${item.instrucciones ? `<br><small>Instrucciones: ${esc(item.instrucciones)}</small>` : ""}</li>`,
    )
    .join("");
  const events = order.eventos
    .map(
      (event) =>
        `<li>${new Date(event.creado_en).toLocaleString("es-CO")} · ${esc(event.evento)}${event.detalle ? ` · ${esc(event.detalle)}` : ""}</li>`,
    )
    .join("");
  const payment =
    !order.metodo_pago && order.estado === "finalizado"
      ? `<div class="payment-actions"><button data-pay="${order.id}" data-method="efectivo">Efectivo</button><button data-pay="${order.id}" data-method="transferencia">Transferencia</button></div>`
      : `<span>${order.metodo_pago ? `Pago: ${esc(order.metodo_pago)}` : "Pago pendiente"}</span>`;
  return `<article class="order-card"><div class="order-head"><b>Pedido #${order.id}</b><span class="service-badge">${order.tipo_servicio === "llevar" ? "Para llevar" : "Comer aquí"}</span><span class="status ${order.estado}">${order.estado}</span></div><p><b>Creado:</b> ${new Date(order.creado_en).toLocaleString("es-CO")} · <b>Finalizado:</b> ${order.finalizado_en ? new Date(order.finalizado_en).toLocaleString("es-CO") : "—"}</p><ul>${items}</ul><div class="order-foot"><strong>Total: ${money(order.total)}</strong>${payment}</div><details><summary>Ver historial completo</summary><ul>${events || "<li>Sin eventos registrados</li>"}</ul></details></article>`;
}
async function loadRecords() {
  try {
    const result = await request(
      "pedidos&estado=finalizado,cancelado&eventos=1&orden=desc&limite=100",
    );
    $("records").innerHTML = result.data.length
      ? result.data.map(recordCard).join("")
      : '<p class="muted">No hay registros.</p>';
    bindOrderActions();
  } catch (e) {
    toast(e.message, true);
  }
}
function bindOrderActions() {
  document.querySelectorAll("[data-state]").forEach(
    (button) =>
      (button.onclick = async () => {
        try {
          await request("estado", {
            id: button.dataset.state,
            method: "PATCH",
            body: JSON.stringify({ estado: button.dataset.next }),
          });
          loadOrders();
          toast("Estado actualizado");
        } catch (e) {
          toast(e.message, true);
        }
      }),
  );
  document.querySelectorAll("[data-pay]").forEach(
    (button) =>
      (button.onclick = async () => {
        try {
          await request("pago", {
            id: button.dataset.pay,
            method: "PATCH",
            body: JSON.stringify({ metodo_pago: button.dataset.method }),
          });
          loadOrders();
          loadRecords();
          toast("Pago registrado");
        } catch (e) {
          toast(e.message, true);
        }
      }),
  );
  document.querySelectorAll(".admin-portion-button").forEach(
    (button) =>
      (button.onclick = async () => {
        const select = document.querySelector(
          `select[data-admin-portion-item="${button.dataset.portionItem}"]`,
        );
        if (!select.value) return toast("Selecciona una porción", true);
        try {
          await request("agregar-porcion", {
            id: button.dataset.portionOrder,
            method: "POST",
            body: JSON.stringify({
              item_id: button.dataset.portionItem,
              porcion: select.value,
            }),
          });
          loadOrders();
          toast("Porción agregada al producto");
        } catch (e) {
          toast(e.message, true);
        }
      }),
  );
  document.querySelectorAll("[data-more]").forEach(
    (button) =>
      (button.onclick = () => {
        $("extraOrderId").value = button.dataset.more;
        document.querySelector('[data-view="caja"]').click();
        $("extraOrderId").focus();
      }),
  );
}
async function addExtra() {
  try {
    const extras = [
      ...document.querySelectorAll("[data-existing-extra]:checked"),
    ].map((input) => input.value);
    await request("agregar-item", {
      id: $("extraOrderId").value,
      method: "POST",
      body: JSON.stringify({
        producto_id: $("extraProduct").value,
        precio: $("extraPrice").value || undefined,
        cantidad: $("extraQuantity").value,
        extras,
        instrucciones: $("extraNote").value,
      }),
    });
    $("extraNote").value = "";
    $("extraPrice").value = "";
    document
      .querySelectorAll("[data-existing-extra]")
      .forEach((input) => (input.checked = false));
    toast("Producto y porciones agregados");
    loadOrders();
  } catch (e) {
    toast(e.message, true);
  }
}
async function loadReport() {
  try {
    const result = await request(
      `resumen&desde=${$("fromDate").value}&hasta=${$("toDate").value}`,
    );
    const d = result.data;
    $("report").innerHTML = [
      ["Pedidos", d.pedidos],
      ["Total vendido", money(d.total)],
      ["Efectivo", money(d.efectivo)],
      ["Transferencias", money(d.transferencia)],
      ["Cancelados", d.cancelados || 0],
    ]
      .map(
        ([label, value]) =>
          `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`,
      )
      .join("");
    if ($("reportUpdated"))
      $("reportUpdated").textContent =
        `Actualizado: ${new Date().toLocaleString("es-CO")}`;
  } catch (e) {
    if ($("reportUpdated"))
      $("reportUpdated").textContent = "No se pudo generar el reporte";
    toast(e.message, true);
  }
}
function closeMenu() {
  $("sideMenu").classList.remove("open");
  $("menuOverlay").classList.remove("open");
  $("menuToggle").setAttribute("aria-expanded", "false");
}
document.querySelectorAll(".menu-link").forEach(
  (tab) =>
    (tab.onclick = () => {
      document
        .querySelectorAll(".menu-link,.view")
        .forEach((el) => el.classList.remove("active"));
      tab.classList.add("active");
      $(tab.dataset.view).classList.add("active");
      closeMenu();
      if (tab.dataset.view === "registros") loadRecords();
      if (tab.dataset.view === "caja") loadOrders();
      if (tab.dataset.view === "reportes") loadReport();
    }),
);
if ($("menuToggle"))
  $("menuToggle").onclick = () => {
    const open = !$("sideMenu").classList.contains("open");
    $("sideMenu").classList.toggle("open", open);
    $("menuOverlay").classList.toggle("open", open);
    $("menuToggle").setAttribute("aria-expanded", String(open));
  };
if ($("menuOverlay")) $("menuOverlay").onclick = closeMenu;
if ($("refreshProducts")) $("refreshProducts").onclick = loadProducts;
if ($("createOrder")) $("createOrder").onclick = createOrder;
if ($("refreshOrders")) $("refreshOrders").onclick = loadOrders;
if ($("refreshRecords")) $("refreshRecords").onclick = loadRecords;
if ($("addExtra")) $("addExtra").onclick = addExtra;
if ($("loadReport")) $("loadReport").onclick = loadReport;
const today = new Date().toISOString().slice(0, 10);
$("fromDate").value = today;
$("toDate").value = today;
loadProducts();
loadOrders();
loadReport();
renderCart();
setInterval(loadReport, 60000);

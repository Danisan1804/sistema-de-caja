const API = "api.json";
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value || "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const money = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
function toast(message, error = false) {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast visible ${error ? "error" : ""}`;
  setTimeout(() => (el.className = "toast"), 2600);
}
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
        reject(new Error("Respuesta inválida"));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !data.ok) {
        reject(new Error(data.error || "Error del servidor"));
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
  return `<article class="order-card"><div class="order-head"><b>Pedido #${order.id}</b><span class="service-badge">${order.tipo_servicio === "llevar" ? "Para llevar" : "Comer aquí"}</span><span class="status ${order.estado}">${order.estado}</span></div><div class="order-items">${order.items
    .map((item) => {
      const quantity = Number(item.cantidad || 0);
      const unitPrice = Number(item.precio_unitario || 0);
      return `<div><span>${quantity} × ${esc(item.nombre_producto)}<small>${item.instrucciones ? esc(item.instrucciones) : ""}</small></span><span class="item-price"><strong>${money(unitPrice)} c/u<br><small>${money(unitPrice * quantity)}</small></strong>${canAdd ? `<select data-portion-item="${item.id}"><option value="">+ Porción</option>${options}</select><button class="secondary portion-button" data-portion-order="${order.id}" data-portion-item="${item.id}">Agregar</button>` : ""}</span></div>`;
    })
    .join(
      "",
    )}</div><div class="order-foot"><strong>Total: ${money(order.total)}</strong><span>${new Date(order.creado_en).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span></div><div class="actions">${button}${cancel}</div></article>`;
}
function bindActions() {
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
  document.querySelectorAll(".portion-button").forEach(
    (button) =>
      (button.onclick = async () => {
        const select = document.querySelector(
          `select[data-portion-item="${button.dataset.portionItem}"]`,
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
}
async function loadOrders() {
  try {
    const result = await request(
      "pedidos&estado=recibido,preparando&orden=asc&limite=100",
    );
    $("orders").innerHTML = result.data.length
      ? result.data.map(orderCard).join("")
      : '<p class="muted">No hay pedidos pendientes.</p>';
    $("connection").textContent = "Backend conectado";
    $("connection").className = "connection online";
    bindActions();
  } catch (e) {
    $("connection").textContent = "Backend sin conexión";
    $("connection").className = "connection offline";
    toast(e.message, true);
  }
}
$("refreshOrders").onclick = loadOrders;
loadOrders();
setInterval(loadOrders, 15000);

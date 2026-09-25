/* CYBERNETICS market — static storefront, no backend.
   Persistence is localStorage only (demo-grade, do not trust it):
   cyb_cart {id: qty}, cyb_users {name: b64pass}, cyb_session "name",
   cyb_orders [order]. */

"use strict";

const PRODUCTS = [
  // Arasaka — premium corp chrome
  { id: "ara-kiroshi", corp: "arasaka", name: "Kiroshi Optics Mk.3", price: 12000, blurb: "Low-light + threat highlight. See them first." },
  { id: "ara-reflex", corp: "arasaka", name: "Arasaka Reflex Booster", price: 25000, blurb: "Factory-tuned reflex co-processor." },
  { id: "ara-mantis", corp: "arasaka", name: "Licensed Mantis Blades", price: 18000, blurb: "Surgical forearm blades, corp warranty intact." },
  { id: "ara-weave", corp: "arasaka", name: "Subdermal Armor Weave", price: 9000, blurb: "Ballistic mesh under the skin. Itches less now." },
  // Militech — military hardware
  { id: "mil-crush", corp: "militech", name: "Militech Crusher Shotgun", price: 15000, blurb: "Room-clearer. Collateral not included." },
  { id: "mil-sande", corp: "militech", name: "Falcon Sandevistan", price: 32000, blurb: "Military time-dilation rig. Blink and win." },
  { id: "mil-vest", corp: "militech", name: "Ballistic Vest Mk.2", price: 4500, blurb: "Stops small arms. Mostly." },
  { id: "mil-bando", corp: "militech", name: "Grenade Bandolier", price: 2200, blurb: "Six slots of diplomacy." },
  // Zetatech — budget tech
  { id: "zet-deck", corp: "zetatech", name: "Zetatech Cyberdeck Mini", price: 6800, blurb: "Pocket deck for junior netrunners." },
  { id: "zet-suite", corp: "zetatech", name: "Netrunner Suite v9", price: 3900, blurb: "Daemons, outdated but eager." },
  { id: "zet-camo", corp: "zetatech", name: "Optic Camo (30s)", price: 11000, blurb: "Half a minute of somebody else's problem." },
  { id: "zet-knock", corp: "zetatech", name: "Kiroshi Knockoffs", price: 1500, blurb: "Fell off a truck. Still sees in the dark." },
];

const CORPS = {
  arasaka: { name: "Arasaka", tag: "Premium corp chrome. Pay once, bleed never." },
  militech: { name: "Militech", tag: "Military hardware for the discerning warlord." },
  zetatech: { name: "Zetatech", tag: "Budget tech. No refunds beyond the Blackwall." },
};

const LS = { cart: "cyb_cart", users: "cyb_users", session: "cyb_session", orders: "cyb_orders" };
const eddies = (n) => "€$" + n.toLocaleString("en-US");

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ---------- toast ---------- */
function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- cart ---------- */
function getCart() { return load(LS.cart, {}); }

function cartCount() {
  return Object.values(getCart()).reduce((a, q) => a + q, 0);
}

function cartTotal() {
  const cart = getCart();
  return PRODUCTS.filter((p) => cart[p.id]).reduce((a, p) => a + p.price * cart[p.id], 0);
}

function addToCart(id, qty = 1) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  save(LS.cart, cart);
  refreshBadge();
  const p = PRODUCTS.find((x) => x.id === id);
  toast(p ? `Added: ${p.name}` : "Added to cart");
}

function setQty(id, qty) {
  const cart = getCart();
  if (qty <= 0) delete cart[id];
  else cart[id] = qty;
  save(LS.cart, cart);
  refreshBadge();
  if (typeof renderCartPage === "function") renderCartPage();
}

function clearCart() { save(LS.cart, {}); refreshBadge(); }

function refreshBadge() {
  document.querySelectorAll("[data-cart-badge]").forEach((el) => {
    el.textContent = cartCount();
  });
  document.querySelectorAll("[data-cart-total]").forEach((el) => {
    el.textContent = eddies(cartTotal());
  });
}

/* ---------- catalog ---------- */
function productCard(p) {
  return `<div class="card">
    <div class="card-corp">${CORPS[p.corp].name}</div>
    <div class="card-name">${p.name}</div>
    <div class="card-blurb">${p.blurb}</div>
    <div class="card-row">
      <span class="card-price">${eddies(p.price)}</span>
      <button onclick="addToCart('${p.id}')">BUY</button>
    </div>
  </div>`;
}

function renderCatalog(corp) {
  const grid = document.getElementById("catalog");
  if (!grid) return;
  grid.innerHTML = PRODUCTS.filter((p) => p.corp === corp).map(productCard).join("");
}

function renderFeatured() {
  const grid = document.getElementById("featured");
  if (!grid) return;
  grid.innerHTML = [PRODUCTS[1], PRODUCTS[5], PRODUCTS[10]].map(productCard).join("");
}

/* ---------- auth (mock, local only) ---------- */
function currentUser() { return load(LS.session, null); }

function register(name, pass) {
  name = (name || "").trim();
  if (name.length < 3) return "Handle too short (min 3).";
  if ((pass || "").length < 8) return "Password too short (min 8).";
  const users = load(LS.users, {});
  if (users[name]) return "Handle taken. Pick another.";
  users[name] = btoa(pass); // demo obfuscation, NOT security
  save(LS.users, users);
  save(LS.session, name);
  refreshAuth();
  return null;
}

function login(name, pass) {
  const users = load(LS.users, {});
  if (!users[name] || users[name] !== btoa(pass)) return "Bad handle or password.";
  save(LS.session, name);
  refreshAuth();
  return null;
}

function logout() {
  localStorage.removeItem(LS.session);
  refreshAuth();
  toast("Logged out. Stay chrome.");
}

function refreshAuth() {
  const u = currentUser();
  document.querySelectorAll("[data-auth-link]").forEach((el) => {
    el.textContent = u ? `// ${u} (logout)` : "LOGIN";
    el.href = u ? "#" : "login.html";
    el.onclick = u ? (e) => { e.preventDefault(); logout(); } : null;
  });
  const who = document.getElementById("whoami");
  if (who) who.textContent = u ? `jacked in as ${u}` : "guest session — checkout works either way";
}

/* ---------- checkout (mock) ---------- */
function checkout(name, district, pay) {
  const cart = getCart();
  const ids = Object.keys(cart);
  if (!ids.length) return "Cart is empty, choom.";
  if (!name.trim()) return "Enter a drop name.";
  if (!district.trim()) return "Enter a district.";
  const order = {
    id: "ORD-" + Date.now().toString(36).toUpperCase(),
    items: ids.map((id) => ({ id, qty: cart[id] })),
    total: cartTotal(),
    name: name.trim(),
    district: district.trim(),
    pay,
    by: currentUser() || "guest",
    at: new Date().toISOString(),
  };
  const orders = load(LS.orders, []);
  orders.push(order);
  save(LS.orders, orders);
  clearCart();
  return order;
}

/* ---------- page boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  refreshBadge();
  refreshAuth();
  const grid = document.getElementById("catalog");
  if (grid && grid.dataset.corp) renderCatalog(grid.dataset.corp);
  renderFeatured();
});

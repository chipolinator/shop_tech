const API_BASE = `/api`;
const GUEST_CART_KEY = "shoptech_guest_cart";
const ENDPOINTS = {
  listCars: `${API_BASE}/cars/all`,
};

const refreshButton = document.getElementById("refresh-cart");
const goToCarsButton = document.getElementById("go-to-cars");
const buyAllButton = document.getElementById("buy-all");
const status = document.getElementById("cart-status");
const cartList = document.getElementById("cart-list");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");

let currentCartItems = [];

function setStatus(text, type = "") {
  status.textContent = text;
  status.className = type ? `status-line ${type}` : "status-line";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getGuestCartIds() {
  const raw = localStorage.getItem(GUEST_CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  } catch {
    return [];
  }
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

function buildImageUrl(imagePath) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorDetail(response, data) {
  if (data && typeof data === "object" && data.detail) {
    return `: ${data.detail}`;
  }
  if (typeof data === "string" && data.trim()) {
    const normalized = data.replace(/\s+/g, " ").trim();
    const isHtmlError = /<html[\s>]|<!doctype html>/i.test(normalized);
    if (isHtmlError) {
      return ` (HTTP ${response.status})`;
    }
    const shortText = normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
    return `: ${shortText}`;
  }
  return ` (HTTP ${response.status})`;
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function updateSummary(cars) {
  const total = cars.reduce((sum, car) => sum + Number(car.price || 0), 0);
  cartCount.textContent = String(cars.length);
  cartTotal.textContent = `${formatPrice(total)} ₽`;
}

function renderCart(cars) {
  currentCartItems = cars;
  updateSummary(cars);

  if (!cars.length) {
    cartList.innerHTML = '<li class="cart-empty">Корзина пуста.</li>';
    return;
  }

  cartList.innerHTML = cars
    .map((car) => {
      const title = `${escapeHtml(car.brand)} ${escapeHtml(car.model)}`;
      const imageUrl = buildImageUrl(car.image_path);
      const imageTag = imageUrl
        ? `<img class="cart-item-thumb" src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy">`
        : '<div class="cart-item-thumb placeholder">Нет фото</div>';

      return `
        <li class="cart-item-row">
          <div class="cart-item-main">
            ${imageTag}
            <div>
              <p class="cart-item-title">${title}</p>
              <p class="cart-item-meta">ID: ${escapeHtml(car.car_id ?? "n/a")}</p>
            </div>
          </div>
          <p class="cart-item-price">${formatPrice(car.price)} ₽</p>
        </li>
      `;
    })
    .join("");
}

async function loadCart() {
  const guestIds = getGuestCartIds();
  refreshButton.disabled = true;
  goToCarsButton.disabled = true;
  setStatus("Загрузка корзины...");

  try {
    if (!guestIds.length) {
      renderCart([]);
      setStatus("Корзина пуста.", "success");
      return;
    }

    const response = await fetch(ENDPOINTS.listCars);
    const data = await readResponseBody(response);

    if (!response.ok || !Array.isArray(data)) {
      setStatus(`Ошибка загрузки корзины${errorDetail(response, data)}`, "error");
      return;
    }

    const items = data
      .filter((car) => guestIds.includes(Number(car.id)))
      .map((car) => ({
        car_id: car.id,
        brand: car.brand,
        model: car.model,
        price: car.price,
        image_path: car.image_path,
      }));

    renderCart(items);
    setStatus(`В корзине товаров: ${items.length}.`, "success");
  } catch {
    setStatus("Нет соединения с backend.", "error");
  } finally {
    refreshButton.disabled = false;
    goToCarsButton.disabled = false;
  }
}

async function buyAllCart() {
  const hadItems = currentCartItems.length > 0 || getGuestCartIds().length > 0;
  clearGuestCart();
  renderCart([]);
  setStatus(hadItems ? "Корзина очищена." : "Корзина уже пуста.", "success");
}

refreshButton.addEventListener("click", loadCart);
goToCarsButton.addEventListener("click", () => {
  window.location.href = "/cars.html";
});
buyAllButton.addEventListener("click", async () => {
  buyAllButton.disabled = true;
  try {
    await buyAllCart();
  } finally {
    buyAllButton.disabled = false;
  }
});

loadCart();

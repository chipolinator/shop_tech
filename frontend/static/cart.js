const API_BASE = `/api`;
const USER_TOKEN_KEY = "shoptech_user_token";
const GUEST_CART_KEY = "shoptech_guest_cart";
const ENDPOINTS = {
  listCars: `${API_BASE}/cars/all`,
  cart: `${API_BASE}/cars/cart`,
  buyAll: `${API_BASE}/cars/buy_all`,
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

function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY) || "";
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

function isAuthError(response, data) {
  return (
    response.status === 401 ||
    (data && typeof data === "object" && data.detail === "Could not validate credentials")
  );
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function updateSummary(cars) {
  const total = cars.reduce((sum, car) => sum + Number(car.price || 0), 0);
  cartCount.textContent = String(cars.length);
  cartTotal.textContent = `${formatPrice(total)} ₽`;
  buyAllButton.disabled = cars.length === 0;
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

async function loadGuestCart() {
  const guestIds = getGuestCartIds();
  if (!guestIds.length) {
    renderCart([]);
    setStatus("Гостевая корзина пуста. Вход нужен только для покупки.", "success");
    return;
  }

  const response = await fetch(ENDPOINTS.listCars);
  const data = await readResponseBody(response);

  if (!response.ok || !Array.isArray(data)) {
    setStatus(`Ошибка загрузки корзины${errorDetail(response, data)}`, "error");
    return;
  }

  const guestItems = data
    .filter((car) => guestIds.includes(Number(car.id)))
    .map((car) => ({
      car_id: car.id,
      brand: car.brand,
      model: car.model,
      price: car.price,
      image_path: car.image_path,
      cart_item_id: `guest-${car.id}`,
    }));

  renderCart(guestItems);
  setStatus(`Гостевая корзина: ${guestItems.length} шт. Для покупки выполните вход.`, "success");
}

async function loadCart() {
  const token = getUserToken();
  refreshButton.disabled = true;
  goToCarsButton.disabled = true;
  setStatus("Загрузка корзины...");

  try {
    if (!token) {
      await loadGuestCart();
      return;
    }

    const response = await fetch(ENDPOINTS.cart, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readResponseBody(response);

    if (!response.ok) {
      if (isAuthError(response, data)) {
        localStorage.removeItem(USER_TOKEN_KEY);
        await loadGuestCart();
        return;
      }

      setStatus(`Ошибка загрузки корзины${errorDetail(response, data)}`, "error");
      return;
    }

    if (!Array.isArray(data)) {
      setStatus("Неверный формат данных корзины.", "error");
      return;
    }

    renderCart(data);
    setStatus(`В корзине машин: ${data.length}.`, "success");
  } catch {
    setStatus("Нет соединения с backend.", "error");
  } finally {
    refreshButton.disabled = false;
    goToCarsButton.disabled = false;
  }
}

async function buyAllCart() {
  if (!currentCartItems.length) {
    setStatus("Корзина пуста.", "error");
    return false;
  }

  const token = getUserToken();
  if (!token) {
    window.alert("Покупка доступна только зарегистрированным пользователям. Выполните вход.");
    setStatus("Для покупки требуется вход пользователя.", "error");
    return false;
  }

  try {
    const response = await fetch(ENDPOINTS.buyAll, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readResponseBody(response);

    if (!response.ok) {
      if (isAuthError(response, data)) {
        localStorage.removeItem(USER_TOKEN_KEY);
        window.alert("Сессия истекла. Для покупки выполните вход пользователя.");
        setStatus("Для покупки требуется вход пользователя.", "error");
        return false;
      }

      setStatus(`Ошибка покупки${errorDetail(response, data)}`, "error");
      return false;
    }

    const purchasedCount = Number(data?.items_count ?? currentCartItems.length);
    const totalPrice = Number(data?.total_price ?? 0);
    renderCart([]);
    setStatus(`Покупка оформлена: ${purchasedCount} шт. на сумму ${formatPrice(totalPrice)} ₽.`, "success");
    return true;
  } catch {
    setStatus("Нет соединения с backend.", "error");
    return false;
  }
}

refreshButton.addEventListener("click", loadCart);
goToCarsButton.addEventListener("click", () => {
  window.location.href = "/cars.html";
});
buyAllButton.addEventListener("click", async () => {
  buyAllButton.disabled = true;
  await buyAllCart();
  buyAllButton.disabled = currentCartItems.length === 0;
});

loadCart();

const API_BASE = `/api`;
const USER_TOKEN_KEY = "shoptech_user_token";
const ENDPOINTS = {
  cart: `${API_BASE}/cars/cart`,
  buy: `${API_BASE}/cars/buy`,
};

const refreshButton = document.getElementById("refresh-cart");
const goToCarsButton = document.getElementById("go-to-cars");
const status = document.getElementById("cart-status");
const cartList = document.getElementById("cart-list");

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
    return `: ${data}`;
  }
  return ` (HTTP ${response.status})`;
}

function isAuthError(response, data) {
  return (
    response.status === 401 ||
    (data && typeof data === "object" && data.detail === "Could not validate credentials")
  );
}

function renderCart(cars) {
  if (!cars.length) {
    cartList.innerHTML = '<article class="card empty-state">Корзина пуста.</article>';
    return;
  }

  cartList.innerHTML = cars
    .map((car) => {
      const title = `${escapeHtml(car.brand)} ${escapeHtml(car.model)}`;
      const imageUrl = buildImageUrl(car.image_path);
      const imageTag = imageUrl
        ? `<img class="car-image" src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy">`
        : '<div class="car-image placeholder">Без изображения</div>';
      const carId = Number(car.car_id);
      const hasValidCarId = Number.isInteger(carId) && carId > 0;
      const buyButton = hasValidCarId
        ? `
          <div class="controls">
            <button type="button" data-action="buy" data-car-id="${carId}">Купить</button>
          </div>
        `
        : "";

      return `
        <article class="card car-card">
          ${imageTag}
          <h2>${title}</h2>
          <p><strong>Цена:</strong> ${escapeHtml(car.price)}</p>
          <p class="muted"><strong>Car ID:</strong> ${escapeHtml(car.car_id ?? "n/a")}</p>
          <p class="muted"><strong>Cart Item ID:</strong> ${escapeHtml(car.cart_item_id ?? "n/a")}</p>
          ${buyButton}
        </article>
      `;
    })
    .join("");
}

async function loadCart() {
  const token = getUserToken();
  if (!token) {
    setStatus("Сначала войдите как пользователь на странице 'Вход'.", "error");
    return;
  }

  refreshButton.disabled = true;
  goToCarsButton.disabled = true;
  setStatus("Загрузка корзины...");

  try {
    const response = await fetch(ENDPOINTS.cart, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readResponseBody(response);

    if (!response.ok) {
      if (isAuthError(response, data)) {
        localStorage.removeItem(USER_TOKEN_KEY);
        window.alert("Чтобы открыть корзину, войдите как пользователь на странице \"Вход\".");
        setStatus("Требуется вход пользователя.", "error");
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

async function buyCar(carId) {
  const token = getUserToken();
  if (!token) {
    window.alert("Для покупки войдите как пользователь на странице \"Вход\".");
    setStatus("Требуется вход пользователя.", "error");
    return false;
  }

  try {
    const response = await fetch(`${ENDPOINTS.buy}?car_id=${encodeURIComponent(carId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readResponseBody(response);

    if (!response.ok) {
      if (isAuthError(response, data)) {
        localStorage.removeItem(USER_TOKEN_KEY);
        window.alert("Для покупки войдите как пользователь на странице \"Вход\".");
        setStatus("Требуется вход пользователя.", "error");
        return false;
      }

      setStatus(`Ошибка покупки${errorDetail(response, data)}`, "error");
      return false;
    }

    setStatus("Покупка выполнена.", "success");
    return true;
  } catch {
    setStatus("Нет соединения с backend.", "error");
    return false;
  }
}

cartList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='buy']");
  if (!button) return;

  const carId = Number(button.dataset.carId);
  if (!Number.isInteger(carId) || carId <= 0) return;

  button.disabled = true;
  const ok = await buyCar(carId);
  button.disabled = false;

  if (ok) {
    await loadCart();
  }
});

refreshButton.addEventListener("click", loadCart);
goToCarsButton.addEventListener("click", () => {
  window.location.href = "/cars.html";
});

loadCart();

const API_BASE = `/api`;
const USER_TOKEN_KEY = "shoptech_user_token";
const ENDPOINTS = {
  listCars: `${API_BASE}/cars/all`,
  addToCart: `${API_BASE}/cars/add_car`,
};

const refreshButton = document.getElementById("refresh-cars");
const goToCartButton = document.getElementById("go-to-cart");
const status = document.getElementById("cars-status");
const carsList = document.getElementById("cars-list");

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

function renderCars(cars, emptyText) {
  if (!cars.length) {
    carsList.innerHTML = `<article class="card empty-state">${escapeHtml(emptyText)}</article>`;
    return;
  }

  carsList.innerHTML = cars
    .map((car) => {
      const title = `${escapeHtml(car.brand)} ${escapeHtml(car.model)}`;
      const imageUrl = buildImageUrl(car.image_path);
      const imageTag = imageUrl
        ? `<img class="car-image" src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy">`
        : '<div class="car-image placeholder">Без изображения</div>';
      const id = Number(car.id);
      const hasValidId = Number.isInteger(id) && id > 0;
      const actionButtons = hasValidId
        ? `
          <div class="controls">
            <button type="button" data-action="add" data-car-id="${id}">В корзину</button>
          </div>
        `
        : "";

      return `
        <article class="card car-card">
          ${imageTag}
          <h2>${title}</h2>
          <p><strong>Мощность:</strong> ${escapeHtml(car.power)} л.с.</p>
          <p><strong>Объём:</strong> ${escapeHtml(car.displacement)} л</p>
          <p><strong>Привод:</strong> ${escapeHtml(car.drive)}</p>
          <p><strong>Цена:</strong> ${escapeHtml(car.price)}</p>
          <p class="muted"><strong>ID:</strong> ${escapeHtml(car.id ?? "n/a")}</p>
          ${actionButtons}
        </article>
      `;
    })
    .join("");
}

async function loadCars() {
  refreshButton.disabled = true;
  goToCartButton.disabled = true;
  setStatus("Загрузка списка машин...");

  try {
    const response = await fetch(ENDPOINTS.listCars);
    const data = await readResponseBody(response);

    if (!response.ok || !Array.isArray(data)) {
      setStatus(`Ошибка загрузки машин${errorDetail(response, data)}`, "error");
      carsList.innerHTML = "";
      return;
    }

    renderCars(data, "Пока нет ни одной машины.");
    setStatus(`Загружено машин: ${data.length}.`, "success");
  } catch {
    setStatus("Нет соединения с backend.", "error");
    carsList.innerHTML = "";
  } finally {
    refreshButton.disabled = false;
    goToCartButton.disabled = false;
  }
}

async function addCarToCart(carId) {
  const token = getUserToken();
  if (!token) {
    setStatus("Сначала войдите как пользователь на странице 'Вход'.", "error");
    return false;
  }

  const endpoint = ENDPOINTS.addToCart;
  const method = "POST";
  const successText = "Машина добавлена в корзину.";

  try {
    const response = await fetch(`${endpoint}?car_id=${encodeURIComponent(carId)}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readResponseBody(response);

    if (!response.ok) {
      const isAuthError =
        response.status === 401 ||
        (data && typeof data === "object" && data.detail === "Could not validate credentials");
      if (isAuthError) {
        localStorage.removeItem(USER_TOKEN_KEY);
        window.alert("Чтобы добавить машину в корзину, войдите как пользователь на странице \"Вход\".");
        setStatus("Требуется вход пользователя.", "error");
        return false;
      }

      setStatus(`Ошибка действия${errorDetail(response, data)}`, "error");
      return false;
    }

    setStatus(successText, "success");
    return true;
  } catch {
    setStatus("Нет соединения с backend.", "error");
    return false;
  }
}

carsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const carId = Number(button.dataset.carId);
  if (!Number.isInteger(carId) || action !== "add") {
    return;
  }

  button.disabled = true;
  const ok = await addCarToCart(carId);
  button.disabled = false;
  if (!ok) return;
});

refreshButton.addEventListener("click", loadCars);
goToCartButton.addEventListener("click", () => {
  window.location.href = "/cart.html";
});

loadCars();

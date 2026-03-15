const API_BASE = `/api`;
const GUEST_CART_KEY = "shoptech_guest_cart";
const ENDPOINTS = {
  listCars: `${API_BASE}/cars/all`,
};

const refreshButton = document.getElementById("refresh-cars");
const goToCartButton = document.getElementById("go-to-cart");
const status = document.getElementById("cars-status");
const brandFilters = document.getElementById("brand-filters");
const carsList = document.getElementById("cars-list");

let allCars = [];
let activeBrand = "";

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

function getCarBrand(car) {
  const brand = String(car?.brand ?? "").trim();
  return brand || "Без марки";
}

function getBrandGroups(cars) {
  const counts = new Map();

  for (const car of cars) {
    const brand = getCarBrand(car);
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((left, right) => left.brand.localeCompare(right.brand, "ru", { sensitivity: "base" }));
}

function getFilteredCars() {
  if (!activeBrand) {
    return allCars;
  }
  return allCars.filter((car) => getCarBrand(car) === activeBrand);
}

function createBrandFilterButton(label, brand) {
  const button = document.createElement("button");
  const isActive = brand === activeBrand;

  button.type = "button";
  button.className = isActive ? "filter-chip is-active" : "filter-chip";
  button.dataset.brandFilter = "true";
  button.dataset.brand = brand;
  button.textContent = label;
  button.setAttribute("aria-pressed", String(isActive));

  return button;
}

function renderBrandFilters(cars) {
  if (!brandFilters) return;

  brandFilters.innerHTML = "";
  if (!cars.length) {
    brandFilters.innerHTML = '<p class="muted brand-filter-empty">Марки появятся после загрузки каталога.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const brandGroups = getBrandGroups(cars);

  fragment.append(createBrandFilterButton(`Все марки (${cars.length})`, ""));
  for (const { brand, count } of brandGroups) {
    fragment.append(createBrandFilterButton(`${brand} (${count})`, brand));
  }

  brandFilters.append(fragment);
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

function saveGuestCartIds(ids) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(ids));
}

function addGuestCarId(carId) {
  const ids = getGuestCartIds();
  if (ids.includes(carId)) {
    return false;
  }
  ids.push(carId);
  saveGuestCartIds(ids);
  return true;
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
      const title = `${escapeHtml(getCarBrand(car))} ${escapeHtml(car.model)}`;
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

function renderCatalog() {
  const filteredCars = getFilteredCars();
  const emptyText = activeBrand
    ? `Машины марки "${activeBrand}" не найдены.`
    : "Пока нет ни одной машины.";

  renderBrandFilters(allCars);
  renderCars(filteredCars, emptyText);

  if (!allCars.length) {
    setStatus("Пока нет ни одной машины.");
    return;
  }

  if (!activeBrand) {
    setStatus(`Загружено машин: ${allCars.length}.`, "success");
    return;
  }

  setStatus(`Показаны машины марки "${activeBrand}": ${filteredCars.length} из ${allCars.length}.`, "success");
}

async function loadCars() {
  refreshButton.disabled = true;
  goToCartButton.disabled = true;
  setStatus("Загрузка списка машин...");

  try {
    const response = await fetch(ENDPOINTS.listCars);
    const data = await readResponseBody(response);

    if (!response.ok || !Array.isArray(data)) {
      allCars = [];
      activeBrand = "";
      renderBrandFilters([]);
      setStatus(`Ошибка загрузки машин${errorDetail(response, data)}`, "error");
      carsList.innerHTML = "";
      return;
    }

    allCars = data;
    if (activeBrand && !allCars.some((car) => getCarBrand(car) === activeBrand)) {
      activeBrand = "";
    }

    renderCatalog();
  } catch {
    allCars = [];
    activeBrand = "";
    renderBrandFilters([]);
    setStatus("Нет соединения с backend.", "error");
    carsList.innerHTML = "";
  } finally {
    refreshButton.disabled = false;
    goToCartButton.disabled = false;
  }
}

async function addCarToCart(carId) {
  const added = addGuestCarId(carId);
  if (added) {
    setStatus("Машина добавлена в корзину.", "success");
  } else {
    setStatus("Эта машина уже есть в корзине.");
  }
  return true;
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

if (brandFilters) {
  brandFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-brand-filter]");
    if (!button) return;

    activeBrand = button.dataset.brand ?? "";
    renderCatalog();
  });
}

refreshButton.addEventListener("click", loadCars);
goToCartButton.addEventListener("click", () => {
  window.location.href = "/cart.html";
});

loadCars();

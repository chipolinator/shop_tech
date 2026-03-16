const API_BASE = `/api`;
const authApi = window.ShopTechAuth;
const GUEST_CART_KEY = "shoptech_guest_cart";
const ENDPOINTS = {
  listCars: `${API_BASE}/cars/all`,
};
const DRIVE_LABELS = {
  front: "передний",
  rear: "задний",
  all: "полный",
};
const CARS_PER_PAGE = 12;
const MAX_VISIBLE_PAGE_BUTTONS = 5;
const priceFormatter = new Intl.NumberFormat("ru-RU");

const brandFilters = document.getElementById("brand-filters");
const carsList = document.getElementById("cars-list");
const pagination = document.getElementById("catalog-pagination");
const searchForm = document.querySelector("[data-catalog-search]");
const searchInput = document.getElementById("catalog-search");

let allCars = [];
let activeBrand = "";
let searchQuery = "";
let currentPage = 1;

function setStatus(text, type = "") {
  const status = document.getElementById("cars-status");
  if (!status) return;
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

function getDriveLabel(drive) {
  const normalizedDrive = String(drive ?? "").trim().toLowerCase();
  return DRIVE_LABELS[normalizedDrive] ?? String(drive ?? "");
}

function formatPrice(price) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return priceFormatter.format(price);
  }

  const normalizedPrice = String(price ?? "").trim();
  if (!normalizedPrice) {
    return "";
  }

  const numericPrice = Number(normalizedPrice.replace(/[^\d.-]/g, ""));
  if (Number.isFinite(numericPrice)) {
    return priceFormatter.format(numericPrice);
  }

  return normalizedPrice;
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

function normalizeSearchQuery(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru-RU");
}

function matchesSearchQuery(car, query) {
  if (!query) return true;

  const searchableText = [
    getCarBrand(car),
    car?.model ?? "",
    car?.drive ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("ru-RU");

  return searchableText.includes(query);
}

function getFilteredCars() {
  const searchedCars = allCars.filter((car) => matchesSearchQuery(car, searchQuery));

  if (!activeBrand) {
    return searchedCars;
  }

  return searchedCars.filter((car) => getCarBrand(car) === activeBrand);
}

function getTotalPages(totalItems) {
  return Math.max(1, Math.ceil(totalItems / CARS_PER_PAGE));
}

function getPaginatedCars(cars) {
  const totalPages = getTotalPages(cars.length);
  currentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (currentPage - 1) * CARS_PER_PAGE;
  return cars.slice(startIndex, startIndex + CARS_PER_PAGE);
}

function getVisiblePageItems(totalPages) {
  if (totalPages <= MAX_VISIBLE_PAGE_BUTTONS) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    startPage = 2;
    endPage = 4;
  } else if (currentPage >= totalPages - 2) {
    startPage = totalPages - 3;
    endPage = totalPages - 1;
  }

  if (startPage > 2) {
    items.push("ellipsis-start");
  }

  for (let page = startPage; page <= endPage; page += 1) {
    items.push(page);
  }

  if (endPage < totalPages - 1) {
    items.push("ellipsis-end");
  }

  items.push(totalPages);
  return items;
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

function removeGuestCarId(carId) {
  const ids = getGuestCartIds();
  const filtered = ids.filter((id) => id !== carId);
  if (filtered.length === ids.length) {
    return false;
  }

  saveGuestCartIds(filtered);
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

  const cartIds = getGuestCartIds();

  carsList.innerHTML = cars
    .map((car) => {
      const title = `${escapeHtml(getCarBrand(car))} ${escapeHtml(car.model)}`;
      const imageUrl = buildImageUrl(car.image_path);
      const imageTag = imageUrl
        ? `<img class="car-image" src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy">`
        : '<div class="car-image placeholder">Без изображения</div>';
      const id = Number(car.id);
      const hasValidId = Number.isInteger(id) && id > 0;
      const inCart = hasValidId && cartIds.includes(id);
      const action = inCart ? "remove" : "add";
      const actionText = inCart ? "Удалить из корзины" : "В корзину";
      const actionClass = inCart ? "in-cart" : "";
      const actionButtons = hasValidId
        ? `
          <div class="controls">
            <button type="button" data-action="${action}" data-car-id="${id}" class="${actionClass}">
              ${actionText}
            </button>
          </div>
        `
        : "";

      return `
        <article class="card car-card">
          ${imageTag}
          <h2>${title}</h2>
          <p><strong>Мощность:</strong> ${escapeHtml(car.power)} л.с.</p>
          <p><strong>Объём:</strong> ${escapeHtml(car.displacement)} л</p>
          <p><strong>Привод:</strong> ${escapeHtml(getDriveLabel(car.drive))}</p>
          <p><strong>Цена:</strong> ${escapeHtml(formatPrice(car.price))}</p>
          ${actionButtons}
        </article>
      `;
    })
    .join("");
}

function renderPagination(totalItems) {
  if (!pagination) return;

  if (totalItems <= CARS_PER_PAGE) {
    pagination.hidden = true;
    pagination.innerHTML = "";
    return;
  }

  const totalPages = getTotalPages(totalItems);
  const pageItems = getVisiblePageItems(totalPages);

  pagination.hidden = false;
  pagination.innerHTML = `
    <div class="catalog-pagination-controls">
      <button
        type="button"
        class="catalog-page-nav"
        data-page-action="prev"
        ${currentPage === 1 ? "disabled" : ""}
      >
        Назад
      </button>
      ${pageItems
        .map((item) => {
          if (typeof item !== "number") {
            return '<span class="catalog-pagination-ellipsis" aria-hidden="true">…</span>';
          }

          const activeClass = item === currentPage ? " is-active" : "";
          const currentAttribute = item === currentPage ? ' aria-current="page"' : "";

          return `
            <button
              type="button"
              class="catalog-page-button${activeClass}"
              data-page="${item}"${currentAttribute}
            >
              ${item}
            </button>
          `;
        })
        .join("")}
      <button
        type="button"
        class="catalog-page-nav"
        data-page-action="next"
        ${currentPage === totalPages ? "disabled" : ""}
      >
        Вперёд
      </button>
    </div>
  `;
}

function renderCatalog() {
  const filteredCars = getFilteredCars();
  const pageCars = getPaginatedCars(filteredCars);
  let emptyText = "Пока нет ни одной машины.";

  if (searchQuery && activeBrand) {
    emptyText = `По запросу "${searchInput?.value.trim() ?? searchQuery}" в марке "${activeBrand}" машины не найдены.`;
  } else if (searchQuery) {
    emptyText = `По запросу "${searchInput?.value.trim() ?? searchQuery}" машины не найдены.`;
  } else if (activeBrand) {
    emptyText = `Машины марки "${activeBrand}" не найдены.`;
  }

  renderBrandFilters(allCars);
  renderCars(pageCars, emptyText);
  renderPagination(filteredCars.length);
}

async function loadCars() {
  setStatus("Загрузка списка машин...");

  try {
    const response = await fetch(ENDPOINTS.listCars);
    const data = await readResponseBody(response);

    if (!response.ok || !Array.isArray(data)) {
      allCars = [];
      activeBrand = "";
      currentPage = 1;
      renderBrandFilters([]);
      renderCars([], `Ошибка загрузки машин${errorDetail(response, data)}`);
      renderPagination(0);
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
    currentPage = 1;
    renderBrandFilters([]);
    renderCars([], "Нет соединения с backend.");
    renderPagination(0);
  }
}

async function addCarToCart(carId) {
  try {
    const added = addGuestCarId(carId);
    if (added) {
      setStatus("Машина добавлена в корзину.", "success");
    } else {
      setStatus("Эта машина уже есть в корзине.");
    }
    return added;
  } catch (error) {
    console.error("Failed to add car to cart", error);
    setStatus("Не удалось добавить машину в корзину.", "error");
    return false;
  }
}

function setButtonInCartState(button, inCart) {
  button.disabled = inCart;
  button.dataset.action = inCart ? "remove" : "add";
  button.textContent = inCart ? "Удалить из корзины" : "В корзину";
  if (inCart) {
    button.classList.add("in-cart");
  } else {
    button.classList.remove("in-cart");
  }
}

carsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const carId = Number(button.dataset.carId);
  if (!Number.isInteger(carId) || (action !== "add" && action !== "remove")) {
    return;
  }

  button.disabled = true;
  let changed = false;

  if (action === "add") {
    changed = await addCarToCart(carId);
  } else {
    const removed = removeGuestCarId(carId);
    changed = removed;
    if (removed) {
      setStatus("Машина удалена из корзины.", "success");
    } else {
      setStatus("Машина не найдена в корзине.", "error");
    }
  }

  if (changed) {
    window.dispatchEvent(new Event("cart-updated"));
  }

  const inCart = getGuestCartIds().includes(carId);
  setButtonInCartState(button, inCart);
  button.disabled = false;
});

if (brandFilters) {
  brandFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-brand-filter]");
    if (!button) return;

    activeBrand = button.dataset.brand ?? "";
    currentPage = 1;
    renderCatalog();
  });
}

searchInput?.addEventListener("input", (event) => {
  searchQuery = normalizeSearchQuery(event.target.value);
  currentPage = 1;
  renderCatalog();
});

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
});

pagination?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page], button[data-page-action]");
  if (!button) return;

  const totalPages = getTotalPages(getFilteredCars().length);
  let nextPage = currentPage;

  if (button.dataset.pageAction === "prev") {
    nextPage -= 1;
  } else if (button.dataset.pageAction === "next") {
    nextPage += 1;
  } else {
    nextPage = Number(button.dataset.page);
  }

  nextPage = Math.min(Math.max(1, nextPage), totalPages);
  if (nextPage === currentPage) return;

  currentPage = nextPage;
  renderCatalog();
  carsList.scrollIntoView({ behavior: "smooth", block: "start" });
});

async function initCarsPage() {
  const allowed = await (authApi?.ensureUserSession?.() ?? Promise.resolve(true));
  if (!allowed) return;
  loadCars();
}

initCarsPage();

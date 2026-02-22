const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;
const BACKEND_BASE = `${window.location.protocol}//${window.location.hostname}:8000`;

const refreshButton = document.getElementById("refresh-cars");
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

function buildImageUrl(imagePath) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  const normalized = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${BACKEND_BASE}${normalized}`;
}

function renderCars(cars) {
  if (!cars.length) {
    carsList.innerHTML = '<article class="card empty-state">Пока нет ни одной машины.</article>';
    return;
  }

  carsList.innerHTML = cars
    .map((car) => {
      const title = `${escapeHtml(car.brand)} ${escapeHtml(car.model)}`;
      const imageUrl = buildImageUrl(car.image_path);
      const imageTag = imageUrl
        ? `<img class="car-image" src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy">`
        : '<div class="car-image placeholder">Без изображения</div>';

      return `
        <article class="card car-card">
          ${imageTag}
          <h2>${title}</h2>
          <p><strong>Мощность:</strong> ${escapeHtml(car.power)} л.с.</p>
          <p><strong>Объём:</strong> ${escapeHtml(car.displacement)} л</p>
          <p><strong>Привод:</strong> ${escapeHtml(car.drive)}</p>
          <p><strong>Цена:</strong> ${escapeHtml(car.price)}</p>
          <p class="muted"><strong>ID:</strong> ${escapeHtml(car.id ?? "n/a")}</p>
        </article>
      `;
    })
    .join("");
}

async function loadCars() {
  refreshButton.disabled = true;
  setStatus("Загрузка списка машин...");

  try {
    const response = await fetch(`${API_BASE}/cars/all`);
    const data = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(data)) {
      const detail = data?.detail ? `: ${data.detail}` : ` (HTTP ${response.status})`;
      setStatus(`Ошибка загрузки машин${detail}`, "error");
      carsList.innerHTML = "";
      return;
    }

    renderCars(data);
    setStatus(`Загружено машин: ${data.length}.`, "success");
  } catch {
    setStatus("Нет соединения с backend.", "error");
    carsList.innerHTML = "";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadCars);
loadCars();

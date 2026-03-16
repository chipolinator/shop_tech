const API_BASE = `/api`;
const authApi = window.ShopTechAuth;
const ENDPOINTS = {
  createCar: `${API_BASE}/admin/create_car`,
  listCars: `${API_BASE}/cars/all`,
  deleteCar: `${API_BASE}/admin/delete_car`,
  updateCar: `${API_BASE}/admin/update_car`,
};

const sessionStatus = document.getElementById("admin-session-status");
const logoutButton = document.getElementById("admin-logout");

const createCarForm = document.getElementById("create-car-form");
const createCarStatus = document.getElementById("create-car-status");
const carPriceInput = document.getElementById("car-price");

const adminActions = document.createElement("div");
adminActions.className = "stack-form";
adminActions.innerHTML = `
  <div class="controls">
    <button type="button" id="admin-edit-car">Редактировать машину</button>
    <button type="button" id="admin-delete-car">Удалить машину</button>
  </div>
  <p id="admin-actions-status" class="status-line" role="status" aria-live="polite"></p>
`;
createCarForm.insertAdjacentElement("afterend", adminActions);

const editCarButton = document.getElementById("admin-edit-car");
const deleteCarButton = document.getElementById("admin-delete-car");
const actionsStatus = document.getElementById("admin-actions-status");

function setStatus(node, text, type = "") {
  node.textContent = text;
  node.className = type ? `status-line ${type}` : "status-line";
}

function getAdminToken() {
  return authApi?.getAdminToken?.() || "";
}

function getAuthHeaders() {
  const token = getAdminToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
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

function handleAuthError(statusNode) {
  authApi?.clearAdminToken?.();
  setStatus(statusNode, "Сессия администратора истекла. Войдите снова.", "error");
  setStatus(sessionStatus, "Сессия истекла. Возвращаю на страницу входа.", "error");
  window.setTimeout(() => {
    authApi?.redirectToLogin?.("admin");
  }, 250);
}

function askPositiveId(title) {
  const value = window.prompt(title, "");
  if (value === null) return null;
  const id = Number(value.trim());

  if (!Number.isInteger(id) || id <= 0) {
    setStatus(actionsStatus, "Нужен целочисленный ID больше 0.", "error");
    return null;
  }
  return id;
}

function askCarField(title, currentValue) {
  const nextValue = window.prompt(title, String(currentValue ?? ""));
  if (nextValue === null) return null;
  return nextValue.trim();
}

function normalizeDriveValue(rawValue) {
  return String(rawValue ?? "").trim().toLowerCase();
}

function buildCarUpdatePayload(car) {
  const brand = askCarField("Марка:", car.brand);
  if (brand === null) {
    setStatus(actionsStatus, "Редактирование отменено.");
    return null;
  }

  const model = askCarField("Модель:", car.model);
  if (model === null) {
    setStatus(actionsStatus, "Редактирование отменено.");
    return null;
  }

  const powerRaw = askCarField("Мощность (л.с.):", car.power);
  if (powerRaw === null) {
    setStatus(actionsStatus, "Редактирование отменено.");
    return null;
  }

  const displacementRaw = askCarField("Объём двигателя (л):", car.displacement);
  if (displacementRaw === null) {
    setStatus(actionsStatus, "Редактирование отменено.");
    return null;
  }

  const driveRaw = askCarField("Привод (front, rear, all):", car.drive);
  if (driveRaw === null) {
    setStatus(actionsStatus, "Редактирование отменено.");
    return null;
  }

  const priceRaw = askCarField("Цена:", car.price);
  if (priceRaw === null) {
    setStatus(actionsStatus, "Редактирование отменено.");
    return null;
  }

  const power = Number(powerRaw);
  const displacement = Number(displacementRaw.replace(",", "."));
  const drive = normalizeDriveValue(driveRaw);
  const price = Number(String(priceRaw).replace(/\D/g, ""));

  if (!brand || !model) {
    setStatus(actionsStatus, "Марка и модель не должны быть пустыми.", "error");
    return null;
  }

  if (!Number.isInteger(power) || power <= 0) {
    setStatus(actionsStatus, "Мощность должна быть целым числом больше 0.", "error");
    return null;
  }

  if (!Number.isFinite(displacement) || displacement <= 0) {
    setStatus(actionsStatus, "Объём двигателя должен быть числом больше 0.", "error");
    return null;
  }

  if (!["front", "rear", "all"].includes(drive)) {
    setStatus(actionsStatus, "Привод должен быть одним из: front, rear, all.", "error");
    return null;
  }

  if (!Number.isInteger(price) || price <= 0) {
    setStatus(actionsStatus, "Цена должна быть целым числом больше 0.", "error");
    return null;
  }

  return {
    brand,
    model,
    power,
    displacement,
    drive,
    price,
  };
}

function formatNumberWithSpaces(rawValue) {
  const digitsOnly = String(rawValue).replace(/\D/g, "");
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

carPriceInput.addEventListener("input", () => {
  carPriceInput.value = formatNumberWithSpaces(carPriceInput.value);
});

async function runAdminRequest(url, options = {}, statusNode = actionsStatus) {
  const headers = getAuthHeaders();
  if (!headers) {
    setStatus(statusNode, "Сначала выполните вход как админ.", "error");
    return { ok: false, data: null };
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers ?? {}),
      },
    });
    const data = await readResponseBody(response);

    if (!response.ok) {
      if (isAuthError(response, data)) {
        handleAuthError(statusNode);
        return { ok: false, data };
      }
      setStatus(statusNode, `Ошибка запроса${errorDetail(response, data)}`, "error");
      return { ok: false, data };
    }

    return { ok: true, data };
  } catch {
    setStatus(statusNode, "Нет соединения с backend.", "error");
    return { ok: false, data: null };
  }
}

createCarForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = createCarForm.querySelector("button[type='submit']");
  const headers = getAuthHeaders();
  if (!headers) {
    setStatus(createCarStatus, "Сначала выполните вход как админ.", "error");
    return;
  }

  const formData = new FormData(createCarForm);
  const normalizedPrice = String(formData.get("price") ?? "").replace(/\D/g, "");
  if (!normalizedPrice || Number(normalizedPrice) <= 0) {
    setStatus(createCarStatus, "Введите корректную цену (например: 20 000).", "error");
    return;
  }
  formData.set("price", normalizedPrice);

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    setStatus(createCarStatus, "Выберите изображение PNG/JPEG.", "error");
    return;
  }

  button.disabled = true;
  setStatus(createCarStatus, "Создаю машину...");

  try {
    const response = await fetch(ENDPOINTS.createCar, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await readResponseBody(response);

    if (!response.ok) {
      if (isAuthError(response, data)) {
        handleAuthError(createCarStatus);
        return;
      }
      setStatus(createCarStatus, `Ошибка создания машины${errorDetail(response, data)}`, "error");
      return;
    }

    setStatus(createCarStatus, "Машина успешно добавлена.", "success");
    createCarForm.reset();
  } catch {
    setStatus(createCarStatus, "Нет соединения с backend.", "error");
  } finally {
    button.disabled = false;
  }
});

editCarButton.addEventListener("click", async () => {
  const id = askPositiveId("Введите ID машины для редактирования:");
  if (id === null) return;

  editCarButton.disabled = true;
  setStatus(actionsStatus, "Загружаю данные машины...");

  const carsResult = await runAdminRequest(ENDPOINTS.listCars);
  if (!carsResult.ok) {
    editCarButton.disabled = false;
    return;
  }

  const car = Array.isArray(carsResult.data)
    ? carsResult.data.find((item) => Number(item.id) === id)
    : null;

  if (!car) {
    setStatus(actionsStatus, `Машина ${id} не найдена.`, "error");
    editCarButton.disabled = false;
    return;
  }

  const payload = buildCarUpdatePayload(car);
  if (!payload) {
    editCarButton.disabled = false;
    return;
  }

  setStatus(actionsStatus, "Сохраняю изменения...");

  const result = await runAdminRequest(`${ENDPOINTS.updateCar}?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (result.ok) {
    setStatus(actionsStatus, `Машина ${id} обновлена.`, "success");
  }

  editCarButton.disabled = false;
});

deleteCarButton.addEventListener("click", async () => {
  const id = askPositiveId("Введите ID машины для удаления:");
  if (id === null) return;

  deleteCarButton.disabled = true;
  setStatus(actionsStatus, "Удаляю машину...");

  const result = await runAdminRequest(`${ENDPOINTS.deleteCar}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (result.ok) {
    setStatus(actionsStatus, `Машина ${id} удалена.`, "success");
  }

  deleteCarButton.disabled = false;
});

logoutButton.addEventListener("click", () => {
  authApi?.logoutAdmin?.();
});

async function initAdminPage() {
  const allowed = await (authApi?.ensureAdminSession?.() ?? Promise.resolve(true));
  if (!allowed) return;

  setStatus(sessionStatus, "Сессия администратора активна.", "success");
  setStatus(actionsStatus, "Можно использовать админ-действия.", "success");
}

initAdminPage();

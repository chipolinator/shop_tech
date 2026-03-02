const API_BASE = `/api`;
const ADMIN_TOKEN_KEY = "shoptech_admin_token";
const ENDPOINTS = {
  token: `${API_BASE}/admin/token`,
  createCar: `${API_BASE}/admin/create_car`,
  allUsers: `${API_BASE}/admin/all_users`,
  deleteUser: `${API_BASE}/admin/delete_user`,
  deleteCar: `${API_BASE}/admin/delete_car`,
};

const tokenForm = document.getElementById("admin-token-form");
const tokenStatus = document.getElementById("admin-token-status");

const createCarForm = document.getElementById("create-car-form");
const createCarStatus = document.getElementById("create-car-status");

const adminActions = document.createElement("div");
adminActions.className = "stack-form";
adminActions.innerHTML = `
  <div class="controls">
    <button type="button" id="admin-load-users">Список пользователей</button>
    <button type="button" id="admin-delete-user">Удалить пользователя</button>
    <button type="button" id="admin-delete-car">Удалить машину</button>
  </div>
  <p id="admin-actions-status" class="status-line" role="status" aria-live="polite"></p>
`;
createCarForm.insertAdjacentElement("afterend", adminActions);

const loadUsersButton = document.getElementById("admin-load-users");
const deleteUserButton = document.getElementById("admin-delete-user");
const deleteCarButton = document.getElementById("admin-delete-car");
const actionsStatus = document.getElementById("admin-actions-status");

function setStatus(node, text, type = "") {
  node.textContent = text;
  node.className = type ? `status-line ${type}` : "status-line";
}

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
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
      setStatus(statusNode, `Ошибка запроса${errorDetail(response, data)}`, "error");
      return { ok: false, data };
    }

    return { ok: true, data };
  } catch {
    setStatus(statusNode, "Нет соединения с backend.", "error");
    return { ok: false, data: null };
  }
}

tokenForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = tokenForm.querySelector("button[type='submit']");
  const username = tokenForm.username.value.trim();
  const password = tokenForm.password.value;

  if (!username || !password) {
    setStatus(tokenStatus, "Введите admin username и пароль.", "error");
    return;
  }

  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  button.disabled = true;
  setStatus(tokenStatus, "Выполняю вход...");

  try {
    const response = await fetch(ENDPOINTS.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await readResponseBody(response);

    if (!response.ok || !data?.access_token) {
      setStatus(tokenStatus, `Ошибка входа${errorDetail(response, data)}`, "error");
      return;
    }

    localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
    setStatus(tokenStatus, "Вход администратора выполнен.", "success");
    setStatus(actionsStatus, "Можно использовать админ-действия.", "success");
  } catch {
    setStatus(tokenStatus, "Нет соединения с backend.", "error");
  } finally {
    button.disabled = false;
  }
});

createCarForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = createCarForm.querySelector("button[type='submit']");
  const headers = getAuthHeaders();
  if (!headers) {
    setStatus(createCarStatus, "Сначала выполните вход как админ.", "error");
    return;
  }

  const formData = new FormData(createCarForm);
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

loadUsersButton.addEventListener("click", async () => {
  loadUsersButton.disabled = true;
  setStatus(actionsStatus, "Загружаю пользователей...");

  const result = await runAdminRequest(ENDPOINTS.allUsers);
  if (result.ok) {
    const count = Array.isArray(result.data) ? result.data.length : 0;
    setStatus(actionsStatus, `Пользователей получено: ${count}.`, "success");
  }

  loadUsersButton.disabled = false;
});

deleteUserButton.addEventListener("click", async () => {
  const id = askPositiveId("Введите ID пользователя для удаления:");
  if (id === null) return;

  deleteUserButton.disabled = true;
  setStatus(actionsStatus, "Удаляю пользователя...");

  const result = await runAdminRequest(`${ENDPOINTS.deleteUser}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (result.ok) {
    setStatus(actionsStatus, `Пользователь ${id} удалён.`, "success");
  }

  deleteUserButton.disabled = false;
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

const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;
const ADMIN_TOKEN_KEY = "shoptech_admin_token";

const tokenForm = document.getElementById("admin-token-form");
const tokenStatus = document.getElementById("admin-token-status");

const createCarForm = document.getElementById("create-car-form");
const createCarStatus = document.getElementById("create-car-status");
const createCarOutput = document.getElementById("create-car-output");

function setStatus(node, text, type = "") {
  node.textContent = text;
  node.className = type ? `status-line ${type}` : "status-line";
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
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
    const response = await fetch(`${API_BASE}/admin/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.access_token) {
      const detail = data?.detail ? `: ${data.detail}` : ` (HTTP ${response.status})`;
      setStatus(tokenStatus, `Ошибка входа${detail}`, "error");
      return;
    }

    localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
    createCarOutput.textContent = formatJson(data);
    setStatus(tokenStatus, "Вход администратора выполнен.", "success");
  } catch {
    setStatus(tokenStatus, "Нет соединения с backend.", "error");
  } finally {
    button.disabled = false;
  }
});

createCarForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = createCarForm.querySelector("button[type='submit']");
  const token = getAdminToken();
  if (!token) {
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
    const response = await fetch(`${API_BASE}/admin/create_car`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = data?.detail ? `: ${data.detail}` : ` (HTTP ${response.status})`;
      setStatus(createCarStatus, `Ошибка создания машины${detail}`, "error");
      createCarOutput.textContent = formatJson(data ?? {});
      return;
    }

    createCarOutput.textContent = formatJson(data);
    setStatus(createCarStatus, "Машина успешно добавлена.", "success");
    createCarForm.reset();
  } catch {
    setStatus(createCarStatus, "Нет соединения с backend.", "error");
  } finally {
    button.disabled = false;
  }
});

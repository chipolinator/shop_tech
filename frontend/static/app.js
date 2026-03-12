const API_BASE = `/api`;
const authApi = window.ShopTechAuth;

const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const adminLoginForm = document.getElementById("admin-login-form");
const adminLoginStatus = document.getElementById("admin-login-status");
const authSlider = document.getElementById("auth-slider");
const authModeButtons = document.querySelectorAll("[data-auth-mode]");
const authPanels = document.querySelectorAll("[data-auth-panel]");

function setStatus(node, text, type = "") {
  node.textContent = text;
  node.className = type ? `status-line ${type}` : "status-line";
}

function readResponseError(response, data, prefix) {
  const detail = data?.detail ? `: ${data.detail}` : ` (HTTP ${response.status})`;
  return `${prefix}${detail}`;
}

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, "");
}

function validateRegistration(name, gender, phone, password) {
  if (!name) return "Введите имя.";
  if (!gender) return "Выберите пол.";
  if (!phone) return "Введите номер телефона.";
  if (!password) return "Введите пароль.";
  if (name.length < 2) return "Имя должно быть минимум 2 символа.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return "Введите корректный номер телефона.";
  }
  if (password.length < 6) return "Пароль должен быть минимум 6 символов.";
  return "";
}

async function registerUser(name, gender, phone, password) {
  const response = await fetch(`${API_BASE}/reg/reg_user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, gender, phone, password }),
  });
  if (response.ok) return { ok: true };

  const data = await response.json().catch(() => null);
  return { ok: false, message: readResponseError(response, data, "Ошибка регистрации") };
}

async function loginUser(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const response = await fetch(`${API_BASE}/reg/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    return { ok: false, message: readResponseError(response, data, "Ошибка входа") };
  }

  return { ok: true, token: data.access_token };
}

async function loginAdmin(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const response = await fetch(`${API_BASE}/admin/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    return { ok: false, message: readResponseError(response, data, "Ошибка входа администратора") };
  }

  return { ok: true, token: data.access_token };
}

function setAuthMode(mode, options = {}) {
  const normalizedMode = ["login", "admin"].includes(mode) ? mode : "register";
  const shouldFocus = Boolean(options.focus);

  authSlider?.classList.toggle("is-login", normalizedMode === "login");
  authSlider?.classList.toggle("is-admin", normalizedMode === "admin");

  authModeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === normalizedMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  authPanels.forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== normalizedMode;
  });

  if (!shouldFocus) return;
  if (normalizedMode === "login") {
    document.getElementById("login-name")?.focus();
    return;
  }
  if (normalizedMode === "admin") {
    document.getElementById("admin-login-name")?.focus();
    return;
  }
  document.getElementById("register-name")?.focus();
}

authModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode(button.dataset.authMode, { focus: true });
  });
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = registerForm.querySelector("button[type='submit']");
  const name = registerForm.name.value.trim();
  const gender = registerForm.gender.value;
  const phoneRaw = registerForm.phone.value.trim();
  const phone = normalizePhone(phoneRaw);
  const password = registerForm.password.value;

  const validationError = validateRegistration(name, gender, phone, password);
  if (validationError) {
    setStatus(registerStatus, validationError, "error");
    return;
  }

  button.disabled = true;
  setStatus(registerStatus, "Создаю аккаунт...");

  try {
    const result = await registerUser(name, gender, phone, password);
    if (!result.ok) {
      setStatus(registerStatus, result.message, "error");
      return;
    }

    registerForm.reset();
    setStatus(registerStatus, "Аккаунт успешно создан.", "success");
  } catch {
    setStatus(registerStatus, "Нет подключения к серверу. Проверьте, что backend запущен.", "error");
  } finally {
    button.disabled = false;
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type='submit']");
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value;

  if (!username || !password) {
    setStatus(loginStatus, "Введите имя и пароль.", "error");
    return;
  }

  button.disabled = true;
  setStatus(loginStatus, "Выполняю вход...");

  try {
    const result = await loginUser(username, password);
    if (!result.ok) {
      setStatus(loginStatus, result.message, "error");
      return;
    }

    authApi?.storeUserToken(result.token);
    loginForm.reset();
    setStatus(loginStatus, "Вход выполнен. Открываю каталог.", "success");
    window.setTimeout(() => {
      window.location.assign("/cars.html");
    }, 150);
  } catch {
    setStatus(loginStatus, "Нет подключения к серверу. Проверьте, что backend запущен.", "error");
  } finally {
    button.disabled = false;
  }
});

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = adminLoginForm.querySelector("button[type='submit']");
  const username = adminLoginForm.username.value.trim();
  const password = adminLoginForm.password.value;

  if (!username || !password) {
    setStatus(adminLoginStatus, "Введите логин и пароль администратора.", "error");
    return;
  }

  button.disabled = true;
  setStatus(adminLoginStatus, "Выполняю вход администратора...");

  try {
    const result = await loginAdmin(username, password);
    if (!result.ok) {
      setStatus(adminLoginStatus, result.message, "error");
      return;
    }

    authApi?.storeAdminToken(result.token);
    adminLoginForm.reset();
    setStatus(adminLoginStatus, "Вход администратора выполнен. Открываю панель.", "success");
    window.setTimeout(() => {
      window.location.assign("/admin.html");
    }, 150);
  } catch {
    setStatus(adminLoginStatus, "Нет подключения к серверу. Проверьте, что backend запущен.", "error");
  } finally {
    button.disabled = false;
  }
});

const requestedMode = new URLSearchParams(window.location.search).get("mode");
setAuthMode(requestedMode, { focus: ["login", "admin"].includes(requestedMode) });

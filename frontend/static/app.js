const API_BASE = `/api`;
const USER_TOKEN_KEY = "shoptech_user_token";

const form = document.getElementById("auth-form");
const actionInput = document.getElementById("auth-action");
const actionSlider = document.getElementById("auth-action-slider");
const actionOptions = Array.from(document.querySelectorAll(".auth-slider-option"));
const nameInput = document.getElementById("name");
const passwordInput = document.getElementById("password");
const status = document.getElementById("form-status");
const button = document.getElementById("auth-submit");
const cardTitle = document.getElementById("auth-card-title");
const helpText = document.getElementById("auth-help");

function setStatus(text, type = "") {
  status.textContent = text;
  status.className = type ? `status-line ${type}` : "status-line";
}

function readResponseError(response, data, prefix) {
  const detail = data?.detail ? `: ${data.detail}` : ` (HTTP ${response.status})`;
  return `${prefix}${detail}`;
}

function applyActionUi(action) {
  if (action === "login") {
    cardTitle.textContent = "Вход";
    helpText.textContent = "Уже зарегистрированы: войдите в аккаунт.";
    button.textContent = "Войти";
    passwordInput.placeholder = "Введите пароль";
    passwordInput.minLength = 1;
    return;
  }

  cardTitle.textContent = "Создать аккаунт";
  helpText.textContent = "Новый пользователь: создайте аккаунт.";
  button.textContent = "Зарегистрироваться";
  passwordInput.placeholder = "Минимум 6 символов";
  passwordInput.minLength = 6;
}

function validate(action, name, password) {
  if (!name) return "Введите имя.";
  if (!password) return "Введите пароль.";

  if (action === "register") {
    if (name.length < 2) return "Имя должно быть минимум 2 символа.";
    if (password.length < 6) return "Пароль должен быть минимум 6 символов.";
  }
  return "";
}

async function registerUser(name, password) {
  const response = await fetch(`${API_BASE}/reg/reg_user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password }),
  });
  if (response.ok) return { ok: true };

  const data = await response.json().catch(() => null);
  return { ok: false, message: readResponseError(response, data, "Ошибка регистрации") };
}

async function loginUser(name, password) {
  const body = new URLSearchParams();
  body.set("username", name);
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

  localStorage.setItem(USER_TOKEN_KEY, data.access_token);
  return { ok: true };
}

function setAction(action) {
  const nextAction = action === "login" ? "login" : "register";
  actionInput.value = nextAction;
  actionSlider.classList.toggle("is-login", nextAction === "login");
  actionOptions.forEach((option) => {
    const isActive = option.dataset.action === nextAction;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });
  applyActionUi(nextAction);
  setStatus("");
}

actionOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setAction(option.dataset.action);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const action = actionInput.value;
  const name = nameInput.value.trim();
  const password = passwordInput.value;
  const validationError = validate(action, name, password);
  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  button.disabled = true;
  setStatus(action === "login" ? "Выполняю вход..." : "Создаю аккаунт...");

  try {
    const result = action === "login"
      ? await loginUser(name, password)
      : await registerUser(name, password);

    if (!result.ok) {
      setStatus(result.message, "error");
      return;
    }

    form.reset();
    setAction(action);
    setStatus(action === "login" ? "Вход выполнен." : "Аккаунт успешно создан.", "success");
  } catch {
    setStatus("Нет подключения к серверу. Проверьте, что backend запущен.", "error");
  } finally {
    button.disabled = false;
  }
});

const requestedMode = new URLSearchParams(window.location.search).get("mode");
if (requestedMode === "login" || requestedMode === "register") {
  setAction(requestedMode);
} else {
  setAction(actionInput.value);
}

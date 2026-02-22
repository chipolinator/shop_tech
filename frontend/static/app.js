const form = document.getElementById("register-form");
const status = document.getElementById("form-status");
const button = form.querySelector("button[type='submit']");
const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;

function setStatus(text, type = "") {
  status.textContent = text;
  status.className = type ? `status-line ${type}` : "status-line";
}

function validate(name, password) {
  if (name.length < 2) return "Имя должно быть минимум 2 символа.";
  if (password.length < 6) return "Пароль должен быть минимум 6 символов.";
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
  const detail = data?.detail ? `: ${data.detail}` : ` (HTTP ${response.status})`;
  return { ok: false, message: `Ошибка регистрации${detail}` };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = form.name.value.trim();
  const password = form.password.value;
  const validationError = validate(name, password);

  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  button.disabled = true;
  setStatus("Отправка...");

  try {
    const result = await registerUser(name, password);
    if (!result.ok) {
      setStatus(result.message, "error");
      return;
    }

    form.reset();
    setStatus("Аккаунт успешно создан.", "success");
  } catch {
    setStatus("Нет подключения к серверу. Проверьте, что backend запущен.", "error");
  } finally {
    button.disabled = false;
  }
});

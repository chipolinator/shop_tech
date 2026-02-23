const API_BASE = `/api`;
const USER_TOKEN_KEY = "shoptech_user_token";

const tokenForm = document.getElementById("user-token-form");
const tokenStatus = document.getElementById("user-token-status");

function setStatus(node, text, type = "") {
  node.textContent = text;
  node.className = type ? `status-line ${type}` : "status-line";
}

tokenForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = tokenForm.querySelector("button[type='submit']");
  const username = tokenForm.username.value.trim();
  const password = tokenForm.password.value;

  if (!username || !password) {
    setStatus(tokenStatus, "Введите имя и пароль.", "error");
    return;
  }

  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  button.disabled = true;
  setStatus(tokenStatus, "Выполняю вход...");

  try {
    const response = await fetch(`${API_BASE}/reg/token`, {
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

    localStorage.setItem(USER_TOKEN_KEY, data.access_token);
    setStatus(tokenStatus, "Вход выполнен.", "success");
  } catch {
    setStatus(tokenStatus, "Нет соединения с backend.", "error");
  } finally {
    button.disabled = false;
  }
});

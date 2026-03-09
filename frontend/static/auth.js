(() => {
  const API_BASE = "/api";
  const USER_TOKEN_KEY = "shoptech_user_token";
  const ADMIN_TOKEN_KEY = "shoptech_admin_token";
  const ACTIVE_SESSION_KEY = "shoptech_active_session";
  const LOGIN_PAGE_URL = "/index.html?mode=login";
  const ADMIN_LOGIN_PAGE_URL = "/index.html?mode=admin";

  function getStoredValue(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function setStoredValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures and keep the UI usable.
    }
  }

  function removeStoredValue(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures and keep the UI usable.
    }
  }

  function getUserToken() {
    return getStoredValue(USER_TOKEN_KEY);
  }

  function getAdminToken() {
    return getStoredValue(ADMIN_TOKEN_KEY);
  }

  function getActiveSessionKey() {
    return getStoredValue(ACTIVE_SESSION_KEY);
  }

  function setActiveSessionKey(key) {
    if (key) {
      setStoredValue(ACTIVE_SESSION_KEY, key);
      return;
    }
    removeStoredValue(ACTIVE_SESSION_KEY);
  }

  function storeUserToken(token) {
    removeStoredValue(ADMIN_TOKEN_KEY);
    setStoredValue(USER_TOKEN_KEY, token);
    setActiveSessionKey("user");
    syncNavigation();
  }

  function storeAdminToken(token) {
    removeStoredValue(USER_TOKEN_KEY);
    setStoredValue(ADMIN_TOKEN_KEY, token);
    setActiveSessionKey("admin");
    syncNavigation();
  }

  function clearUserToken() {
    removeStoredValue(USER_TOKEN_KEY);
    if (getActiveSessionKey() === "user") {
      setActiveSessionKey(getAdminToken() ? "admin" : "");
    }
    syncNavigation();
  }

  function clearAdminToken() {
    removeStoredValue(ADMIN_TOKEN_KEY);
    if (getActiveSessionKey() === "admin") {
      setActiveSessionKey(getUserToken() ? "user" : "");
    }
    syncNavigation();
  }

  function reconcileStoredSessions() {
    const userToken = getUserToken();
    const adminToken = getAdminToken();

    if (userToken && adminToken) {
      const activeSession = getActiveSessionKey();
      const preferredSession = activeSession === "admin" || window.location.pathname === "/admin.html"
        ? "admin"
        : "user";
      if (preferredSession === "admin") {
        removeStoredValue(USER_TOKEN_KEY);
      } else {
        removeStoredValue(ADMIN_TOKEN_KEY);
      }
      setActiveSessionKey(preferredSession);
      return;
    }

    if (userToken) {
      setActiveSessionKey("user");
      return;
    }

    if (adminToken) {
      setActiveSessionKey("admin");
      return;
    }

    setActiveSessionKey("");
  }

  function decodeTokenSubject(token) {
    if (!token) return "";

    try {
      const [, payloadPart] = token.split(".");
      if (!payloadPart) return "";

      const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const binary = window.atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      return typeof payload.sub === "string" ? payload.sub : "";
    } catch {
      return "";
    }
  }

  function hasAnySession() {
    return Boolean(getUserToken() || getAdminToken());
  }

  function getSessionEntries() {
    const entries = [];
    const userName = decodeTokenSubject(getUserToken());
    const adminName = decodeTokenSubject(getAdminToken());

    if (userName) {
      entries.push({ key: "user", role: "Пользователь", name: userName });
    }
    if (adminName) {
      entries.push({ key: "admin", role: "Админ", name: adminName });
    }

    return entries;
  }

  function getSessionSummaryNode() {
    const topbarInner = document.querySelector(".topbar-inner");
    if (!topbarInner) return null;

    let summary = topbarInner.querySelector("[data-session-summary]");
    if (!summary) {
      summary = document.createElement("div");
      summary.className = "session-summary";
      summary.dataset.sessionSummary = "true";
      summary.setAttribute("aria-live", "polite");
      topbarInner.append(summary);
    }

    return summary;
  }

  function renderSessionSummary() {
    const summary = getSessionSummaryNode();
    if (!summary) return;

    const entries = getSessionEntries();
    summary.replaceChildren();
    summary.hidden = entries.length === 0;
    if (!entries.length) return;

    entries.forEach((entry) => {
      const badge = document.createElement("div");
      badge.className = "session-badge";

      const role = document.createElement("span");
      role.className = "session-badge-role";
      role.textContent = entry.role;

      const name = document.createElement("strong");
      name.className = "session-badge-name";
      name.textContent = entry.name;

      const logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "session-badge-logout";
      logoutButton.textContent = "Выйти";
      logoutButton.setAttribute("aria-label", `Выйти из сессии ${entry.role.toLowerCase()} ${entry.name}`);
      logoutButton.addEventListener("click", () => {
        if (entry.key === "admin") {
          logoutAdmin();
          return;
        }
        logoutUser();
      });

      badge.append(role, name, logoutButton);
      summary.append(badge);
    });
  }

  function canAccess(role) {
    if (role === "user") return Boolean(getUserToken() || getAdminToken());
    if (role === "admin") return Boolean(getAdminToken());
    return true;
  }

  function syncNavigation() {
    document.querySelectorAll(".nav-links").forEach((node) => {
      node.hidden = !hasAnySession();
    });

    document.querySelectorAll("[data-nav-role]").forEach((node) => {
      node.hidden = !canAccess(node.dataset.navRole);
    });
    renderSessionSummary();
  }

  function redirectToLogin(mode = "login") {
    const target = mode === "admin" ? ADMIN_LOGIN_PAGE_URL : LOGIN_PAGE_URL;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === target) return;
    window.location.replace(target);
  }

  async function ensureUserSession() {
    const adminToken = getAdminToken();
    if (adminToken) {
      syncNavigation();
      return true;
    }

    const userToken = getUserToken();
    if (!userToken) {
      redirectToLogin("login");
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/reg/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (!response.ok) {
        clearUserToken();
        redirectToLogin("login");
        return false;
      }
    } catch {
      // If backend is temporarily unavailable, keep the client-side session.
    }

    syncNavigation();
    return true;
  }

  async function ensureAdminSession() {
    const adminToken = getAdminToken();
    if (!adminToken) {
      redirectToLogin("admin");
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (!response.ok) {
        clearAdminToken();
        redirectToLogin("admin");
        return false;
      }
    } catch {
      // If backend is temporarily unavailable, keep the client-side session.
    }

    syncNavigation();
    return true;
  }

  function logoutUser() {
    clearUserToken();
    if (getAdminToken()) return;
    redirectToLogin("login");
  }

  function logoutAdmin() {
    clearAdminToken();
    if (window.location.pathname === "/admin.html") {
      if (getUserToken()) {
        window.location.replace("/cars.html");
        return;
      }
      redirectToLogin("admin");
      return;
    }
    if (getUserToken()) return;
    redirectToLogin("admin");
  }

  function boot() {
    reconcileStoredSessions();
    syncNavigation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.ShopTechAuth = {
    getUserToken,
    getAdminToken,
    storeUserToken,
    storeAdminToken,
    clearUserToken,
    clearAdminToken,
    ensureUserSession,
    ensureAdminSession,
    logoutUser,
    logoutAdmin,
    redirectToLogin,
    syncNavigation,
    getSessionEntries,
  };
})();

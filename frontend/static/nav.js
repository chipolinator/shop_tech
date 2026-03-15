(() => {
  const adminTokenKey = "shoptech_admin_token";

  function syncAdminLink() {
    const adminLinks = document.querySelectorAll("[data-admin-link]");
    const hasAdminToken = Boolean(localStorage.getItem(adminTokenKey));

    for (const adminLink of adminLinks) {
      adminLink.classList.toggle("is-hidden", !hasAdminToken);
    }
  }

  window.ShopTechNav = {
    syncAdminLink,
  };

  syncAdminLink();
})();

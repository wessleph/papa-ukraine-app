// Navigation zwischen den vier Hauptbereichen + Initialisierung.
(function () {
  const navButtons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view");
  const STORAGE_KEY = "ua-hilfe-active-view";

  function showView(name) {
    views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    navButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    localStorage.setItem(STORAGE_KEY, name);
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  async function init() {
    const startView = localStorage.getItem(STORAGE_KEY) || "checkliste";
    showView(startView);

    await Checklist.load();
    await Tracker.load();
    await Finanzen.load();
    await Fahrten.load();
    await Notfall.load();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }

    // Chrome vergibt dauerhaften Speicher nur nach einer Nutzeraktion; schützt die Daten
    // vor automatischem Löschen bei Speichermangel.
    if (navigator.storage && navigator.storage.persist) {
      document.addEventListener("pointerdown", () => navigator.storage.persist(), { once: true });
    }
  }

  init();
})();

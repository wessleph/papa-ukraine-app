// Gemeinsame UI-Helfer: Modal-Dialog, Formatierung, Escaping.
const UI = (() => {
  const overlay = document.getElementById("modal-overlay");
  const titleEl = document.getElementById("modal-title");
  const bodyEl = document.getElementById("modal-body");
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn = document.getElementById("modal-cancel");

  let onConfirm = null;

  function close() {
    overlay.classList.remove("open");
    bodyEl.innerHTML = "";
    onConfirm = null;
  }

  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  confirmBtn.addEventListener("click", () => {
    if (onConfirm) {
      const result = onConfirm();
      if (result === false) return; // Validierung fehlgeschlagen, Modal offen lassen
    }
    close();
  });

  function open({ title, bodyHtml, onConfirm: confirmFn, confirmLabel }) {
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    confirmBtn.textContent = confirmLabel || "Speichern";
    onConfirm = confirmFn;
    overlay.classList.add("open");
    const firstInput = bodyEl.querySelector("input, textarea, select");
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function todayIso() {
    const d = new Date();
    const tz = d.getTimezoneOffset();
    return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return { open, close, escapeHtml, formatDate, todayIso, fileToDataUrl };
})();

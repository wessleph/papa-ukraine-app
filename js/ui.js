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

  confirmBtn.addEventListener("click", async () => {
    if (onConfirm) {
      confirmBtn.disabled = true;
      let result;
      try {
        result = await onConfirm();
      } finally {
        confirmBtn.disabled = false;
      }
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

  function formatCurrency(amount) {
    return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  }

  function todayIso() {
    const d = new Date();
    const tz = d.getTimezoneOffset();
    return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
  }

  function compressImage(file, maxDimension = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round(height * (maxDimension / width));
              width = maxDimension;
            } else {
              width = Math.round(width * (maxDimension / height));
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  return { open, close, escapeHtml, formatDate, formatCurrency, todayIso, compressImage };
})();

// Fahrten-Tagebuch: chronologische Liste der Hilfsfahrten mit optionalen Fotos.
const Fahrten = (() => {
  const content = document.getElementById("fahrten-content");
  const addBtn = document.getElementById("btn-add-fahrt");

  let trips = [];
  let pendingPhotos = [];

  async function load() {
    trips = await DB.getAll("trips");
    render();
  }

  async function refresh() {
    trips = await DB.getAll("trips");
    render();
    if (window.Tracker) Tracker.refresh();
  }

  function render() {
    if (trips.length === 0) {
      content.innerHTML = '<p class="empty-state">Noch keine Fahrten eingetragen.</p>';
      return;
    }
    const sorted = [...trips].sort((a, b) => (a.date < b.date ? 1 : -1));
    content.innerHTML = sorted.map((t) => `
      <div class="trip-card">
        <div class="trip-card__header">
          <span class="trip-card__date">${UI.formatDate(t.date)}</span>
          <button class="icon-btn" data-delete-trip="${t.id}" title="Fahrt löschen">✕</button>
        </div>
        <p class="trip-card__destination">${UI.escapeHtml(t.destination)}</p>
        ${t.notes ? `<p class="trip-card__notes">${UI.escapeHtml(t.notes)}</p>` : ""}
        ${(t.photos && t.photos.length) ? `
          <div class="trip-photos">
            ${t.photos.map((p) => `<img src="${p}" alt="">`).join("")}
          </div>` : ""}
      </div>
    `).join("");
  }

  function renderPhotoPreview() {
    const row = document.getElementById("f-photo-preview");
    if (!row) return;
    row.innerHTML = pendingPhotos.map((p) => `<img src="${p}" alt="">`).join("");
  }

  function onAddTrip() {
    pendingPhotos = [];
    UI.open({
      title: "Neue Fahrt",
      bodyHtml: `
        <div class="form-row">
          <label>Datum</label>
          <input type="date" id="f-date" value="${UI.todayIso()}">
        </div>
        <div class="form-row">
          <label>Ziel / Route</label>
          <input type="text" id="f-dest" placeholder="z. B. Lwiw über Krakau" required>
        </div>
        <div class="form-row">
          <label>Notizen</label>
          <textarea id="f-notes" placeholder="Beladung, Besonderheiten, Kontakte vor Ort…"></textarea>
        </div>
        <div class="form-row">
          <label>Fotos (optional)</label>
          <input type="file" id="f-photos" accept="image/*" multiple>
          <div class="photo-preview-row" id="f-photo-preview"></div>
        </div>
      `,
      confirmLabel: "Speichern",
      onConfirm: async () => {
        const destination = document.getElementById("f-dest").value.trim();
        const date = document.getElementById("f-date").value || UI.todayIso();
        const notes = document.getElementById("f-notes").value.trim();
        if (!destination) {
          alert("Bitte Ziel / Route angeben.");
          return false;
        }
        await DB.add("trips", { date, destination, notes, photos: pendingPhotos });
        pendingPhotos = [];
        await refresh();
      }
    });

    document.getElementById("f-photos").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const dataUrl = await UI.fileToDataUrl(file);
        pendingPhotos.push(dataUrl);
      }
      renderPhotoPreview();
    });
  }

  content.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-delete-trip]");
    if (!del) return;
    if (!confirm("Diese Fahrt wirklich löschen?")) return;
    await DB.delete("trips", Number(del.dataset.deleteTrip));
    await refresh();
  });

  addBtn.addEventListener("click", onAddTrip);

  return { load, refresh };
})();

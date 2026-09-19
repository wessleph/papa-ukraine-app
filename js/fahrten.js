// Fahrten-Tagebuch: chronologische Liste der Hilfsfahrten mit optionalen Fotos.
const Fahrten = (() => {
  const content = document.getElementById("fahrten-content");
  const addBtn = document.getElementById("btn-add-fahrt");

  let trips = [];
  let pendingPhotos = [];

  const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isRecording = false;
  let recordingBaseText = "";
  let recordingFinalText = "";

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
        <p class="trip-card__destination">${UI.escapeHtml(tripRoute(t))}</p>
        ${t.notes ? `<p class="trip-card__notes">${UI.escapeHtml(t.notes)}</p>` : ""}
        ${(t.photos && t.photos.length) ? `
          <div class="trip-photos">
            ${t.photos.map((p) => `<img src="${p}" alt="">`).join("")}
          </div>` : ""}
        <div class="trip-card__actions">
          <button class="btn btn--primary btn--small" data-share-trip="${t.id}">Bericht teilen</button>
        </div>
      </div>
    `).join("");
  }

  function tripRoute(trip) {
    return trip.from ? `Von ${trip.from} nach ${trip.destination}` : trip.destination;
  }

  function buildReport(trip) {
    const lines = [`Hilfsfahrt am ${UI.formatDate(trip.date)}`, trip.from ? tripRoute(trip) : `Ziel: ${trip.destination}`];
    if (trip.notes) lines.push("", trip.notes);
    return lines.join("\n");
  }

  async function photosToFiles(trip) {
    return Promise.all((trip.photos || []).map(async (dataUrl, i) => {
      const blob = await (await fetch(dataUrl)).blob();
      return new File([blob], `fahrt-${trip.date}-${i + 1}.jpg`, { type: blob.type || "image/jpeg" });
    }));
  }

  async function onShareTrip(tripId) {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;
    const files = await photosToFiles(trip);
    const photoHint = files.length
      ? `${files.length} Foto${files.length === 1 ? " wird" : "s werden"} beim Teilen mitgesendet.`
      : "Diese Fahrt hat keine Fotos.";

    UI.open({
      title: "Bericht teilen",
      bodyHtml: `
        <div class="form-row">
          <label>Bericht (vor dem Teilen änderbar)</label>
          <textarea id="f-report">${UI.escapeHtml(buildReport(trip))}</textarea>
        </div>
        <button type="button" id="f-copy-btn" class="btn btn--secondary btn--full">Nur Text kopieren</button>
        <p class="form-hint">${photoHint} Beim Teilen wird der Text automatisch kopiert. In Facebook im Beitrag lange ins Textfeld tippen und "Einfügen" wählen.</p>
      `,
      confirmLabel: "Teilen",
      onConfirm: async () => {
        const text = document.getElementById("f-report").value.trim();
        if (!navigator.share) {
          await navigator.clipboard.writeText(text);
          alert("Teilen wird auf diesem Gerät nicht unterstützt. Der Text wurde kopiert.");
          return;
        }
        const shareData = { text };
        if (files.length && navigator.canShare && navigator.canShare({ files })) shareData.files = files;
        // Text vorab kopieren, damit er in Facebook nur noch eingefügt werden muss.
        // Beide Aufrufe stehen bewusst direkt hintereinander, damit das Teilen noch
        // von der Nutzeraktion ausgelöst gilt.
        navigator.clipboard.writeText(text).catch(() => {});
        try {
          await navigator.share(shareData);
        } catch (err) {
          if (err.name !== "AbortError") alert("Teilen hat nicht geklappt. Bitte \"Nur Text kopieren\" verwenden.");
          return false;
        }
      }
    });

    document.getElementById("f-copy-btn").addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(document.getElementById("f-report").value);
        e.target.textContent = "Kopiert ✓";
      } catch {
        alert("Kopieren hat nicht geklappt.");
      }
    });
  }

  function renderPhotoPreview() {
    const row = document.getElementById("f-photo-preview");
    if (!row) return;
    row.innerHTML = pendingPhotos.map((p) => `<img src="${p}" alt="">`).join("");
  }

  function onAddTrip() {
    pendingPhotos = [];
    const latestTripWithFrom = [...trips].filter((t) => t.from).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const lastFrom = latestTripWithFrom ? latestTripWithFrom.from : "";
    UI.open({
      title: "Neue Fahrt",
      bodyHtml: `
        <div class="form-row">
          <label>Datum</label>
          <input type="date" id="f-date" value="${UI.todayIso()}">
        </div>
        <div class="form-row">
          <label>Von</label>
          <input type="text" id="f-from" value="${UI.escapeHtml(lastFrom)}" placeholder="z. B. Hamburg" required>
        </div>
        <div class="form-row">
          <label>Nach</label>
          <input type="text" id="f-dest" placeholder="z. B. Lwiw über Krakau" required>
        </div>
        <div class="form-row">
          <label>Notizen</label>
          <div class="textarea-with-mic">
            <textarea id="f-notes" placeholder="Beladung, Besonderheiten, Kontakte vor Ort…"></textarea>
            ${SpeechRecognitionApi ? '<button type="button" id="f-mic-btn" class="mic-btn" title="Diktieren">🎤</button>' : ""}
          </div>
          ${SpeechRecognitionApi ? '<p class="form-hint">Mikrofon antippen und sprechen, um den Bericht einzusprechen.</p>' : ""}
        </div>
        <div class="form-row">
          <label>Fotos (optional)</label>
          <input type="file" id="f-photos" accept="image/*" multiple>
          <div class="photo-preview-row" id="f-photo-preview"></div>
        </div>
      `,
      confirmLabel: "Speichern",
      onConfirm: async () => {
        const from = document.getElementById("f-from").value.trim();
        const destination = document.getElementById("f-dest").value.trim();
        const date = document.getElementById("f-date").value || UI.todayIso();
        const notes = document.getElementById("f-notes").value.trim();
        if (!from || !destination) {
          alert("Bitte \"Von\" und \"Nach\" angeben.");
          return false;
        }
        if (isRecording) recognition.stop();
        await DB.add("trips", { date, from, destination, notes, photos: pendingPhotos });
        pendingPhotos = [];
        await refresh();
      }
    });

    document.getElementById("modal-cancel").addEventListener("click", () => {
      if (isRecording) recognition.stop();
    }, { once: true });

    document.getElementById("f-photos").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const dataUrl = await UI.compressImage(file);
        pendingPhotos.push(dataUrl);
      }
      renderPhotoPreview();
    });

    const micBtn = document.getElementById("f-mic-btn");
    if (micBtn) micBtn.addEventListener("click", () => toggleDictation(micBtn));
  }

  function toggleDictation(micBtn) {
    const textarea = document.getElementById("f-notes");
    if (isRecording) {
      recognition.stop();
      return;
    }

    if (!recognition) {
      recognition = new SpeechRecognitionApi();
      recognition.lang = "de-DE";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            recordingFinalText += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        textarea.value = recordingBaseText + recordingFinalText + interim;
      };

      recognition.onerror = () => {
        isRecording = false;
        micBtn.classList.remove("recording");
      };

      recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove("recording");
      };
    }

    recordingBaseText = textarea.value ? textarea.value.trim() + " " : "";
    recordingFinalText = "";
    isRecording = true;
    micBtn.classList.add("recording");
    recognition.start();
  }

  content.addEventListener("click", async (e) => {
    const share = e.target.closest("[data-share-trip]");
    if (share) {
      onShareTrip(Number(share.dataset.shareTrip));
      return;
    }
    const del = e.target.closest("[data-delete-trip]");
    if (!del) return;
    if (!confirm("Diese Fahrt wirklich löschen?")) return;
    await DB.delete("trips", Number(del.dataset.deleteTrip));
    await refresh();
  });

  addBtn.addEventListener("click", onAddTrip);

  return { load, refresh };
})();

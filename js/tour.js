// Erklär-Tour beim ersten Öffnen der App. Bei den Bereichs-Schritten wird der echte
// Bildschirm gezeigt und der passende Punkt in der unteren Leiste hervorgehoben.
// Mit "?tour" am Ende der Adresse lässt sich die Tour erneut anzeigen.
const Tour = (() => {
  const STORAGE_KEY = "ua-hilfe-tour-done";
  const APP_ICON = '<img src="icons/icon-192.png" alt="">';

  const STEPS = [
    {
      icon: APP_ICON,
      title: "Willkommen!",
      paragraphs: [
        "Diese App unterstützt dich bei deinen Hilfsfahrten in die Ukraine.",
        "Eine kurze Tour zeigt dir, was die vier Bereiche in der unteren Leiste können."
      ]
    },
    {
      view: "checkliste",
      spot: true,
      title: "Checkliste",
      paragraphs: [
        "Hier stehen die Sachspenden, sortiert nach Kategorien wie Kleidung oder Medizin.",
        "Hake eine Position ab, sobald sie gepackt ist. Nach Menge oder Beschreibung wird kurz gefragt, dann landet sie <strong>automatisch im Tracker</strong>.",
        "Eigene Positionen und Kategorien fügst du mit dem gelben + hinzu."
      ]
    },
    {
      view: "tracker",
      spot: true,
      title: "Tracker",
      paragraphs: [
        "<strong>Sachspenden:</strong> Alles, was du abgehakt oder selbst eingetragen hast, mit Übersicht pro Kategorie.",
        "<strong>Spendengelder:</strong> Trage Einnahmen (mit Spender) und Ausgaben (mit Kategorie, z. B. Sprit oder Maut) ein. Der Saldo zeigt, was noch übrig ist."
      ]
    },
    {
      view: "fahrten",
      spot: true,
      title: "Fahrten",
      paragraphs: [
        "Halte jede Hilfsfahrt fest: Datum, von wo nach wo, Notizen und Fotos.",
        "Mit dem <strong>Mikrofon</strong> im Notizfeld kannst du den Bericht einsprechen, statt zu tippen.",
        "Mit <strong>Bericht teilen</strong> gehen Text und Fotos direkt an Facebook, WhatsApp und Co. Beträge sind dabei nie enthalten."
      ]
    },
    {
      view: "notfall",
      spot: true,
      title: "Notfall",
      paragraphs: [
        "Wichtige Notrufnummern für die Ukraine und die deutsche Botschaft, jeweils mit einem Anrufen-Knopf.",
        "Eigene Kontakte kannst du unten ergänzen."
      ]
    },
    {
      view: "checkliste",
      icon: APP_ICON,
      title: "Alles bereit",
      paragraphs: [
        "Alle Eingaben werden sofort auf diesem Handy gespeichert. Die App funktioniert auch ohne Internet, nur für die Spracheingabe braucht das Handy meist Empfang.",
        "Gibt es eine neue Version, erscheint unten ein blaues Feld. Einfach auf <strong>Aktualisieren</strong> tippen."
      ]
    }
  ];

  const overlay = document.getElementById("tour-overlay");
  const spotEl = document.getElementById("tour-spot");
  const iconEl = document.getElementById("tour-icon");
  const titleEl = document.getElementById("tour-title");
  const pointerEl = document.getElementById("tour-pointer");
  const textEl = document.getElementById("tour-text");
  const dotsEl = document.getElementById("tour-dots");
  const skipBtn = document.getElementById("tour-skip");
  const backBtn = document.getElementById("tour-back");
  const nextBtn = document.getElementById("tour-next");

  let index = 0;

  function navButton(view) {
    return document.querySelector(`.nav-btn[data-view="${view}"]`);
  }

  function positionSpot(view) {
    const pad = 4;
    const rect = navButton(view).getBoundingClientRect();
    spotEl.style.left = `${rect.left - pad}px`;
    spotEl.style.top = `${rect.top - pad}px`;
    spotEl.style.width = `${rect.width + pad * 2}px`;
    spotEl.style.height = `${rect.height + pad * 2}px`;
  }

  function render() {
    const step = STEPS[index];
    const isLast = index === STEPS.length - 1;

    if (step.view) navButton(step.view).click();

    overlay.classList.toggle("tour-overlay--spot", Boolean(step.spot));
    spotEl.hidden = !step.spot;
    pointerEl.hidden = !step.spot;
    if (step.spot) positionSpot(step.view);

    iconEl.hidden = !step.icon;
    iconEl.innerHTML = step.icon || "";
    titleEl.textContent = step.title;
    textEl.innerHTML = step.paragraphs.map((p) => `<p>${p}</p>`).join("");
    dotsEl.innerHTML = STEPS.map((_, i) => `<span class="${i === index ? "active" : ""}"></span>`).join("");
    backBtn.hidden = index === 0;
    skipBtn.hidden = isLast;
    nextBtn.textContent = isLast ? "Los geht's" : "Weiter";
  }

  function finish() {
    overlay.hidden = true;
    navButton("checkliste").click();
  }

  nextBtn.addEventListener("click", () => {
    if (index === STEPS.length - 1) {
      finish();
      return;
    }
    index += 1;
    render();
  });

  backBtn.addEventListener("click", () => {
    index -= 1;
    render();
  });

  skipBtn.addEventListener("click", finish);

  window.addEventListener("resize", () => {
    const step = STEPS[index];
    if (!overlay.hidden && step.spot) positionSpot(step.view);
  });

  function startIfNeeded() {
    const forced = new URLSearchParams(location.search).has("tour");
    if (!forced && localStorage.getItem(STORAGE_KEY)) return;
    // Sofort als gesehen markieren, damit die Tour wirklich nur einmal erscheint.
    localStorage.setItem(STORAGE_KEY, "1");
    if (forced) history.replaceState(null, "", location.pathname);
    index = 0;
    render();
    overlay.hidden = false;
  }

  return { startIfNeeded };
})();

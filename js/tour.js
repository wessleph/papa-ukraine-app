// Erklär-Tour beim ersten Öffnen der App. Jeder Schritt zeigt den echten Bildschirm und
// hebt das erklärte Element hervor (Leisten-Punkt oder ein Element im Bereich).
// Mit "?tour" am Ende der Adresse lässt sich die Tour erneut anzeigen.
const Tour = (() => {
  // Die Endung erhöhen, damit die Tour allen Geräten noch einmal angezeigt wird.
  const STORAGE_KEY = "ua-hilfe-tour-done-2";
  const APP_ICON = '<img src="icons/icon-192.png" alt="">';
  const NAV = "nav";
  const NAV_POINTER = "Unten in der Leiste markiert";

  const $ = (selector) => document.querySelector(selector);

  const ALL_STEPS = [
    {
      icon: APP_ICON,
      title: "Willkommen!",
      paragraphs: [
        "Diese App unterstützt dich bei deinen Hilfsfahrten in die Ukraine.",
        "Eine kurze Tour zeigt dir Schritt für Schritt, was du wo findest."
      ]
    },

    {
      view: "checkliste", target: NAV, pointer: NAV_POINTER, title: "Checkliste",
      paragraphs: ["Hier stehen die Sachspenden, sortiert nach Kategorien wie Kleidung oder Medizin."]
    },
    {
      view: "checkliste", target: () => $("#checkliste-content .checklist-item"), title: "Position abhaken",
      paragraphs: [
        "Hake eine Position ab, sobald sie gepackt ist.",
        "Nach Menge oder Beschreibung wird kurz gefragt, dann landet sie <strong>automatisch im Tracker</strong>."
      ]
    },
    {
      view: "checkliste", target: () => $("#btn-add-category"), title: "Eigene Kategorien",
      paragraphs: [
        "Mit <strong>+ Kategorie</strong> legst du eine neue Kategorie an.",
        "Eigene Positionen trägst du in der Zeile unter jeder Kategorie ein."
      ]
    },

    {
      view: "tracker", target: NAV, pointer: NAV_POINTER, title: "Tracker",
      paragraphs: ["Hier siehst du, was gesammelt wurde und wie es um die Spendengelder steht."]
    },
    {
      view: "tracker", target: () => $("#view-tracker .subsection-header"), title: "Sachspenden",
      paragraphs: ["Alles, was du abgehakt oder mit <strong>+ Spende</strong> selbst eingetragen hast, mit Übersicht pro Kategorie."]
    },
    {
      view: "tracker", target: () => $("#finanzen-stats"), title: "Spendengelder",
      paragraphs: [
        "Mit <strong>+ Eintrag</strong> trägst du Einnahmen (mit Spender) und Ausgaben (mit Kategorie, z. B. Sprit oder Maut) ein.",
        "Der <strong>Saldo</strong> zeigt, was noch übrig ist."
      ]
    },

    {
      view: "fahrten", target: NAV, pointer: NAV_POINTER, title: "Fahrten",
      paragraphs: ["Hier hältst du jede Hilfsfahrt fest."]
    },
    {
      view: "fahrten", target: () => $("#btn-add-fahrt"), title: "Neue Fahrt",
      paragraphs: ["Mit <strong>+ Fahrt</strong> trägst du Datum, von wo nach wo, Notizen und Fotos ein."]
    },
    {
      view: "fahrten", target: () => $("#f-mic-btn"), title: "Bericht einsprechen",
      openFahrtDialog: true,
      skipIf: () => !(window.SpeechRecognition || window.webkitSpeechRecognition),
      paragraphs: [
        "Tippe auf das <strong>Mikrofon</strong> und sprich, statt zu tippen. Das Handy schreibt den Text für dich.",
        "Dafür braucht das Handy meist Empfang."
      ]
    },
    {
      view: "fahrten",
      showDemoTrip: true,
      target: () => $("[data-share-trip]") || $("[data-tour-share-demo]"),
      pointer: () => ($("[data-tour-share-demo]") ? "Beispiel: So sieht es bei jeder gespeicherten Fahrt aus" : ""),
      title: "Bericht teilen",
      paragraphs: [
        "Zu jeder gespeicherten Fahrt gibt es <strong>Bericht teilen</strong>. Text und Fotos gehen direkt an Facebook, WhatsApp und Co.",
        "Beträge sind dabei nie enthalten."
      ]
    },

    {
      view: "notfall", target: NAV, pointer: NAV_POINTER, title: "Notfall",
      paragraphs: ["Hier findest du im Ernstfall schnell die wichtigen Nummern."]
    },
    {
      view: "notfall",
      target: () => {
        const card = document.querySelectorAll("#notfall-content .info-card")[1] || $("#notfall-content .info-card");
        return card && card.querySelector(".call-row");
      },
      title: "Notrufnummern",
      paragraphs: ["Notrufe für die Ukraine und die deutsche Botschaft. Mit <strong>Anrufen</strong> wählt das Handy sofort."]
    },
    {
      view: "notfall", target: () => $("#btn-add-contact"), title: "Eigene Kontakte",
      paragraphs: ["Ergänze hier eigene Kontakte, zum Beispiel Ansprechpartner an der Grenze."]
    },

    {
      view: "checkliste",
      icon: APP_ICON,
      title: "Alles bereit",
      paragraphs: [
        "Alle Eingaben werden sofort auf diesem Handy gespeichert. Die App funktioniert auch ohne Internet.",
        "Gibt es eine neue Version, erscheint unten ein blaues Feld. Einfach auf <strong>Aktualisieren</strong> tippen."
      ]
    }
  ];

  const overlay = document.getElementById("tour-overlay");
  const spotEl = document.getElementById("tour-spot");
  const cardEl = overlay.querySelector(".tour-card");
  const iconEl = document.getElementById("tour-icon");
  const titleEl = document.getElementById("tour-title");
  const pointerEl = document.getElementById("tour-pointer");
  const textEl = document.getElementById("tour-text");
  const dotsEl = document.getElementById("tour-dots");
  const skipBtn = document.getElementById("tour-skip");
  const backBtn = document.getElementById("tour-back");
  const nextBtn = document.getElementById("tour-next");

  // Beispiel-Fahrt für den Schritt "Bericht teilen", solange noch keine echte Fahrt existiert.
  // Sie wird nur angezeigt, nicht gespeichert.
  const DEMO_TRIP_HTML = `
    <div class="trip-card">
      <div class="trip-card__header"><span class="trip-card__date">Beispiel</span></div>
      <p class="trip-card__destination">Von Hamburg nach Lwiw</p>
      <p class="trip-card__notes">12 Kartons Kleidung und Verbandsmaterial übergeben.</p>
      <div class="trip-card__actions">
        <button class="btn btn--primary btn--small" data-tour-share-demo>Bericht teilen</button>
      </div>
    </div>`;

  let steps = [];
  let index = 0;
  let dialogOpenedByTour = false;
  let fahrtenContentBackup = null;

  function navButton(view) {
    return $(`.nav-btn[data-view="${view}"]`);
  }

  function resolveTarget(step) {
    if (!step.target) return null;
    return step.target === NAV ? navButton(step.view) : step.target();
  }

  function showDemoTrip() {
    if ($("[data-share-trip]")) return;
    const content = document.getElementById("fahrten-content");
    fahrtenContentBackup = content.innerHTML;
    content.innerHTML = DEMO_TRIP_HTML;
  }

  function undoTourChanges() {
    if (dialogOpenedByTour) {
      dialogOpenedByTour = false;
      document.getElementById("modal-cancel").click();
    }
    if (fahrtenContentBackup !== null) {
      document.getElementById("fahrten-content").innerHTML = fahrtenContentBackup;
      fahrtenContentBackup = null;
    }
  }

  function positionSpot(target) {
    const pad = 4;
    const rect = target.getBoundingClientRect();
    spotEl.style.left = `${rect.left - pad}px`;
    spotEl.style.top = `${rect.top - pad}px`;
    spotEl.style.width = `${rect.width + pad * 2}px`;
    spotEl.style.height = `${rect.height + pad * 2}px`;
  }

  // Schiebt das Element in den Bereich, den die Karte nicht verdeckt. Zuerst wird die
  // Karte oben versucht, sonst unten. Gibt zurück, ob die Karte oben sitzt.
  function placeTarget(target) {
    const vh = window.innerHeight;
    const cardHeight = cardEl.offsetHeight;
    const dialog = target.closest(".modal");
    const scroller = dialog || window;

    const topCard = {
      top: cardHeight + 32,
      bottom: (dialog ? vh - 90 : $(".bottom-nav").getBoundingClientRect().top) - 8
    };
    const bottomCard = {
      top: dialog ? 16 : $(".app-header").getBoundingClientRect().bottom + 8,
      bottom: vh - cardHeight - 32
    };

    const attempt = (free) => {
      const before = target.getBoundingClientRect();
      const wantedTop = free.top + Math.max(0, (free.bottom - free.top - before.height) / 2);
      scroller.scrollBy(0, before.top - wantedTop);
      const after = target.getBoundingClientRect();
      return Math.max(0, free.top - after.top) + Math.max(0, after.bottom - free.bottom);
    };

    const overlapTop = attempt(topCard);
    if (overlapTop <= 1) return true;
    const overlapBottom = attempt(bottomCard);
    if (overlapBottom <= 1) return false;

    // Passt nirgends ganz: Karte auf der Seite mit mehr Platz kleiner machen. Sie scrollt
    // dann intern, die Knöpfe bleiben sichtbar.
    const rect = target.getBoundingClientRect();
    const roomAbove = rect.top - 32;
    const roomBelow = vh - rect.bottom - 32;
    const cardOnTop = roomAbove >= roomBelow;
    cardEl.style.maxHeight = `${Math.max(180, cardOnTop ? roomAbove : roomBelow)}px`;
    return cardOnTop;
  }

  function layout(step) {
    cardEl.style.maxHeight = "";
    const target = resolveTarget(step);
    const spotted = Boolean(target);
    const isNav = step.target === NAV;

    overlay.classList.toggle("tour-overlay--spot", spotted);
    overlay.classList.toggle("tour-overlay--nav", spotted && isNav);
    spotEl.hidden = !spotted;
    if (!spotted) {
      overlay.classList.remove("tour-overlay--bottom");
      return;
    }
    const cardOnTop = isNav ? true : placeTarget(target);
    overlay.classList.toggle("tour-overlay--bottom", !cardOnTop);
    positionSpot(target);
  }

  function render() {
    const step = steps[index];
    const isLast = index === steps.length - 1;

    undoTourChanges();
    if (step.view) navButton(step.view).click();
    window.scrollTo(0, 0);
    if (step.openFahrtDialog) {
      $("#btn-add-fahrt").click();
      dialogOpenedByTour = true;
    }
    if (step.showDemoTrip) showDemoTrip();

    iconEl.hidden = !step.icon;
    iconEl.innerHTML = step.icon || "";
    titleEl.textContent = step.title;
    const pointer = typeof step.pointer === "function" ? step.pointer() : step.pointer;
    pointerEl.textContent = pointer || "";
    pointerEl.hidden = !pointer;
    textEl.innerHTML = step.paragraphs.map((p) => `<p>${p}</p>`).join("");
    dotsEl.innerHTML = steps.map((_, i) => `<span class="${i === index ? "active" : ""}"></span>`).join("");
    backBtn.hidden = index === 0;
    skipBtn.hidden = isLast;
    nextBtn.textContent = isLast ? "Los geht's" : "Weiter";

    layout(step);
  }

  function finish() {
    undoTourChanges();
    overlay.hidden = true;
    navButton("checkliste").click();
    window.scrollTo(0, 0);
  }

  nextBtn.addEventListener("click", () => {
    if (index === steps.length - 1) {
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

  // Verhindert, dass der Bildschirm hinter der Tour weggescrollt wird.
  overlay.addEventListener("wheel", (event) => {
    if (!event.target.closest(".tour-card")) event.preventDefault();
  }, { passive: false });

  window.addEventListener("resize", () => {
    if (!overlay.hidden) layout(steps[index]);
  });

  function startIfNeeded() {
    const forced = new URLSearchParams(location.search).has("tour");
    if (!forced && localStorage.getItem(STORAGE_KEY)) return;
    // Sofort als gesehen markieren, damit die Tour wirklich nur einmal erscheint.
    localStorage.setItem(STORAGE_KEY, "1");
    if (forced) history.replaceState(null, "", location.pathname);
    steps = ALL_STEPS.filter((step) => !step.skipIf || !step.skipIf());
    index = 0;
    overlay.hidden = false;
    render();
  }

  return { startIfNeeded };
})();

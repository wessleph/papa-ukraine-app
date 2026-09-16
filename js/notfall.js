// Notfall-Infos: feste Notrufnummern (recherchiert, Stand siehe Quelle) + eigene Kontakte.
const Notfall = (() => {
  const content = document.getElementById("notfall-content");

  // Quelle: Deutsche Botschaft Kyjiw, Merkblatt "Hilfe für Deutsche in Notfällen", Stand Mai 2024
  // (ukraine.diplo.de) sowie Honorarkonsulate der Bundesrepublik Deutschland in der Ukraine.
  const FIXED_NUMBERS = [
    {
      section: "Europäischer Notruf",
      entries: [
        { label: "Notruf (EU-weit, auch Ukraine kleinere Orte)", number: "112" }
      ]
    },
    {
      section: "Notrufnummern Ukraine",
      entries: [
        { label: "Feuerwehr", number: "101" },
        { label: "Polizei", number: "102" },
        { label: "Rettungsdienst", number: "103" },
        { label: "Gas-Notruf", number: "104" }
      ]
    },
    {
      section: "Deutsche Vertretungen in der Ukraine",
      entries: [
        { label: "Deutsche Botschaft Kyjiw (Zentrale)", number: "+380442811100", display: "+380 44 281 11 00" },
        { label: "Honorarkonsulat Lwiw (Westukraine)", number: "+380322757102", display: "+380 32 275 71 02" }
      ]
    },
    {
      section: "Sonstiges",
      entries: [
        { label: "Sperr-Notruf für Bank-/Kreditkarten (24h, aus dem Ausland)", number: "0049116116", display: "0049 116 116" }
      ]
    }
  ];

  let contacts = [];

  async function load() {
    contacts = await DB.getAll("contacts");
    render();
  }

  async function refresh() {
    contacts = await DB.getAll("contacts");
    render();
  }

  function callRow(label, number, display) {
    return `
      <div class="call-row">
        <div>
          <div>${UI.escapeHtml(label)}</div>
          <div class="call-row__number">${UI.escapeHtml(display || number)}</div>
        </div>
        <a class="call-btn" href="tel:${number}">Anrufen</a>
      </div>
    `;
  }

  function render() {
    const fixedHtml = FIXED_NUMBERS.map((group) => `
      <div class="section-label">${UI.escapeHtml(group.section)}</div>
      <div class="info-card">
        ${group.entries.map((e) => callRow(e.label, e.number, e.display)).join("")}
      </div>
    `).join("");

    const contactsHtml = contacts.length === 0
      ? '<p class="empty-state">Noch keine eigenen Kontakte.</p>'
      : contacts.map((c) => `
        <div class="contact-card">
          <div class="category-card__header">
            <h3 class="category-card__title">${UI.escapeHtml(c.name)}</h3>
            <button class="icon-btn" data-delete-contact="${c.id}" title="Kontakt löschen">✕</button>
          </div>
          ${c.note ? `<p class="info-card__sub">${UI.escapeHtml(c.note)}</p>` : ""}
          ${callRow("Telefon", c.number)}
        </div>
      `).join("");

    content.innerHTML = `
      ${fixedHtml}
      <div class="section-label">Eigene Kontakte</div>
      ${contactsHtml}
      <button id="btn-add-contact" class="btn btn--primary btn--full">+ Eigenen Kontakt hinzufügen</button>
    `;

    document.getElementById("btn-add-contact").addEventListener("click", onAddContact);
  }

  function onAddContact() {
    UI.open({
      title: "Eigenen Kontakt hinzufügen",
      bodyHtml: `
        <div class="form-row">
          <label>Name</label>
          <input type="text" id="f-name" placeholder="z. B. Ansprechpartner Grenze" required>
        </div>
        <div class="form-row">
          <label>Telefonnummer</label>
          <input type="tel" id="f-number" placeholder="+380…" required>
        </div>
        <div class="form-row">
          <label>Notiz (optional)</label>
          <input type="text" id="f-note" placeholder="z. B. spricht Deutsch">
        </div>
      `,
      confirmLabel: "Speichern",
      onConfirm: async () => {
        const name = document.getElementById("f-name").value.trim();
        const number = document.getElementById("f-number").value.trim();
        const note = document.getElementById("f-note").value.trim();
        if (!name || !number) {
          alert("Bitte Name und Telefonnummer angeben.");
          return false;
        }
        await DB.add("contacts", { name, number, note });
        await refresh();
      }
    });
  }

  content.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-delete-contact]");
    if (!del) return;
    if (!confirm("Diesen Kontakt wirklich löschen?")) return;
    await DB.delete("contacts", Number(del.dataset.deleteContact));
    await refresh();
  });

  return { load };
})();

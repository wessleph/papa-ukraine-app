// Spendengelder-Tracker: Einnahmen (Geldspenden) und Ausgaben in einer gemeinsamen Liste.
const Finanzen = (() => {
  const statsBox = document.getElementById("finanzen-stats");
  const content = document.getElementById("finanzen-content");
  const addBtn = document.getElementById("btn-add-finanzen");

  const EXPENSE_CATEGORIES = [
    "Sprit",
    "Maut & Gebühren",
    "Material & Verpackung",
    "Verpflegung & Unterkunft",
    "Sonstiges"
  ];

  let entries = [];

  async function load() {
    entries = await DB.getAll("finances");
    render();
  }

  async function refresh() {
    entries = await DB.getAll("finances");
    render();
  }

  function render() {
    const income = entries.filter((e) => e.type === "einnahme").reduce((sum, e) => sum + e.amount, 0);
    const expense = entries.filter((e) => e.type === "ausgabe").reduce((sum, e) => sum + e.amount, 0);
    const balance = income - expense;

    statsBox.innerHTML = `
      <div class="stat-tile stat-tile--income">
        <div class="stat-tile__value">${UI.formatCurrency(income)}</div>
        <div class="stat-tile__label">Einnahmen</div>
      </div>
      <div class="stat-tile stat-tile--expense">
        <div class="stat-tile__value">${UI.formatCurrency(expense)}</div>
        <div class="stat-tile__label">Ausgaben</div>
      </div>
      <div class="stat-tile stat-tile--total">
        <div class="stat-tile__value">${UI.formatCurrency(balance)}</div>
        <div class="stat-tile__label">Saldo</div>
      </div>
    `;

    if (entries.length === 0) {
      content.innerHTML = '<p class="empty-state">Noch keine Einnahmen oder Ausgaben erfasst.</p>';
      return;
    }

    const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
    content.innerHTML = `
      <div class="category-card">
        ${sorted.map((e) => `
          <div class="finance-entry">
            <div class="finance-entry__main">
              <div class="finance-entry__desc">${UI.escapeHtml(entryTitle(e))}</div>
              <div class="finance-entry__meta">${UI.escapeHtml(entryMeta(e))}</div>
            </div>
            <div class="finance-entry__amount finance-entry__amount--${e.type === "einnahme" ? "income" : "expense"}">
              ${e.type === "einnahme" ? "+" : "−"} ${UI.formatCurrency(e.amount)}
            </div>
            <button class="icon-btn" data-edit-finance="${e.id}" title="Eintrag bearbeiten">✎</button>
            <button class="icon-btn" data-delete-finance="${e.id}" title="Eintrag löschen">✕</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function entryTitle(e) {
    return e.description || e.category || (e.type === "einnahme" ? "Einnahme" : "Ausgabe");
  }

  function entryMeta(e) {
    const parts = [UI.formatDate(e.date)];
    if (e.category && e.category !== entryTitle(e)) parts.push(e.category);
    if (e.donor) parts.push(`von ${e.donor}`);
    return parts.join(" · ");
  }

  function openEntryForm(existing = null) {
    let selectedType = existing ? existing.type : "einnahme";
    const isIncome = selectedType === "einnahme";

    UI.open({
      title: existing ? "Eintrag bearbeiten" : "Spendengeld erfassen",
      bodyHtml: `
        <div class="form-row">
          <label>Art</label>
          <div class="segmented" id="f-type-toggle">
            <button type="button" data-type="einnahme" class="${isIncome ? "active" : ""}">Einnahme</button>
            <button type="button" data-type="ausgabe" class="${isIncome ? "" : "active"}">Ausgabe</button>
          </div>
        </div>
        <div class="form-row">
          <label>Betrag (€)</label>
          <input type="number" id="f-amount" inputmode="decimal" step="0.01" min="0" placeholder="z. B. 50" value="${existing ? existing.amount : ""}" required>
        </div>
        <div class="form-row" id="f-donor-row" ${isIncome ? "" : "hidden"}>
          <label>Spender (optional)</label>
          <input type="text" id="f-donor" placeholder="z. B. Familie Müller" value="${UI.escapeHtml(existing && existing.donor)}">
        </div>
        <div class="form-row" id="f-category-row" ${isIncome ? "hidden" : ""}>
          <label>Kategorie</label>
          <select id="f-category">
            <option value="">Bitte wählen…</option>
            ${EXPENSE_CATEGORIES.map((c) => `<option value="${UI.escapeHtml(c)}" ${existing && existing.category === c ? "selected" : ""}>${UI.escapeHtml(c)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <label>Beschreibung (optional)</label>
          <input type="text" id="f-desc" placeholder="z. B. Spendenaktion / Tankstelle Krakau" value="${UI.escapeHtml(existing && existing.description)}">
        </div>
        <div class="form-row">
          <label>Datum</label>
          <input type="date" id="f-date" value="${existing ? existing.date : UI.todayIso()}">
        </div>
      `,
      confirmLabel: "Speichern",
      onConfirm: async () => {
        const amount = parseFloat(document.getElementById("f-amount").value);
        const description = document.getElementById("f-desc").value.trim();
        const donor = document.getElementById("f-donor").value.trim();
        const category = document.getElementById("f-category").value;
        const date = document.getElementById("f-date").value || UI.todayIso();
        if (!amount || amount <= 0) {
          alert("Bitte einen Betrag angeben.");
          return false;
        }
        if (selectedType === "ausgabe" && !category) {
          alert("Bitte eine Kategorie wählen.");
          return false;
        }
        const entry = { type: selectedType, amount, description, date };
        if (selectedType === "einnahme" && donor) entry.donor = donor;
        if (selectedType === "ausgabe") entry.category = category;
        if (existing) {
          await DB.put("finances", { ...entry, id: existing.id });
        } else {
          await DB.add("finances", entry);
        }
        await refresh();
      }
    });

    document.getElementById("f-type-toggle").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-type]");
      if (!btn) return;
      selectedType = btn.dataset.type;
      document.querySelectorAll("#f-type-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("f-donor-row").hidden = selectedType !== "einnahme";
      document.getElementById("f-category-row").hidden = selectedType !== "ausgabe";
    });
  }

  content.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit-finance]");
    if (edit) {
      openEntryForm(entries.find((entry) => entry.id === Number(edit.dataset.editFinance)));
      return;
    }
    const del = e.target.closest("[data-delete-finance]");
    if (!del) return;
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    await DB.delete("finances", Number(del.dataset.deleteFinance));
    await refresh();
  });

  addBtn.addEventListener("click", () => openEntryForm());

  return { load, refresh };
})();

// Spendengelder-Tracker: Einnahmen (Geldspenden) und Ausgaben in einer gemeinsamen Liste.
const Finanzen = (() => {
  const statsBox = document.getElementById("finanzen-stats");
  const chartBox = document.getElementById("finanzen-chart");
  const content = document.getElementById("finanzen-content");
  const addBtn = document.getElementById("btn-add-finanzen");

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
      <div class="stat-tile">
        <div class="stat-tile__value">${UI.formatCurrency(balance)}</div>
        <div class="stat-tile__label">Saldo</div>
      </div>
    `;

    renderChart();

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
              <div class="finance-entry__desc">${UI.escapeHtml(e.description)}</div>
              <div class="finance-entry__meta">${UI.formatDate(e.date)}</div>
            </div>
            <div class="finance-entry__amount finance-entry__amount--${e.type === "einnahme" ? "income" : "expense"}">
              ${e.type === "einnahme" ? "+" : "−"} ${UI.formatCurrency(e.amount)}
            </div>
            <button class="icon-btn" data-delete-finance="${e.id}" title="Eintrag löschen">✕</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderChart() {
    const expenses = entries.filter((e) => e.type === "ausgabe");
    if (expenses.length === 0) {
      chartBox.innerHTML = "";
      return;
    }

    const byMonth = {};
    expenses.forEach((e) => {
      const key = e.date.slice(0, 7); // YYYY-MM
      byMonth[key] = (byMonth[key] || 0) + e.amount;
    });

    const months = Object.keys(byMonth).sort();
    const maxAmount = Math.max(...months.map((m) => byMonth[m]));
    const maxBarHeight = 110;

    const bars = months.map((m) => {
      const value = byMonth[m];
      const heightPx = Math.max(3, Math.round((value / maxAmount) * maxBarHeight));
      const [year, month] = m.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      return `
        <div class="bar-col">
          <div class="bar-col__value">${UI.formatCurrency(value)}</div>
          <div class="bar-col__bar" style="height:${heightPx}px"></div>
          <div class="bar-col__label">${label}</div>
        </div>
      `;
    }).join("");

    chartBox.innerHTML = `
      <div class="chart-card">
        <h4 class="chart-card__title">Ausgaben pro Monat</h4>
        <div class="bar-chart">${bars}</div>
      </div>
    `;
  }

  function onAddEntry() {
    let selectedType = "einnahme";

    UI.open({
      title: "Spendengeld erfassen",
      bodyHtml: `
        <div class="form-row">
          <label>Art</label>
          <div class="segmented" id="f-type-toggle">
            <button type="button" data-type="einnahme" class="active">Einnahme</button>
            <button type="button" data-type="ausgabe">Ausgabe</button>
          </div>
        </div>
        <div class="form-row">
          <label>Betrag (€)</label>
          <input type="number" id="f-amount" inputmode="decimal" step="0.01" min="0" placeholder="z. B. 50" required>
        </div>
        <div class="form-row">
          <label>Beschreibung</label>
          <input type="text" id="f-desc" placeholder="z. B. Spende von Nachbarn / Tanken" required>
        </div>
        <div class="form-row">
          <label>Datum</label>
          <input type="date" id="f-date" value="${UI.todayIso()}">
        </div>
      `,
      confirmLabel: "Speichern",
      onConfirm: async () => {
        const amount = parseFloat(document.getElementById("f-amount").value);
        const description = document.getElementById("f-desc").value.trim();
        const date = document.getElementById("f-date").value || UI.todayIso();
        if (!amount || amount <= 0 || !description) {
          alert("Bitte Betrag und Beschreibung angeben.");
          return false;
        }
        await DB.add("finances", { type: selectedType, amount, description, date });
        await refresh();
      }
    });

    document.getElementById("f-type-toggle").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-type]");
      if (!btn) return;
      selectedType = btn.dataset.type;
      document.querySelectorAll("#f-type-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
    });
  }

  content.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-delete-finance]");
    if (!del) return;
    await DB.delete("finances", Number(del.dataset.deleteFinance));
    await refresh();
  });

  addBtn.addEventListener("click", onAddEntry);

  return { load, refresh };
})();

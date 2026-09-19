// Spenden-Tracker: automatische Einträge aus der Checkliste + manuelle Einträge.
const Tracker = (() => {
  const statsBox = document.getElementById("tracker-stats");
  const content = document.getElementById("tracker-content");
  const addBtn = document.getElementById("btn-add-donation");

  let donations = [];

  async function load() {
    donations = await DB.getAll("donations");
    await render();
  }

  async function refresh() {
    donations = await DB.getAll("donations");
    await render();
  }

  async function render() {
    const categoryCount = new Set(donations.map((d) => d.category)).size;
    statsBox.innerHTML = `
      <div class="stat-tile">
        <div class="stat-tile__value">${donations.length}</div>
        <div class="stat-tile__label">Spenden gesamt</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__value">${categoryCount}</div>
        <div class="stat-tile__label">Kategorien</div>
      </div>
    `;

    if (donations.length === 0) {
      content.innerHTML = '<p class="empty-state">Noch keine Spenden erfasst.</p>';
      return;
    }

    const byCategory = {};
    donations.forEach((d) => {
      if (!byCategory[d.category]) byCategory[d.category] = [];
      byCategory[d.category].push(d);
    });

    const sortedCategories = Object.keys(byCategory).sort();

    content.innerHTML = sortedCategories.map((cat) => {
      const entries = byCategory[cat].sort((a, b) => (a.date < b.date ? 1 : -1));
      const rows = entries.map((d) => `
        <div class="donation-entry">
          <div class="donation-entry__main">
            <div class="donation-entry__desc">${UI.escapeHtml(d.description)}</div>
            <div class="donation-entry__meta">${UI.formatDate(d.date)}${d.source === "checkliste" ? " · aus Checkliste" : ""}</div>
          </div>
          <button class="icon-btn" data-edit-donation="${d.id}" title="Eintrag bearbeiten">✎</button>
          <button class="icon-btn" data-delete-donation="${d.id}" title="Eintrag löschen">✕</button>
        </div>
      `).join("");

      return `
        <div class="category-card">
          <div class="category-card__header">
            <h3 class="category-card__title">${UI.escapeHtml(cat)}</h3>
            <span class="donation-entry__meta">${entries.length} Einträge</span>
          </div>
          ${rows}
        </div>
      `;
    }).join("");
  }

  async function getCategoryNames() {
    const categories = await DB.getAll("categories");
    return categories.map((c) => c.name);
  }

  async function openDonationForm(existing = null) {
    const categoryNames = await getCategoryNames();
    const optionsHtml = categoryNames.map((n) => `<option value="${UI.escapeHtml(n)}">`).join("");

    UI.open({
      title: existing ? "Eintrag bearbeiten" : "Spende manuell erfassen",
      bodyHtml: `
        <div class="form-row">
          <label>Kategorie</label>
          <input type="text" id="f-cat" list="f-cat-list" placeholder="z. B. Kleidung" value="${UI.escapeHtml(existing && existing.category)}" required>
          <datalist id="f-cat-list">${optionsHtml}</datalist>
        </div>
        <div class="form-row">
          <label>Menge / Beschreibung</label>
          <input type="text" id="f-desc" placeholder="z. B. 2 Kisten Konserven" value="${UI.escapeHtml(existing && existing.description)}" required>
        </div>
        <div class="form-row">
          <label>Datum</label>
          <input type="date" id="f-date" value="${existing ? existing.date : UI.todayIso()}">
        </div>
      `,
      confirmLabel: "Speichern",
      onConfirm: async () => {
        const category = document.getElementById("f-cat").value.trim();
        const description = document.getElementById("f-desc").value.trim();
        const date = document.getElementById("f-date").value || UI.todayIso();
        if (!category || !description) {
          alert("Bitte Kategorie und Beschreibung angeben.");
          return false;
        }
        if (existing) {
          await DB.put("donations", { ...existing, category, description, date });
        } else {
          await DB.add("donations", { category, description, date, source: "manuell" });
        }
        await refresh();
      }
    });
  }

  content.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit-donation]");
    if (edit) {
      openDonationForm(donations.find((d) => d.id === Number(edit.dataset.editDonation)));
      return;
    }
    const del = e.target.closest("[data-delete-donation]");
    if (!del) return;
    if (!confirm("Diesen Spenden-Eintrag wirklich löschen?")) return;
    await DB.delete("donations", Number(del.dataset.deleteDonation));
    await refresh();
  });

  addBtn.addEventListener("click", () => openDonationForm());

  return { load, refresh };
})();

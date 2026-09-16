// Checklisten-Tool: Kategorien mit Positionen zum Abhaken.
const Checklist = (() => {
  const container = document.getElementById("checkliste-content");
  const addCategoryBtn = document.getElementById("btn-add-category");

  const DEFAULT_CATEGORIES = [
    { name: "Kleidung", items: ["Winterjacken", "Pullover", "Socken", "Unterwäsche", "Schuhe", "Kinderkleidung"] },
    { name: "Medizin", items: ["Verbandsmaterial", "Schmerzmittel", "Erste-Hilfe-Sets", "Desinfektionsmittel"] },
    { name: "Hygieneartikel", items: ["Windeln", "Damenhygieneartikel", "Zahnpasta & Zahnbürsten", "Seife", "Toilettenpapier"] },
    { name: "Lebensmittel", items: ["Konserven", "Trockennahrung", "Babynahrung", "Wasser", "Tee & Kaffee"] },
    { name: "Sonstiges", items: ["Taschenlampen", "Batterien", "Powerbanks", "Decken", "Schlafsäcke"] }
  ];

  let categories = [];
  let nextItemIdCounter = 1;

  async function seedDefaultsIfEmpty() {
    const existing = await DB.getAll("categories");
    if (existing.length > 0) return;
    for (const cat of DEFAULT_CATEGORIES) {
      const items = cat.items.map((name) => ({ id: nextItemIdCounter++, name, checked: false }));
      await DB.add("categories", { name: cat.name, items });
    }
  }

  async function load() {
    await seedDefaultsIfEmpty();
    categories = await DB.getAll("categories");
    // höchste vergebene Item-Id ermitteln, damit neue Ids eindeutig bleiben
    let maxId = 0;
    categories.forEach((c) => c.items.forEach((i) => { if (i.id > maxId) maxId = i.id; }));
    nextItemIdCounter = maxId + 1;
    render();
  }

  function render() {
    if (categories.length === 0) {
      container.innerHTML = '<p class="empty-state">Noch keine Kategorien. Lege oben eine neue an.</p>';
      return;
    }
    container.innerHTML = categories.map(renderCategory).join("");
  }

  function renderCategory(cat) {
    const itemsHtml = cat.items.map((item) => `
      <div class="checklist-item ${item.checked ? "checked" : ""}">
        <input type="checkbox" data-cat="${cat.id}" data-item="${item.id}" ${item.checked ? "checked" : ""}>
        <span class="checklist-item__label">${UI.escapeHtml(item.name)}</span>
        <button class="icon-btn" data-delete-item="${item.id}" data-cat-del="${cat.id}" title="Position löschen">✕</button>
      </div>
    `).join("");

    return `
      <div class="category-card">
        <div class="category-card__header">
          <h3 class="category-card__title">${UI.escapeHtml(cat.name)}</h3>
          <button class="icon-btn" data-delete-category="${cat.id}" title="Kategorie löschen">🗑</button>
        </div>
        ${itemsHtml || '<p class="empty-state">Keine Positionen.</p>'}
        <form class="add-item-row" data-add-item-cat="${cat.id}">
          <input type="text" placeholder="Neue Position…" required>
          <button type="submit" class="btn btn--secondary btn--small">+</button>
        </form>
      </div>
    `;
  }

  async function saveCategory(cat) {
    await DB.put("categories", cat);
  }

  function findCategory(catId) {
    return categories.find((c) => c.id === catId);
  }

  async function onCheckboxChange(catId, itemId, checked) {
    const cat = findCategory(catId);
    const item = cat.items.find((i) => i.id === itemId);
    if (!item) return;

    if (checked) {
      UI.open({
        title: "Zur Spendenliste hinzufügen",
        bodyHtml: `
          <div class="form-row">
            <label>Position</label>
            <input type="text" value="${UI.escapeHtml(item.name)}" disabled>
          </div>
          <div class="form-row">
            <label>Menge / Beschreibung</label>
            <input type="text" id="f-desc" placeholder="z. B. 3 Kartons, Größe 128" required>
          </div>
        `,
        confirmLabel: "Speichern",
        onConfirm: async () => {
          const desc = document.getElementById("f-desc").value.trim();
          if (!desc) {
            alert("Bitte Menge / Beschreibung angeben.");
            return false;
          }
          await DB.add("donations", {
            category: cat.name,
            description: desc,
            date: UI.todayIso(),
            source: "checkliste"
          });
          item.checked = true;
          await saveCategory(cat);
          render();
          if (window.Tracker) Tracker.refresh();
        }
      });
      // Checkbox visuell zurücksetzen, bis Bestätigung erfolgt ist
      render();
    } else {
      item.checked = false;
      await saveCategory(cat);
      render();
    }
  }

  async function onDeleteItem(catId, itemId) {
    const cat = findCategory(catId);
    cat.items = cat.items.filter((i) => i.id !== itemId);
    await saveCategory(cat);
    render();
  }

  async function onDeleteCategory(catId) {
    if (!confirm("Diese Kategorie inklusive aller Positionen löschen?")) return;
    await DB.delete("categories", catId);
    categories = categories.filter((c) => c.id !== catId);
    render();
  }

  async function onAddItem(catId, name) {
    const cat = findCategory(catId);
    cat.items.push({ id: nextItemIdCounter++, name, checked: false });
    await saveCategory(cat);
    render();
  }

  function onAddCategory() {
    UI.open({
      title: "Neue Kategorie",
      bodyHtml: `
        <div class="form-row">
          <label>Name der Kategorie</label>
          <input type="text" id="f-cat-name" placeholder="z. B. Spielzeug" required>
        </div>
      `,
      confirmLabel: "Anlegen",
      onConfirm: async () => {
        const name = document.getElementById("f-cat-name").value.trim();
        if (!name) return false;
        const newCat = { name, items: [] };
        const id = await DB.add("categories", newCat);
        newCat.id = id;
        categories.push(newCat);
        render();
      }
    });
  }

  container.addEventListener("change", (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      const catId = Number(e.target.dataset.cat);
      const itemId = Number(e.target.dataset.item);
      onCheckboxChange(catId, itemId, e.target.checked);
    }
  });

  container.addEventListener("click", (e) => {
    const delItem = e.target.closest("[data-delete-item]");
    if (delItem) {
      onDeleteItem(Number(delItem.dataset.catDel), Number(delItem.dataset.deleteItem));
      return;
    }
    const delCat = e.target.closest("[data-delete-category]");
    if (delCat) {
      onDeleteCategory(Number(delCat.dataset.deleteCategory));
    }
  });

  container.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-add-item-cat]");
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector("input");
    const name = input.value.trim();
    if (!name) return;
    onAddItem(Number(form.dataset.addItemCat), name);
  });

  addCategoryBtn.addEventListener("click", onAddCategory);

  return { load };
})();

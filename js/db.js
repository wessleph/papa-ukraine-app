// Kleine Promise-Wrapper-Schicht über IndexedDB. Alle Daten bleiben lokal im Browser.
const DB = (() => {
  const DB_NAME = "ukraineHilfeDB";
  const DB_VERSION = 2;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("donations")) {
          db.createObjectStore("donations", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("trips")) {
          db.createObjectStore("trips", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("contacts")) {
          db.createObjectStore("contacts", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("finances")) {
          db.createObjectStore("finances", { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(storeName, mode) {
    const db = await open();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function wrap(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async getAll(storeName) {
      const store = await tx(storeName, "readonly");
      return wrap(store.getAll());
    },
    async get(storeName, id) {
      const store = await tx(storeName, "readonly");
      return wrap(store.get(id));
    },
    async add(storeName, value) {
      const store = await tx(storeName, "readwrite");
      return wrap(store.add(value));
    },
    async put(storeName, value) {
      const store = await tx(storeName, "readwrite");
      return wrap(store.put(value));
    },
    async delete(storeName, id) {
      const store = await tx(storeName, "readwrite");
      return wrap(store.delete(id));
    },
    async count(storeName) {
      const store = await tx(storeName, "readonly");
      return wrap(store.count());
    }
  };
})();

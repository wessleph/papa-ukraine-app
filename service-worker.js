// Stale-while-revalidate Service Worker: App-Shell startet sofort aus dem Cache
// (auch offline), im Hintergrund wird bei bestehender Verbindung automatisch
// aktualisiert. Dadurch ist ein manuelles Hochzählen von CACHE_NAME bei
// Code-Änderungen an bestehenden Dateien nicht mehr nötig. Ändert sich dabei
// eine Datei, meldet der Worker "UPDATE_READY" an die geöffnete App.
const CACHE_NAME = "ua-hilfe-shell-v6";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/db.js",
  "./js/ui.js",
  "./js/checklist.js",
  "./js/tracker.js",
  "./js/finanzen.js",
  "./js/fahrten.js",
  "./js/notfall.js",
  "./js/tour.js",
  "./js/app.js",
  "./icons/icon-48.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-144.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function differs(oldResponse, newResponse) {
  const [a, b] = await Promise.all([
    oldResponse.clone().arrayBuffer(),
    newResponse.clone().arrayBuffer()
  ]);
  if (a.byteLength !== b.byteLength) return true;
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  return x.some((byte, i) => byte !== y[i]);
}

async function notifyUpdateReady() {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage({ type: "UPDATE_READY" }));
}

async function fetchAndCache(cache, request) {
  // cache: "reload" erzwingt einen echten Netzwerk-Request statt einer
  // Antwort aus dem HTTP-Cache des Browsers, damit Änderungen zuverlässig
  // erkannt werden.
  const response = await fetch(new Request(request, { cache: "reload" }));
  if (response.ok) {
    const old = await cache.match(request);
    const changed = old ? await differs(old, response) : false;
    await cache.put(request, response.clone());
    if (changed) await notifyUpdateReady();
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const cachePromise = caches.open(CACHE_NAME);
  const updatePromise = cachePromise
    .then((cache) => fetchAndCache(cache, event.request))
    .catch(() => null);

  // Hält den Service Worker am Leben, bis der Cache im Hintergrund aktualisiert ist.
  event.waitUntil(updatePromise);

  event.respondWith(
    cachePromise.then(async (cache) => {
      const cached = await cache.match(event.request);
      return cached || (await updatePromise) || Response.error();
    })
  );
});

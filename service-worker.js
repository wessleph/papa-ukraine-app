// Stale-while-revalidate Service Worker: App-Shell startet sofort aus dem Cache
// (auch offline), im Hintergrund wird bei bestehender Verbindung automatisch
// aktualisiert. Dadurch ist ein manuelles Hochzählen von CACHE_NAME bei
// Code-Änderungen an bestehenden Dateien nicht mehr nötig.
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      // cache: "reload" erzwingt einen echten Netzwerk-Request statt einer
      // Antwort aus dem HTTP-Cache des Browsers, damit Änderungen zuverlässig
      // erkannt werden.
      const networkFetch = fetch(new Request(event.request, { cache: "reload" }))
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) {
        networkFetch; // Cache im Hintergrund aktualisieren, aber nicht abwarten
        return cached;
      }
      return (await networkFetch) || Response.error();
    })
  );
});

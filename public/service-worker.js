/* eslint-disable no-restricted-globals */
 
const CACHE_NAME = "restaurant-app-shell-v2";
 
const APP_SHELL = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
 
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});
 
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});
 
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
 
  if (request.method !== "GET") return;
 
  const isApiCall =
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin ||
    url.pathname.includes("firestore") ||
    url.pathname.includes("sumup") ||
    url.pathname.includes("mollie");
 
  if (isApiCall) {
    event.respondWith(fetch(request));
    return;
  }
 
  // Navigatie-requests (index.html, dus ook "/") en de root: altijd eerst
  // het netwerk proberen, zodat een nieuwe deploy direct de nieuwe app-code
  // laadt. Val alleen terug op cache als je écht offline bent.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/manifest.json")))
    );
    return;
  }
 
  // Overige statische assets (JS/CSS met hash in de bestandsnaam, icons):
  // cache-first is hier veilig, want een nieuwe build produceert altijd een
  // nieuwe bestandsnaam.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});
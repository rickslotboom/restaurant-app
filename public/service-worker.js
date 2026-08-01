/* eslint-disable no-restricted-globals */

const CACHE_NAME = "restaurant-app-shell-v1";

// Alleen de app-shell cachen. Build-assets (JS/CSS onder /static/) worden
// dynamisch toegevoegd zodra ze voor het eerst opgehaald worden (zie fetch-handler).
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// --- Install: app-shell vooraf cachen ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// --- Activate: oude caches opruimen ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// --- Fetch: strategie bepalen per request ---
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Alleen GET-requests overwegen voor caching; alles anders (POST/PUT/etc.) altijd live.
  if (request.method !== "GET") {
    return;
  }

  // Nooit cachen: API-calls, Firestore, SumUp/Mollie, print-service, of alles buiten je eigen origin.
  // Pas deze lijst aan op jouw daadwerkelijke API-routes.
  const isApiCall =
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin ||
    url.pathname.includes("firestore") ||
    url.pathname.includes("sumup") ||
    url.pathname.includes("mollie");

  if (isApiCall) {
    // Altijd live, geen cache-fallback (orderdata/betaalstatus moet altijd vers zijn)
    event.respondWith(fetch(request));
    return;
  }

  // Voor de app-shell en statische build-assets: cache-first, met network-fallback
  // en automatisch bijvullen van de cache voor nieuwe assets.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline en niet in cache: val terug op index.html voor navigatie-requests
          if (request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    })
  );
});

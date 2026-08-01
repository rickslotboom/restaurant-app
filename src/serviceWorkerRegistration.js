// src/serviceWorkerRegistration.js
// Gebaseerd op het standaard CRA-registratiepatroon, vereenvoudigd.

export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log("Service worker geregistreerd:", registration);

          // Detecteer updates: als er een nieuwe versie van de service worker
          // klaarstaat, kun je de gebruiker vragen om te verversen.
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            installingWorker.onstatechange = () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log(
                  "Nieuwe versie beschikbaar — ververs de pagina om te updaten."
                );
              }
            };
          };
        })
        .catch((error) => {
          console.error("Service worker registratie mislukt:", error);
        });
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}

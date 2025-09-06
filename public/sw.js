// Nome univoco per la cache. Cambialo se fai modifiche importanti al service worker.
const CACHE_NAME = 'joule-calc-cache-v2';

// Elenco delle risorse fondamentali dell'app da mettere in cache subito.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // I tuoi file CSS e JS principali. Assicurati che i percorsi siano corretti.
  '/src/style.css',
  '/src/fonts.css',
  '/src/snap-scroll.css',
  '/src/main.js',
  '/src/dom.js',
  '/src/utils.js',
  '/src/constants.js',
  '/src/modules/calculators.js',
  '/src/modules/history.js',
  '/src/modules/ui.js',
  // Icone e asset principali
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/logo-96x96.png',
  '/sounds/click.mp3'
];

// Evento 'install': si attiva quando il service worker viene installato.
self.addEventListener('install', event => {
  console.log('Service Worker: Installazione...');
  // Aspetta che la cache sia aperta e che tutti i file siano stati aggiunti.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aperta, aggiungo le risorse fondamentali.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Risorse aggiunte alla cache con successo.');
        // Forza l'attivazione del nuovo service worker senza attendere
        return self.skipWaiting();
      })
  );
});

// Evento 'activate': si attiva quando il service worker viene attivato.
self.addEventListener('activate', event => {
  console.log('Service Worker: Attivazione...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Rimuove le vecchie cache che non corrispondono a quella attuale.
          // Questo è fondamentale per aggiornare i file.
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Rimozione vecchia cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        // Prende il controllo immediato di tutte le pagine aperte.
        return self.clients.claim();
    })
  );
});

// Evento 'fetch': intercetta ogni richiesta di rete fatta dalla pagina.
self.addEventListener('fetch', event => {
  // Ignora le richieste che non sono di tipo GET.
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora le richieste a Firebase o altre API esterne per evitare problemi di CORS.
  if (event.request.url.includes('firebase') || event.request.url.includes('google')) {
      return;
  }

  // Applica la strategia "Stale-While-Revalidate".
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Crea una promessa per la richiesta di rete.
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Se la richiesta ha successo, aggiorna la cache con la nuova versione.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            console.error('Service Worker: Fetch fallito; l\'app è probabilmente offline.', err);
            // Se sia la cache che la rete falliscono, potresti voler restituire una pagina di fallback offline.
        });

        // Restituisce subito la risposta dalla cache se presente (Stale),
        // altrimenti attende la risposta dalla rete.
        // La richiesta di rete (fetchPromise) viene comunque eseguita per aggiornare (Revalidate).
        return cachedResponse || fetchPromise;
      });
    })
  );
});

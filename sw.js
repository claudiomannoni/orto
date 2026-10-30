// Service worker: mette in cache i file dell'app per l'uso offline.
// Cambia VERSIONE quando modifichi i file, così i telefoni scaricano quelli nuovi.
const VERSIONE = 'orto-v1';
const FILE = [
  './',
  './index.html',
  './style.css',
  './db.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSIONE).then((cache) => cache.addAll(FILE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pagine: prima la rete (per avere gli aggiornamenti), poi la cache se offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSIONE).then((c) => c.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Altri file: prima la cache, poi la rete.
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

// Service worker: tiene in cache i file dell'app per l'uso offline.
// Nome della cache ed elenco dei file li scrive `node scripts/aggiorna-cache.mjs`
// (da lanciare dopo ogni modifica, insieme all'aumento di APP_VERSIONE in js/versione.js).
const VERSIONE = 'orto-2.4.0';
const FILE = [
  // <<FILE
  './',
  './assets/colture/aglio.svg',
  './assets/colture/cipolla.svg',
  './assets/colture/fave.svg',
  './assets/colture/generica.svg',
  './assets/colture/piselli.svg',
  './assets/colture/spinaci.svg',
  './assets/illustrazioni/vuoto.svg',
  './assets/logo.svg',
  './assets/mascotte/coppia.svg',
  './assets/mascotte/rossella-pensa.svg',
  './assets/mascotte/rossella.svg',
  './assets/mascotte/rosso-ride.svg',
  './assets/mascotte/rosso.svg',
  './css/app.css',
  './css/tokens.css',
  './data/it/colture/aglio.json',
  './data/it/colture/bietola.json',
  './data/it/colture/broccoli.json',
  './data/it/colture/carciofi.json',
  './data/it/colture/carote.json',
  './data/it/colture/cipolla.json',
  './data/it/colture/fave.json',
  './data/it/colture/indice.json',
  './data/it/colture/lattuga.json',
  './data/it/colture/piselli.json',
  './data/it/colture/porri.json',
  './data/it/colture/spinaci.json',
  './data/it/glossario.json',
  './data/it/zone-climatiche.json',
  './i18n/it.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/ai/ai.js',
  './js/ai/gemini.js',
  './js/calendario.js',
  './js/contenuti.js',
  './js/i18n.js',
  './js/main.js',
  './js/motore/luna.js',
  './js/motore/oggi.js',
  './js/screens/benvenuto.js',
  './js/screens/calendario.js',
  './js/screens/colture.js',
  './js/screens/impostazioni.js',
  './js/screens/oggi.js',
  './js/store/backup.js',
  './js/store/dati.js',
  './js/store/db.js',
  './js/store/impostazioni.js',
  './js/ui/foglio.js',
  './js/ui/luna.js',
  './js/ui/mascotte.js',
  './js/ui/nav.js',
  './js/ui/promemoria.js',
  './js/ui/toast.js',
  './js/util.js',
  './js/versione.js',
  './manifest.webmanifest',
  // FILE>>
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
  const richiesta = event.request;
  if (richiesta.method !== 'GET' || new URL(richiesta.url).origin !== self.location.origin) return;

  // Pagine: prima la rete (così arrivano gli aggiornamenti), poi la cache se si è offline.
  if (richiesta.mode === 'navigate') {
    event.respondWith(
      fetch(richiesta)
        .then((risposta) => {
          const copia = risposta.clone();
          caches.open(VERSIONE).then((cache) => cache.put('./index.html', copia));
          return risposta;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Tutto il resto: prima la cache, poi la rete.
  event.respondWith(caches.match(richiesta).then((trovato) => trovato || fetch(richiesta)));
});

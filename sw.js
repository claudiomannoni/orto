// Service worker: tiene in cache i file dell'app per l'uso offline.
// Nome della cache ed elenco dei file li scrive `node scripts/aggiorna-cache.mjs`
// (da lanciare dopo ogni modifica, insieme all'aumento di APP_VERSIONE in js/versione.js).
const VERSIONE = 'orto-2.13.0';
const FILE = [
  // <<FILE
  './',
  './assets/colture/aglio.svg',
  './assets/colture/asparagi.svg',
  './assets/colture/basilico.svg',
  './assets/colture/bietola.svg',
  './assets/colture/broccoli.svg',
  './assets/colture/carciofi.svg',
  './assets/colture/carote.svg',
  './assets/colture/cavolfiori.svg',
  './assets/colture/cetrioli.svg',
  './assets/colture/cipolla.svg',
  './assets/colture/fagiolini.svg',
  './assets/colture/fave.svg',
  './assets/colture/finocchi.svg',
  './assets/colture/generica.svg',
  './assets/colture/lattuga.svg',
  './assets/colture/melanzane.svg',
  './assets/colture/patate.svg',
  './assets/colture/peperoni.svg',
  './assets/colture/piselli.svg',
  './assets/colture/pomodori.svg',
  './assets/colture/porri.svg',
  './assets/colture/prezzemolo.svg',
  './assets/colture/ravanelli.svg',
  './assets/colture/rucola.svg',
  './assets/colture/spinaci.svg',
  './assets/colture/verze.svg',
  './assets/colture/zucche.svg',
  './assets/colture/zucchine.svg',
  './assets/illustrazioni/vuoto.svg',
  './assets/logo.svg',
  './assets/mascotte/accessori/rossella-autunno.svg',
  './assets/mascotte/accessori/rossella-carnevale.svg',
  './assets/mascotte/accessori/rossella-compleanno.svg',
  './assets/mascotte/accessori/rossella-estate.svg',
  './assets/mascotte/accessori/rossella-festa.svg',
  './assets/mascotte/accessori/rossella-halloween.svg',
  './assets/mascotte/accessori/rossella-inverno.svg',
  './assets/mascotte/accessori/rossella-natale.svg',
  './assets/mascotte/accessori/rossella-pasqua.svg',
  './assets/mascotte/accessori/rossella-pioggia.svg',
  './assets/mascotte/accessori/rossella-primavera.svg',
  './assets/mascotte/accessori/rosso-autunno.svg',
  './assets/mascotte/accessori/rosso-carnevale.svg',
  './assets/mascotte/accessori/rosso-compleanno.svg',
  './assets/mascotte/accessori/rosso-estate.svg',
  './assets/mascotte/accessori/rosso-festa.svg',
  './assets/mascotte/accessori/rosso-halloween.svg',
  './assets/mascotte/accessori/rosso-inverno.svg',
  './assets/mascotte/accessori/rosso-natale.svg',
  './assets/mascotte/accessori/rosso-pasqua.svg',
  './assets/mascotte/accessori/rosso-pioggia.svg',
  './assets/mascotte/accessori/rosso-primavera.svg',
  './assets/mascotte/coppia.svg',
  './assets/mascotte/rossella-pensa.svg',
  './assets/mascotte/rossella.svg',
  './assets/mascotte/rosso-ride.svg',
  './assets/mascotte/rosso.svg',
  './css/app.css',
  './css/tokens.css',
  './data/it/battute.json',
  './data/it/colture/aglio.json',
  './data/it/colture/asparagi.json',
  './data/it/colture/basilico.json',
  './data/it/colture/bietola.json',
  './data/it/colture/broccoli.json',
  './data/it/colture/carciofi.json',
  './data/it/colture/carote.json',
  './data/it/colture/cavolfiori.json',
  './data/it/colture/cetrioli.json',
  './data/it/colture/cipolla.json',
  './data/it/colture/fagiolini.json',
  './data/it/colture/fave.json',
  './data/it/colture/finocchi.json',
  './data/it/colture/indice.json',
  './data/it/colture/lattuga.json',
  './data/it/colture/melanzane.json',
  './data/it/colture/patate.json',
  './data/it/colture/peperoni.json',
  './data/it/colture/piselli.json',
  './data/it/colture/pomodori.json',
  './data/it/colture/porri.json',
  './data/it/colture/prezzemolo.json',
  './data/it/colture/ravanelli.json',
  './data/it/colture/rucola.json',
  './data/it/colture/spinaci.json',
  './data/it/colture/verze.json',
  './data/it/colture/zucche.json',
  './data/it/colture/zucchine.json',
  './data/it/glossario.json',
  './data/it/terreno.json',
  './data/it/traguardi.json',
  './data/it/zone-climatiche.json',
  './i18n/it.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/ai/ai.js',
  './js/ai/diagnosi.js',
  './js/ai/foto.js',
  './js/ai/gemini.js',
  './js/calendario.js',
  './js/contenuti.js',
  './js/i18n.js',
  './js/main.js',
  './js/meteo.js',
  './js/motore/luna.js',
  './js/motore/meteo.js',
  './js/motore/oggi.js',
  './js/motore/progressi.js',
  './js/motore/terreno.js',
  './js/motore/vestiti.js',
  './js/screens/benvenuto.js',
  './js/screens/calendario.js',
  './js/screens/colture.js',
  './js/screens/diario.js',
  './js/screens/impostazioni.js',
  './js/screens/oggi.js',
  './js/screens/zone.js',
  './js/store/backup.js',
  './js/store/dati.js',
  './js/store/db.js',
  './js/store/foto.js',
  './js/store/impostazioni.js',
  './js/store/progressi.js',
  './js/store/zone.js',
  './js/ui/bussola.js',
  './js/ui/foglio.js',
  './js/ui/foto-terreno.js',
  './js/ui/foto.js',
  './js/ui/identita.js',
  './js/ui/installa.js',
  './js/ui/luna.js',
  './js/ui/mascotte.js',
  './js/ui/meteo.js',
  './js/ui/nav.js',
  './js/ui/progressi.js',
  './js/ui/promemoria.js',
  './js/ui/terreno.js',
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

# Orto in Tasca

Web app installabile (PWA) che guida chi fa l'orto dalla semina alla raccolta. Il nome è provvisorio.
HTML, CSS e JavaScript semplici: nessun framework, nessuna dipendenza, nessun servizio a pagamento, nessuna chiave nei file.

Cos'è e dove va: `BRIEF.md`. Fasi: `ROADMAP.md`. Formato dei dati: `docs/schema-dati.md`.

## Cosa fa oggi

- Aggiungi colture (nome, varietà, data di semina, semenzaio/orto, note) e vedi i giorni dalla semina.
- Promemoria: apre Google Calendar con l'evento già compilato.
- Dati sul telefono (IndexedDB), con esporta e importa backup in JSON. Chi aveva già colture salvate con la prima versione le ritrova.
- Rossella e Rosso, i due lombrichi mascotte.
- Impostazioni: zona climatica, metodo, esperienza, chiave Gemini (resta sul telefono, mai nel backup).
- Installabile su Android e funzionante offline.

## Struttura

    index.html              pagina unica
    manifest.webmanifest    manifest PWA
    sw.js                   service worker (lo aggiorna scripts/aggiorna-cache.mjs)
    css/                    stile (tokens.css = colori e misure)
    js/                     codice: main, screens/, ui/, store/ (dati), ai/ (IA, separata), contenuti.js
    i18n/it.json            tutte le frasi dell'interfaccia
    data/it/                contenuti agronomici (zone, schede coltura, glossario)
    assets/                 illustrazioni e mascotte (SVG)
    icons/                  icone dell'app
    scripts/                utilità per chi sviluppa
    tests/                  prove automatiche
    .claude/agents/         gli agenti di lavoro

## Provarla in locale

Il service worker funziona solo su `http://localhost` o `https://`: serve un piccolo server. Dalla cartella del progetto:

    python3 -m http.server 8080

Poi apri http://localhost:8080 in Chrome. Per simulare il Pixel 9: DevTools (F12), icona del telefono, 412 x 923.

Per provare un altro giorno: aggiungi `?oggi=AAAA-MM-GG` all'indirizzo (per esempio `http://localhost:8080/?oggi=2026-11-10`).

## Dopo ogni modifica

1. Aumenta `APP_VERSIONE` in `js/versione.js`.
2. Lancia `node scripts/aggiorna-cache.mjs`: aggiorna in `sw.js` il nome della cache e l'elenco dei file offline.

Senza questi due passi il telefono continua a usare i file vecchi.

## Pubblicare su GitHub Pages

Settings, Pages, "Deploy from a branch", branch `main`, cartella `/ (root)`. Tutti i percorsi sono relativi, quindi funziona anche in una sottocartella come `/orto/`.

## Installarla sul Pixel 9

Apri l'indirizzo in Chrome, menu ⋮, "Installa app".

## Dati

I dati stanno solo nel browser di quel telefono. Disinstallare l'app o cancellare i dati del sito li elimina: esporta un backup ogni tanto (Impostazioni, Backup).

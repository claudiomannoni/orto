# BRIEF — Orto AI, il tuo agronomo

Questo documento lo leggono gli agenti prima di ogni compito. Se un compito lo contraddice, vale il brief: segnala il conflitto invece di scegliere da solo.

Il nome «Orto AI» lo ha scelto l'autore il 31/10/2026, perché «Orto in Tasca» esisteva già (lortointasca.it, microgreen). Non si cambia senza il suo sì; prima di vendere va controllato il marchio (UIBM ed EUIPO). Nel codice vive in un solo posto (`i18n/it.json`, chiave `app.nome`, più `manifest.webmanifest`): non scriverlo a mano altrove.

## Cos'è

Web app installabile (PWA) che guida chi fa l'orto dalla semina alla raccolta, come un agronomo sempre con te. Va costruita come un prodotto che un domani si può vendere: ordine, dati puliti, niente scorciatoie che poi costano care.

Primo utente: Claudio, principiante, Pixel 9 (schermo 412 x 923 px), Castelli Romani.

## Stile

- Colorato e giocoso, con illustrazioni originali. Non infantile: deve restare chiaro e serio sui contenuti.
- Pulsanti grandi (minimo 56 px di altezza), distanziati: si usa con le mani sporche, spesso all'aperto, con il sole sullo schermo (buon contrasto).
- Una cosa per schermata, un gesto per volta.
- Testi brevi, in italiano semplice e diretto. Niente giri di parole.

## Mascotte

Due lombrichi rossi californiani (Eisenia fetida), che danno i consigli in coppia e si punzecchiano con simpatia.

- **Rossella**: la scienziata prudente. Spiega il perché, dice onestamente quando le prove sono deboli, non promette quello che non sa.
- **Rosso**: il contadino all'antica. Porta la tradizione ("si è sempre fatto così"), i proverbi, l'esperienza di campo.

Regole delle battute:
- Si punzecchiano, ma mai ridicolizzano l'utente né si insultano davvero.
- Quando scienza e tradizione non coincidono lo dicono entrambi, in poche righe. La scelta è dell'utente.
- Quello che dice Rosso e non ha basi scientifiche è presentato come tradizione ("dice il nonno"), mai come fatto.
- Niente soprannomi per l'utente, niente toni da animatore. Battute brevi.
- Le illustrazioni sono originali. Mai copiare personaggi, mascotte o immagini esistenti.

## Contenuto: insegnare, non solo dire cosa fare

- Per ogni lavoro: il perché, in una o due righe.
- Glossario: ogni termine tecnico (pacciamatura, rincalzare, diradare, trapianto, ecc.) si può toccare e si spiega.
- Più metodi per lo stesso lavoro, con pro e contro: biologico, tradizionale, sinergico. Sceglie l'utente; l'app non impone.
- Principiante: spiegare prima di chiedere. Niente gergo non spiegato.

## Schermate e funzioni (visione completa)

- **Primo avvio guidato**: zona climatica, superficie, acqua disponibile, tempo a disposizione, metodo preferito, esperienza. Tutto modificabile dopo, in Impostazioni. La zona è un'impostazione, mai fissa nel codice.
- **Oggi in campagna** (schermata principale): i 3-5 lavori del giorno, in ordine di importanza, senza che l'utente crei promemoria a mano. Un pulsante facoltativo "Metti nel calendario" apre Google Calendar con l'evento compilato.
- **Zone**: aiuole già coltivate e terreni da preparare. Ognuna con misure, esposizione e profilo del terreno.
- **Diario fotografico** datato, per zona e per coltura.
- **Calendario lunare**: Rosso lo consiglia, Rossella spiega onestamente cosa dice la scienza.
- **Livelli, traguardi, stagioni completate.**
- **IA (Gemini, piano gratuito)**: la chiave la inserisce l'utente nelle impostazioni e resta solo sul suo telefono. Tutto il codice IA sta in un modulo separato (`js/ai/`): un domani passerà a un server con abbonamento senza toccare il resto.

## Dati

- Sul telefono (IndexedDB), con backup in un file JSON (esporta/importa). La chiave IA non va mai nel backup.
- Ogni dato nasce con zona, coltura, data ed esito, in un formato pronto per account e condivisione per zona in futuro. La condivisione, con consenso esplicito, NON si fa adesso: nessun invio di dati, nessun server.
- Formato e campi: `docs/schema-dati.md`.
- Chi ha già colture salvate sul telefono (versione precedente dell'app) non deve perderle: ogni cambio di formato porta una migrazione e si accetta il vecchio backup.

## Lingua

Testi in italiano, ma in file di traduzione: stringhe dell'interfaccia in `i18n/<lingua>.json`, contenuti agronomici in `data/<lingua>/`. Nessuna frase in italiano scritta dentro il codice.

## Contenuti agronomici: niente inventato

- Si usano fonti affidabili (enti pubblici di ricerca e agricoltura, servizi regionali, università, manuali autorevoli). Per ogni dato si cita la fonte che è stata davvero aperta e letta.
- Se un dato non è sicuro si segna (`certezza: "bassa"` e voce in `da_verificare`). Meglio un buco dichiarato che un dato falso.
- Consociazioni, luna e rimedi della tradizione hanno prove deboli: certezza bassa, e Rossella lo dice.
- Dove serve, avvisi di sicurezza (per esempio favismo per le fave).

## Regole tecniche

- HTML, CSS e JavaScript semplici. Niente framework, niente build, niente dipendenze: moduli ES e file statici.
- Percorsi relativi (l'app gira in una sottocartella su GitHub Pages).
- Budget zero euro: GitHub Pages, nessun servizio a pagamento.
- Nessuna chiave o password in nessun file. Il repository è pubblico.
- Niente dati privati dell'autore nel repository (famiglia, lavoro, salute, soldi, ecc.).
- Funziona offline (service worker). Ogni modifica ai file dell'app aumenta `APP_VERSIONE` in `js/versione.js` e lancia `node scripts/aggiorna-cache.mjs`.
- Pensata per Pixel 9: nessuno scroll orizzontale, bersagli di tocco grandi, tema chiaro e scuro.

## Verifica

Nessun "fatto" senza prova: l'app si apre davvero (Playwright a misura di Pixel 9), si provano i flussi e l'offline, si controllano la console e la migrazione dei dati vecchi. Il verificatore riferisce anche i fallimenti.

## Agenti (in `.claude/agents/`, tutti sonnet)

- `agronomo`: banca dati in JSON, con fonti e livelli di certezza.
- `sviluppatore`: scrive il codice.
- `illustratore`: SVG originali, mascotte e illustrazioni.
- `verificatore`: prova l'app prima di ogni "fatto".

Ognuno scrive solo nella sua zona: agronomo in `data/`, illustratore in `assets/`, verificatore in `tests/`, sviluppatore nel resto. Nessuno fa git: i commit li fa chi coordina.

## Non ora

Account utente, forum, server IA con abbonamento, Play Store, condivisione dei dati per zona. Il formato dei dati li permette, ma non si costruiscono.

## Roadmap

`ROADMAP.md`.

# Orto in Tasca — istruzioni per Claude Code

PWA per guidare chi fa l'orto dalla semina alla raccolta. Il nome è provvisorio, in attesa del sì dell'autore. Cos'è, stile, mascotte, regole: `BRIEF.md`. Fasi: `ROADMAP.md`. Formato dei dati: `docs/schema-dati.md`. Come provarla: `README.md`.

## All'avvio: leggi il cervello

Prima di lavorare leggi queste pagine del repository privato `claudiomannoni/CERVELLO`
(sola lettura: non modificarlo mai, nemmeno bordo e log). Rileggile se la sessione è nuova: cambiano.

- `wiki/persone/claudio.md` — chi sono
- `wiki/regole/risposte.md` — come voglio le risposte
- `wiki/regole/metodo.md` — come lavoriamo
- `wiki/vita/campagna.md` — l'orto e la campagna

Se il repository non è nella sessione, aggiungilo in sola lettura e clonalo; se non riesci, dillo prima di andare avanti. Per leggere l'ultima versione senza toccare il clone: `git fetch` e poi `git show FETCH_HEAD:<percorso>`.

## Poi leggi il brief

Prima di ogni compito leggi `BRIEF.md`. Gli agenti in `.claude/agents/` (agronomo, sviluppatore, illustratore, verificatore, tutti sonnet) lo leggono per primo.

## Come rispondermi

- Italiano semplice, diretto, informale. Risposte secche, senza emoji e senza ganci finali.
- Un passo alla volta quando mi guidi in qualcosa. Scelte pratiche: risposta netta, poi decido io.
- Niente invenzioni: se non lo sai, scrivi che non lo sai. Mai promettere ciò che non si può fare.
- Dati che cambiano (versioni, prezzi, date): controlla sul web.

## Regole del progetto

- **Niente chiavi, password o token** in nessun file: il repository è pubblico. La chiave Gemini la inserisce l'utente nell'app e resta sul telefono.
- **Niente servizi a pagamento**: GitHub Pages, IndexedDB, Google Calendar via link, Gemini con piano gratuito.
- **Niente dati privati dal cervello** (famiglia, lavoro, salute, soldi, casa) in questo repository pubblico.
- **Il nome non si cambia senza il mio sì.** Vive in `i18n/it.json` e in `manifest.webmanifest`.
- Niente framework né dipendenze: file statici, moduli ES, percorsi relativi (l'app gira in `/orto/` su GitHub Pages).
- Nessuna frase in italiano scritta nel codice: stringhe in `i18n/it.json`, contenuti in `data/it/`.
- Il codice IA sta solo in `js/ai/`.
- Chi ha già dati sul telefono non li perde: ogni cambio di formato porta una migrazione e il backup vecchio resta importabile.
- Quando cambi un file dell'app, aumenta `VERSIONE` in `sw.js`, altrimenti il telefono resta sulla versione vecchia.
- Commit e push a ogni passo concluso. Chi coordina fa i commit; gli agenti non fanno git.
- «Fatto» vuol dire provato: il verificatore apre l'app (Pixel 9, 412 x 923), prova i flussi, l'offline e la migrazione. I fallimenti si riportano così come sono.
- Per provare un giorno diverso da oggi: aggiungi `?oggi=AAAA-MM-GG` all'indirizzo.

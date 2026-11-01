# Stato del progetto (per chi riprende da un'altra sessione)

Ultimo aggiornamento: 31/10/2026, versione dell'app 2.42.0. Se qualcosa qui non torna con il codice, vale il codice: poi correggi questa pagina.

## In una frase

Orto AI è una PWA statica (nessun build, moduli ES, IndexedDB) per chi fa l'orto in Italia. Online: https://claudiomannoni.github.io/orto/ (GitHub Pages, ramo `main`, ogni push pubblica). Repo: `claudiomannoni/orto`; in locale `C:\Users\pcgameluigi\orto`. Regole del progetto in `CLAUDE.md` e `BRIEF.md`.

## Come si lavora (5 comandi)

```
python -m http.server 8101              # server di prova (o lascialo fare allo script sotto)
node scripts/prova-tutto.mjs            # TUTTI i test, in fondo dice cosa è rosso (serve tests/node_modules: vedi docs/LAVORARE-SUL-PC.md)
node scripts/aggiorna-cache.mjs         # dopo ogni modifica ai file dell'app: aggiorna sw.js
node scripts/controlla-link.mjs .       # apre tutte le fonti (URL) dei contenuti: ROTTO = da riparare; ATTENZIONE 403 = sito che blocca i programmi
node scripts/riepilogo-contenuti.mjs .  # quanto sono completi i dati (semina, giorni, mesi, fonti): dice dove lavorare
node scripts/trova-codice-morto.mjs .   # segnala export, classi CSS e risorse che forse non servono (controllare a mano)
```

Regole che non si dimenticano:
- A ogni modifica aumenta `APP_VERSIONE` in `js/versione.js`, poi `node scripts/aggiorna-cache.mjs` (scrive nome della cache e elenco file in `sw.js`). Senza, il telefono resta sulla versione vecchia.
- Frasi solo in `i18n/it.json` (chiavi piatte, `{param}`, plurali `.uno/.altri`); contenuti in `data/it/*.json`. Niente italiano nel codice.
- Niente emoji, niente invenzioni: ogni dato di contenuto ha fonte e grado di certezza (`alta | media | bassa`, «da verificare»).
- Commit e push a ogni passo concluso con tutti i test verdi. Identità: `git -c user.name="Claudio Mannoni" -c user.email="claudiooo19190@gmail.com"` e riga `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Dopo i test: `git checkout -- tests/schermate` (gli screenshot non vanno committati; `prova-tutto.mjs` lo fa da solo).
- Per provare un altro giorno: `?oggi=AAAA-MM-GG` nell'indirizzo.
- Chiave Gemini: la mette l'utente nell'app, resta sul telefono. Mai in un file.

## Mappa del codice

| Cosa | Dove |
|---|---|
| Avvio, rotte, guida | `js/main.js`, `js/ui/nav.js` (barra e sottorotte), `js/ui/guida.js` |
| Schermate | `js/screens/*.js`: oggi, colture («Il mio orto»), dottore («Fotografa»), calendario, impara, quiz, chiedi, raccolto, cucina, animali, rendita, zone, diario, storia, impostazioni, benvenuto |
| Logica pura (si prova senza pagina) | `js/motore/*.js`: crescita, curiosita, quiz, saluto, raccolto, acqua, resoconto, seguite, meteo, progressi, vestiti |
| Interfaccia riusabile | `js/ui/*.js`: mascotte e vermetto (vermetti disegnati nel codice), vermetto (i vermi disegnati nel codice), meteo, aiuole, condividi, foglio, toast... |
| Intelligenza artificiale | solo `js/ai/*.js`: `ai.js` (unico ingresso), `gemini.js` (provider, riprova se Google è sovraccarico), `diagnosi.js`, `consiglio.js`, `bustina.js`, `ricette.js`, `foto.js` |
| Dati sul telefono | `js/store/*.js` (IndexedDB `orto`, formato in `docs/schema-dati.md`) |
| Contenuti | `data/it/`: colture (27 schede), glossario, zone, terreno, battute, traguardi, consociazioni, quiz + quiz-extra, curiosità, animali (api/vermi/galline), rendita (colture speciali) |
| Prove | `tests/` (UI con Playwright: `01-…28-…`; senza browser: `fase*.mjs`, `quiz*.mjs`, ecc.) |

I vermetti Rosso e Rossella non sono più immagini: sono disegnati in `js/ui/vermetto.js` (corpo a segmenti, sguardo, risata, 11 vestiti stagionali e delle feste). I vermi che giravano sul bordo dello schermo (`vermi-liberi.js`) sono stati tolti alla 2.42; il consiglio utile e il bentornato ora stanno nella vignetta di «Oggi» (`js/motore/consigli-vermi.js`, `js/motore/assenza.js`). Per aggiungere un vestito: nome in `js/motore/vestiti.js` (e le sue battute in `data/it/battute.json`) + il disegno in `VESTITI_DISEGNO` di `vermetto.js` (la prova `fase4-vestiti` controlla che ci sia).

## Com'è fatta l'app oggi (v2.37)

Barra a 5 voci: Oggi, Il mio orto, Fotografa (tondo al centro), Calendario, Impara. «Il mio orto» ha le tessere: zone, diario, storia, raccolto, e (se i contenuti ci sono) Api-vermi-galline e Colture speciali. «Fotografa» = dottore delle piante (fotocamera dentro la pagina + galleria; Gemini). Guida non invasiva: i vermetti spiegano ogni schermata la prima volta (si rivede da Impostazioni).

## Regola di lavoro decisa da Claudio (31/10-1/11/2026)

Usare per primo chi consuma meno crediti (OpenCode, gratis): codice semplice e delimitato, un compito per volta, in un worktree (`git worktree add ../cervello-opencode-<nome> -b opencode/<nome>`) con un prompt in `CERVELLO/agenti/log/`. Chi consuma crediti (Claude, Codex) revisiona, controlla e corregge. Aggiungere dettagli e idee in linea con la lista «Da fare» senza chiedere. Dopo ogni giro: controllare di nuovo, correggere, test verdi, push, mail se c'è del nuovo.

## Organizzazione del lavoro (team)

- **Claude** = direttore: decide, controlla ogni cosa prima di dire «fatto», pubblica, scrive la mail di aggiornamento.
- **Codex** (`codex exec` in un worktree): dati e contenuti con fonti. Script: `C:\Users\pcgameluigi\CERVELLO\agenti\lancia-codex.ps1 <cartella> <prompt.md> <log>`; prompt in `CERVELLO/agenti/log/`. Non fa git: il commit lo fa Claude. Va sempre verificato (accenti persi, fonti dubbie).
- **OpenCode** (gratis, `opencode2.cmd run --auto -m opencode/big-pickle`): codice semplice e delimitato, un compito per volta, sempre da controllare il diff. Mai dati privati.
- **Perplexity** (solo modalità «Ricerca», tramite la sessione «Progetto Cervello orchestrazione»): ricerche di fonti. «Computer» consuma crediti: no senza sì di Claudio.
- Crediti come un'unica fonte, con parsimonia. Il cervello (`C:\Users\pcgameluigi\CERVELLO`, wiki Obsidian) è in sola lettura da questo progetto; la scheda del progetto è `CERVELLO/wiki/progetti/orto-ai.md`.
- Mail di aggiornamento: dal 01/11/2026 UNA sola al giorno alle 7:00, la manda la sessione «Progetto Cervello orchestrazione»; da qui non se ne mandano altre. Tenere aggiornati ROADMAP.md e questo file per il riepilogo.

## Da fare / idee (in ordine di valore)

0. Richiesti da Claudio il 01/11/2026 (vedi ROADMAP «Prossimo»): (a) vignette dei vermi più grandi e carine, con più espressioni e reazioni a ciò che fai; (b) mini gioco antistress a parte (`#/vermi`, entrata dall'icona in testata): trascinare/lanciare, solleticare, far scavare nella terra, dare da mangiare, contatore di minuti di relax; (c) assistenza continua per ogni coltura: seme o piantina, fasi di vita con «cosa fare» e accortezze, esame con foto che confronta fase reale ed età.

1. Prove su telefono vero (Android): fotocamera in pagina, meteo, installazione, vermetti vivi. Finora tutto provato solo con Playwright.
2. Contenuti di api/vermi/galline e colture speciali sono una prima versione prudente: molti calendari mensili vuoti, poche fonti. Ricerca con Perplexity (modalità Ricerca) e riscrittura con Codex, sempre con fonte e certezza.
3. I vermi liberi sul bordo sono stati tolti (davano fastidio, 2.42). Altre idee: reazioni a traguardi, si arrotolano se non apri l'app da giorni. Animazione dei vermetti: portarli anche nelle altre schermate come guida «che cammina»; più reazioni (festeggiano un traguardo, si arrotolano se non si apre l'app da giorni). Eventuale Rive/Lottie solo con un illustratore.
4. Primo avvio più corto (oggi 8 domande, tutte saltabili).
5. Piano visivo dell'orto interattivo (stile Hota), promemoria/notifiche, date di gelo reali (ARSIAL: serve una serie storica; l'ipotesi di Codex è archiviata in `CERVELLO/agenti/archivio/`).
6. IA su PC Asus con modello locale e database aggiornato dal web (provider «server di casa» in `js/ai/ai.js`, tunnel https).
7. Controllo del marchio «Orto AI» (UIBM/EUIPO) prima di vendere; eventuale lingua inglese.

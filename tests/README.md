# Prove automatiche (verificatore)

Script Playwright (Chromium, profilo Pixel 9: 412 x 923, scala 2.625, touch, `it-IT`). Non servono installazioni: Playwright è già disponibile.
Non modificano l'app: scrivono solo qui in `tests/` (screenshot in `tests/schermate/<fase>/`).

## Come rilanciarle

Servi l'app con un server statico (qualunque porta libera) e passa l'indirizzo base:

    python3 -m http.server 8101 --directory <cartella-app> &     # poi fermalo per PID
    export SNAPSHOT=<cartella-app>        # serve a 03 (grep sul codice) e 04 (aggiornamento sw)
    node tests/01-schermate.mjs http://localhost:8101
    node tests/02-flussi.mjs http://localhost:8101
    node tests/03-ia.mjs http://localhost:8101
    node tests/04-offline-sw.mjs http://localhost:8101
    tests/05-segreti.sh <cartella-app>

L'indirizzo si può dare anche con `BASE=...`. Le schermate vanno in `tests/schermate/fase1/` (cambia cartella con `SCHERMATE=...`).
In un colpo solo, con server avviato e fermato da solo: `tests/run-fase1.sh <cartella-app> [porta]`.
Ogni script finisce con exit code 1 se qualcosa fallisce.

## Cosa fanno

| Script | Cosa prova |
|---|---|
| `01-schermate.mjs` | Oggi, Colture, Impostazioni in tema chiaro e scuro: screenshot, scroll orizzontale, bersagli di tocco (>= 44 px, `.btn` >= 56 px), console, immagini caricate, nome lunghissimo |
| `02-flussi.mjs` | aggiungi/ricarica/elimina colture, promemoria Google Calendar (`window.open` intercettato), esporta/importa backup v2, backup v1 `il-mio-orto`, elenco semplice, file non validi, chiave IA mai nel backup, migrazione da database v1 |
| `03-ia.mjs` | modulo IA con `page.route`: POST, URL del modello salvato, intestazione `x-goog-api-key`, messaggi per 400/401/403/404/429/500/rete/risposta vuota. **Risposte simulate: l'API vera non viene contattata.** |
| `04-offline-sw.mjs` | offline dopo il primo caricamento (3 schermate, immagini, JSON, dati, aggiunta offline); aggiornamento del service worker su una copia temporanea dell'app (vecchia cache cancellata, file nuovi, frase nuova) |
| `05-segreti.sh` | grep di chiavi/segreti nei file dell'app |

`lib.mjs` ha le funzioni comuni. Gli script `01` e `02` svuotano il database `orto` del browser di prova (contesti Playwright nuovi, mai il tuo telefono).

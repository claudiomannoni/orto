# Il mio orto — istruzioni per Claude Code

PWA in HTML, CSS e JavaScript semplici per gestire l'orto. Testi in italiano. Come provarla: `README.md`.

## All'avvio: leggi il cervello

Prima di lavorare leggi queste pagine del repository privato `claudiomannoni/CERVELLO`
(sola lettura: non modificarlo mai, nemmeno bordo e log):

- `wiki/persone/claudio.md` — chi sono
- `wiki/regole/risposte.md` — come voglio le risposte
- `wiki/regole/metodo.md` — come lavoriamo
- `wiki/vita/campagna.md` — l'orto e la campagna

Se il repository non è nella sessione, aggiungilo in sola lettura e clonalo; se non riesci, dillo prima di andare avanti.

## Regole del progetto

- **Niente chiavi, password o token** in nessun file: questo repository è pubblico.
- **Niente servizi a pagamento**: solo cose gratuite (GitHub Pages, IndexedDB, link a Google Calendar).
- **Niente dati personali** in questo repository: le informazioni su di me restano nel cervello.
- Niente framework né dipendenze: file statici, percorsi relativi (l'app gira in `/orto/` su GitHub Pages).
- Quando cambi un file dell'app, aumenta `VERSIONE` in `sw.js`, altrimenti il telefono resta sulla versione vecchia.
- «Fatto» vuol dire provato: apri l'app nel browser (viewport 412 × 923, Pixel 9) e verifica quello che hai cambiato.

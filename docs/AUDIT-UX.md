# Audit di interfaccia (02/11/2026)

Fatto guardando le schermate vere a 412 px con 4 colture di prova (basilico trapiantato oggi, pomodori di giugno, fave, prezzemolo). Chi lavora sull'app legga questo file prima di toccare le schermate.

## Cosa non va (in ordine di gravità)

### Il mio orto (`js/screens/colture.js`)
1. Pagina lunghissima (oltre 11 schermate con 4 colture): in alto il suggerimento dei vermi, poi 9 tessere, poi la mappa, poi le colture. L'utente deve scorrere molto per vedere le sue piante.
2. Ogni coltura è una carta alta con 5 pulsanti grandi (Ho annaffiato, Ho raccolto, Apri la pianta, Aggiungi promemoria, Elimina): ripetuti identici per ogni pianta, rumore visivo. «Elimina» è troppo vicino agli altri.
3. Titolo doppio «Il mio orto» + sezione «Il mio orto». Etichetta «0 giorni dalla semina» per una pianta trapiantata oggi.
4. Nessun colpo d'occhio: non si capisce quale pianta ha bisogno di qualcosa oggi (manca uno stato, un colore, la prossima azione).
5. L'avviso di stagione è lungo e occupa metà carta.

### La mia pianta (`js/screens/pianta.js`)
1. Titolo doppio e testo ripetuto: il nome e «Pianta di circa N giorni...» compaiono due volte.
2. Il blocco «fonte seria» è rosso: sembra un errore, invece è un'informazione buona. «Fonti» sta chiuso senza spiegazione.
3. Incoerenza: pomodori di 196 giorni mostrano «Maturazione e raccolto, ciclo 90-110 giorni»: se il ciclo è finito va detto («ciclo concluso»).
4. L'avviso «Fine stagione» è staccato dalla scheda Oggi e dice cose in conflitto con la fase.
5. Manca un riepilogo in cima: stato di salute, fase, età, prossima azione, raccolto previsto.

### Foto e dottore (`js/screens/dottore.js`, `js/ui/diagnosi-blocco.js`)
1. Dopo la foto si vede una diagnosi lunga: manca la sintesi (sana/dubbio/problema), la fase confrontata con l'età e l'elenco «cosa fare ora».
2. Le foto di una pianta non formano una storia leggibile (sequenza nel tempo con confronto).

## Direzione decisa da Claudio (02/11/2026)
- Foto: stato e fase, cosa fare ora, storia per pianta, problemi e rimedi (prudenti, senza prodotti né dosi).
- Il mio orto: tabella colture (coltura, età, fase, prossima azione, salute, raccolto previsto), mappa dell'orto, semaforo salute con filtro, azioni rapide in un tocco.
- Tabelle chiare, più informazioni, più grafica intuitiva.

## Regole per il lavoro
- Stile esistente (`css/tokens.css`, `.btn`, `.card`, `el()` + `t()`), stringhe solo in `i18n/it.json`, nessuna emoji, pulsanti >= 44 px, 360 px senza scroll orizzontale, tema scuro e contrasto già gestiti.
- Nessun dato inventato: ogni informazione viene dalle schede, dalle fasi (`data/it/fasi.json`), da `data/it/stagione.json` o dalla foto, con la certezza dichiarata.
- Prove: aggiorna i test esistenti senza indebolirli e scrivine di nuovi.

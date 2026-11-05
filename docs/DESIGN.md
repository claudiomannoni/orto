# Nuovo disegno di Orto AI (03/11/2026)

Richiesta di Claudio (con tester reale): «ancora caotica: aspetto completamente nuovo, bella, compatta, intuitiva, con tante utilità pratiche». Vale sopra lo stile precedente. Conflitto con `BRIEF.md` (pulsanti >= 56 px, una cosa per schermata): per le RIGHE di elenco e le azioni secondarie l'altezza minima passa a 48 px (zona di tocco comunque >= 48 px); i pulsanti primari restano >= 56 px. Resto del brief (colorato, giocoso ma serio, mascotte Rosso e Rossella, mani sporche, sole, italiano semplice) resta.

## Idea: «la bustina di semi»
Le vecchie bustine di semi italiane: blocchi di colore netti, una figura grande al centro, scritte semplici e robuste. L'app diventa un insieme di bustine e di registro, non una pila di schede bianche arrotondate tutte uguali.
- UN elemento memorabile: la **bustina pianta**, un riquadro con fascia superiore del colore dello stato (verde = tutto bene, ambra = attenzione, pomodoro = urgente), icona grande della coltura, nome in grassetto, una riga di fase/età.
- Tutto il resto è quieto: elenchi a righe con filetto sottile («registro dell'orto»), poche ombre, niente card dentro card.

## Palette (variabili in `css/tokens.css`, chiara e scura)
- foglia chiara (sfondo) `#EEF4EA`, carta `#FFFFFF`, inchiostro `#16261B`, inchiostro 2 `#4A5B4F`
- verde foglia `#2E7D32` (azione principale), verde vivo `#58B04A`
- pomodoro `#D2382B` (urgente), zucca `#E39A12` (attenzione), cielo `#D6ECF7` (acqua/meteo), terra `#6B4430` (testata e dettagli)
- filetti `#CBD9C6`. Scuro: sfondo `#101A13`, carta `#1A2A1F`, inchiostro `#E7F1E4`, stessi accenti schiariti. Contrasto testo/sfondo >= 7:1 (sole).
Sfondo crema e verde scuro piatto della versione vecchia vanno via.

## Tipografia
Un solo stack di sistema (nessun font da scaricare: l'app è offline): `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Scala: 28/22/18/16/14 px; titoli peso 800, interlinea stretta (1.15), corpo 16 px peso 500 interlinea 1.45; numeri con `font-variant-numeric: tabular-nums`. Niente maiuscolo per le etichette (frasi normali), niente trattini lunghi nelle scritte di interfaccia.

## Struttura (compatta)
- **Testata**: bassa (56 px), colore terra, solo titolo della schermata + lente + impostazioni. Il motto «L'agronomo che hai sempre con te» va via dalla testata (resta nelle Impostazioni/Informazioni).
- **Barra in basso**: 5 voci come ora, con la fotocamera centrale, ma più bassa (64 px) e con etichette a 13 px.
- **Oggi** = cruscotto in una schermata (niente scorrimento per le cose urgenti):
  1. striscia del giorno: data, meteo in una riga (icona, min/max, pioggia) a sinistra, a destra un chip «gelo» se serve (rosso, in cima a tutto);
  2. «Da fare ora»: massimo 3 righe con casella da spuntare in un tocco (usa i lavori già calcolati), poi «Altri N» che espande;
  3. «Il tuo orto»: bustine pianta in fila orizzontale scorrevole (snap), toccando si apre la pianta;
  4. «Scorciatoie»: griglia 4 x 1 di icone (Foto, Annaffiato, Raccolto, Appunto) con azione in un tocco;
  5. il resto (consigli, quiz, curiosità, vermi, guide) in «Per te» ripiegato.
- **Il mio orto** = registro: titolo, filtri a pillole (Tutte, Da fare, Urgenti) e pulsante «+ Pianta» fisso in basso a destra; ogni coltura è una RIGA da 64 px (icona 40 px, nome, fase e età su una riga, pallino di stato con testo breve, freccia); toccando la riga si apre la bustina completa nella pagina pianta; scorrere la riga o il menu «…» mostra annaffiato/raccolto/promemoria/elimina (elimina sempre con conferma). Le 9 tessere diventano una riga di «Strumenti» orizzontale scorrevole (Zone, Diario, Raccolto, Semi, Animali, Alberi, Rendita...). La mappa dall'alto sta in una scheda «Mappa» accanto a «Elenco» (due linguette in cima), non sotto.
- **La mia pianta**: in cima la bustina grande (stato, fase, età, prossima azione, raccolto previsto), poi le linguette Oggi, Storia, Scheda, Piano come ora.
- **Impara, Impostazioni, Dottore, Calendario**: stessi nuovi colori, titoli, righe a filetto al posto di molte card; una sola azione primaria per schermata.
- Mascotte: restano, ma più piccole (fumetto a una riga) e ripiegabili; mai sopra le azioni.

## Regole tecniche
- Solo CSS e JS esistenti (`css/`, `js/ui`, `js/screens`); stringhe in `i18n/it.json`; nessuna emoji; nessun font o libreria nuova; niente framework.
- Mantieni tutti gli `id`, le classi usate dai test e i comportamenti: dove un test cerca un elemento, aggiornare il test senza indebolirlo.
- Rispetta `prefers-reduced-motion`; focus tastiera visibile; 360 px senza scroll orizzontale; tema scuro curato.
- Movimento solo come risposta a un gesto (spunta, apertura riga). Niente animazioni all'apertura delle pagine.

# Riparazione delle prove rosse dopo il nuovo aspetto (css/v3.css)

Data: 6 novembre 2026. Server di prova: http://localhost:8130 (avviato dal direttore).

## Perchè erano rosse: tre cause distinte

1. **Caratteri rovinati (doppia codifica)** in 10 file di `tests/` e in 2 file dell'app: le lettere
   accentate, il punto medio (·), le virgolette basse («»), la croce di moltiplicazione (4 × 1,5 m) e l'apice quadrato (m²)
   erano salvati con doppia codifica (Ã¨ al posto di è). Le attese del test non corrispondevano
   più a quello che l'app mostra davvero (che è corretto): i confronti erano sempre falsi.
2. **Attese vecchie**: controlli che descrivevano l'aspetto di prima (testata fissa su "Orto AI",
   palette vecchia, 3 filtri, versione bloccata a 2.63.0).
3. **Difetti veri dell'app** portati dal rifacimento: informazioni che dovevano restare visibili
   sparite dalla pagina, e 4 stringhe di i18n con accenti mangiati («?» al posto delle lettere).

## Difetti veri corretti nell'app

- `i18n/it.json`, 4 stringhe ripristinate: `acqua.salta` (l'annaffiatura), `diagnosi.correzione.domanda`
  (è in fase), `diagnosi.correzione.lascia` (com'è), `diagnosi.correzione.salvata` (Età).
  Si vedeva «La foto dice che ? in fase» e «Lascia com??».
- `js/screens/pianta.js`: il separatore del titolo è di nuovo · (era doppia codifica, visibile in schermata).
- `js/screens/dottore.js`: sistemati solo i commenti con lo stesso difetto.
- `js/screens/colture.js`: la riga compatta de "Il mio orto" dice di nuovo «Trapiantata il <data>»
  per le colture da piantina, con la chiave i18n `coltura.trapiantata_il` che esisteva già.
  Le prove 32-fasi e 38-stagione ne dipendevano.
- `css/v3.css`, due leggi aggiunte: (1) l'avviso di stagione (fuori stagione / fine stagione / gelo)
  si vede di nuovo dentro le righe del registro quando esiste (era nascosto sempre);
  (2) il consiglio sull'acqua resta leggibile nella carta compatta del meteo in Oggi (era nascosto).
  Le righe restano compatte: nessun pannello riaperto, si vede solo quando c'è un avviso.
- `js/screens/oggi.js`: torna la riga con il nome dell'orto («<orto>, di <nome>», classe `.nome-orto`)
  usando il modulo `ui/identita.js`, restato senza usi dopo il rifacimento della testata.

Proibito dal compito e quindi non toccato: `js/versione.js`, `sw.js`, `privato/`, git.

## Prova per prova (le 9 rosse del compito, tutte ora verdi)

- **02-flussi**: 5 rossi, tutti confronti con caratteri rovinati nel test (· nelle attese,
  "la coltura c'è ancora", i messaggi "File non valido: non è un JSON" e i nomi della migrazione).
  Cambiato solo il test (ripristino dei caratteri); l'app era corretta.
- **04-offline-sw**: 7 rossi. La testata non è più «Orto AI» fisso: mostra il titolo della schermata.
  La palette nuova è chiaro rgb(233, 241, 228) / scuro rgb(14, 26, 18). In Impostazioni non ci sono immagini.
  Attese aggiornate; "tutte le immagini caricate" resta obbligato per Oggi e Colture.
- **08-zone**: 2 rossi. Primo: × (4 × 1,5), ² e altri caratteri rovinati nel test (ripristino).
  Secondo: il nome della zona non sta più nella riga della coltura ma nella sezione
  «Il tuo orto dall'alto» sopra la lista: attesa aggiornata (la zona resta visibile nella stessa schermata).
- **14-progressi**: mojibake nelle attese (·): riparato il test, l'app era corretta.
- **23-bustina**: mojibake («profondità» e altri): riparato il test.
- **26-dottore**: i filtri de "Il mio orto" ora sono 4 (aggiunta la vista Mappa): attesa aggiornata
  (4 pulsanti, con Mappa; resta verificata l'aggiunta fissa e la lista in cima).
- **32-fasi**: 2 rossi. «Trapiantata il»: difetto vero, ripristinato in colture.js. Il confronto di fase
  nella diagnosi ora usa il testo nuovo («Per l'età ... dovrebbe essere in ..., ma sembra ancora in ...»): attesa aggiornata
  mantenendo l'essenziale (attesa, osservata, «indietro»).
- **37-struttura**: 3 filtri vs 4 (Mappa): attesa aggiornata.
- **fase5-design**: versione piantata a 2.63.0: ora legge APP_VERSIONE da js/versione.js e controlla che
  sw.js punti alla stessa cache dell'app (controllo valido a ogni versione). Niente versioni innalzate qui.
  Aggiornata anche l'attesa che accetta gli apici attuali dell'etichetta nella barra.

## Prove toccate dal rifacimento e sistemate per coerenza (non nell'elenco rosso)

- **38-stagione**: l'avviso di stagione dentro le righe de "Il mio orto" non si vedeva più
  (css nascondeva sempre lo spazio stagione): v3.css lo fa vedere quando c'è un avviso. 5/5 verdi.
- **06-primo-avvio**: Oggi non mostrava più il nome dell'orto: aggiunta la riga con `etichettaOrto`. 43/43.
- **12-meteo**: «conviene annaffiare» / «puoi saltare l'annaffiatura» era nascosto nella carta
  compatta: v3.css lo lascia visibile. 34/34.
- **20-aiuole**: l'orto dall'alto sta nella vista Mappa di Colture: la prova apre la vista prima di
  controllare. 10/10.
- **31-vermi-gioco**: l'entrata al gioco dei vermi ora sta in Impara (niente più icona in testata,
  come richiede fase5-design): la prova entra da lì. 12/12.

## Prove ricontrollate come chiesto dal compito

01-schermate 86/86, 13-diario 54/54, 22-raccolto 10/10, 28-animali 15/15, 30-semi 10/10,
34-primi-passi 6/6, 35-eccesso 9/9. Tutte verdi.

## Resto della suite rilanciata dopo i cambiamenti

Tutte verdi: 03, 06, 07, 09, 10, 11, 12, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25,
26, 27, 31, 32, 33 (33-piano-pianta), 36, 37, 38, 39, 40, 41; fase2-motore 35/35, fase2-contenuti 1150/1150,
fase2-luna 19/19, fase2-oggi 61/61, fase3-terreno 188, fase3-profilo 25, fase4-vestiti 59, fase4-foto 25;
tutto il blocco fase5 (assenza 58, acqua 53, acqua-fase 11, bustina 21, curiosità 5, crescita 12,
cosa-piantare 18, correzione-eta ok, corda 18, consiglio 10, consigli-vermi 53, da-comprare 30, eccesso 21,
fasi 98, gesto ok, linea-tempo 20, meteo 46, piano 20, primi-passi 17, produzioni 40, progressi 30, quiz 15,
raccolto 30, relax 84, ricerca 6, riconosci 12, ricette 35, resoconto 34, salute ok, saluto 28, seguite 11,
semi 86, stagione 19, util 47); curiosità 826, consociazioni 631, animali-contenuti 250, fasi-contenuti 1327,
quiz 798, quiz-extra 865, mascotte-battute 1840, traguardi 537 (con la cartella app come argomento),
css-bilanciato 3, i18n-chiavi 7.

## Note per il direttore

- `js/versione.js` e `sw.js` come da regola del compito non toccati: al rilascio serve un aumento di
  `APP_VERSIONE` + `node scripts/aggiorna-cache.mjs`, altrimenti i cambi di css/v3.css, i18n/it.json e js
  non arrivano ai telefoni che hanno la cache attiva.
- La cartella `../CERVELLO` non esisteva in questo ambiente: pagine wiki non lette (letti CLAUDE.md, BRIEF.md, compito.md).
- Nessuna prova indebolita: i controlli restano tutti; sono cambiate solo attese rese valide dal nuovo
  aspetto (selettori, testi, colori, pannelli da aprire) e ripristinati caratteri perduti.

# Roadmap

Ogni fase si può usare da sola: finita una, l'app resta utile anche se non si fa la successiva.

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Base: nome, stile, mascotte, struttura del progetto | in corso |
| 2 | Primo avvio guidato + calendario del mese + "Oggi in campagna" + calendario lunare | prova fatta con 5 colture di novembre, più il primo avvio guidato (senza luna); il resto da fare |
| 3 | Zone, misure, bussola, profilo del terreno, diario fotografico | da fare |
| 4 | Diagnosi da foto con Rosso e Rossella (IA) | da fare |
| 5 | Lombrichi e compost, galline, alberi e olivi | da fare |
| 6 | Piano dell'orto con consociazioni e rotazioni | da fare |
| 7 | Meteo (Open-Meteo) | da fare |
| 8 | Diario del raccolto e banca dei semi | da fare |
| 9 | Registro produzione e vendite | da fare |

## Fase 1 — Base

- [x] Colture, promemoria su Calendar, backup e offline della versione precedente, portati nella nuova struttura
- [x] Nome provvisorio "Orto in Tasca" (da confermare: vedi nota sul nome)
- [x] Stile colorato, pulsanti grandi, tema chiaro e scuro
- [x] Mascotte Rossella e Rosso, logo, icone delle prime 5 colture
- [x] Struttura: navigazione, impostazioni, traduzioni, modulo IA separato, formato dati con migrazione
- [x] Backup nuovo formato, accetta anche il vecchio
- [x] Verifica del verificatore su misura Pixel 9 (emulato), offline, migrazione: 182 controlli, difetti trovati e corretti. Da rifare sul telefono vero
- [ ] Prova della chiave Gemini con una chiave vera (non provata: nessuna chiave a disposizione)

## Fase 2 — prova

- [x] 5 colture di novembre per i Castelli Romani (fave, aglio, piselli, spinaci, cipolla). Nessuna fonte è stata ancora consultata: tutto è a certezza "bassa" e l'app lo dice ("Da verificare")
- [x] "Oggi in campagna": al massimo 5 lavori in ordine di importanza, con perché, metodi, glossario, Rosso e Rossella, "Fatto / Non oggi" e "Metti nel calendario"
- [ ] Fonti vere per i dati (serve che la sessione possa aprire siti agricoli: ARSIAL, CREA, servizi regionali)
- [x] Verifica del verificatore sulla fase 2: 431 controlli (motore, contenuti, interfaccia), difetti trovati e corretti
- [x] Primo avvio guidato: sei domande (zona, spazio, acqua, tempo, metodo, esperienza), modificabili in Impostazioni, rifacibile da lì. Prova: `tests/06-primo-avvio.mjs`. Spazio, acqua e tempo per ora si salvano ma il motore non li usa ancora
- [x] Calendario: schermata con i 12 mesi e tutti i lavori della zona nel mese, per tipo (semine, trapianti, cure, lavorazioni, raccolte). Prova: `tests/07-calendario.mjs`
- [x] 27 schede coltura, con lavori in tutti i 12 mesi: 5 di prova, 6 per novembre-dicembre (broccolo, porro, carciofo, carota, lattuga, bietola), 8 per gennaio-aprile (pomodoro, peperone, melanzana, zucchina, patata, asparago, ravanello, rucola) e 8 per maggio-ottobre (fagiolino, zucca, cetriolo, finocchio, cavolfiore, verza, basilico, prezzemolo). Fonti aperte e lette, certezza quasi sempre media (prezzemolo e lattuga bassa). Tutti i calendari sono generali, non specifici per i Castelli: date per quota e microclima, gelo e fabbisogno d'acqua estivo restano da verificare. Gennaio ha solo 2 lavori
- [x] Calendario lunare: fasi calcolate (errore sotto il giorno), sezione "La luna" nel Calendario. Rosso porta la tradizione, Rossella dice che non ci sono prove solide. Prova: `tests/fase2-luna.mjs`
- [x] Icone illustrate per tutte le 27 colture (SVG originali, in `assets/colture/`)
- [ ] Da fare: più colture e più lavori nei mesi scarsi (gennaio), consociazioni e rotazioni con fonti, dati verificati sul gelo e sul clima della zona (ARSIAL, ARPA Lazio)

## Fase 3 — zone, misure, bussola, terreno

- [x] Zone (aiuole e terreni, già coltivati o da preparare) con misure e superficie; le colture si possono legare a una zona. Prova: `tests/08-zone.mjs`
- [x] Esposizione dalla bussola del telefono (sensore su Android, `webkitCompassHeading` su iOS, otto direzioni a tocco se il sensore non c'è) con la nota di Rossella sul sole. **Il sensore vero non è provato: nei test è simulato**
- [x] Profilo del terreno: 7 domande, 10 erbe spontanee indicatrici (certezza bassa), test del barattolo, 9 consigli, 4 fonti. Il profilo (tessitura, acqua, sostanza organica) si ricava dalle risposte; la misura del barattolo vale più delle risposte. Prove: `tests/fase3-profilo.mjs`, `tests/fase3-terreno.mjs`
- [ ] Diario fotografico datato per zona e coltura (serve un nuovo store e una decisione su come metterlo nel backup: le foto pesano)
- [ ] Consigli del terreno dentro «Oggi» e nel calendario (per esempio: terreno argilloso, non lavorare da bagnato)
- [x] **Foto in campo per capire il terreno** (31/10/2026): nel profilo del terreno, «Foto in campo»: si scattano o scelgono fino a 3 foto (terreno da vicino ed erbe spontanee), ridotte a 1024 px prima dell'invio; Rossella (Gemini) propone le erbe che riconosce (collegate a quelle di `terreno.json`, un id inventato non vale) e gli indizi sul terreno; l'utente conferma, mai in automatico, e le proposte contano come un'erba (mezza risposta). Le foto non si salvano. Avviso che vanno a Google (permesso la prima volta), tetto di 10 foto al giorno per non finire la quota, ogni risposta segnata come proposta con «L'IA è poco sicura». Prove: `tests/fase4-foto.mjs`, `tests/11-foto.mjs` (con Gemini simulato). **Non provata con una foto e una chiave vere**
- [x] **Diario fotografico** (31/10/2026): foto datate per zona e coltura, nuovo archivio sul telefono (database v3, migrazione da v2 provata), foto ridotte a 1024 px con miniatura, griglia per mese, filtri, visore con nota, **time-lapse** (play/pausa, più veloce/più lento). Backup normale senza foto; «Esporta backup con foto» le include (file grande), importandolo senza foto quelle del diario restano. Prova: `tests/13-diario.mjs`
- [x] **Diagnosi di piante da foto** (Rossella): dal visore, «Chiedi a Rossella»: dice se la pianta sembra sana, cause possibili con confidenza e cosa controllare; mai prodotti né dosi; sempre «ipotesi da verificare» e rimando a un tecnico (consorzio agrario o servizio fitosanitario). Salvata sulla foto. Stesso tetto di 10 foto al giorno. **Non provata con una foto e una chiave vere**

## Meteo (31/10/2026)

- [x] Meteo in «Oggi» da Open-Meteo (gratuito, senza chiave): oggi, domani e dopodomani, e avvisi per l'orto: gelata (minima da 0° in giù), brina (fino a 3°), pioggia forte (10 mm), caldo (33°), vento (40 km/h). Previsioni salvate sul telefono (non si riscaricano entro 3 ore; senza internet si usano le ultime, con «x ore fa»). Posizione: centro della zona (Frascati, approssimato) o la posizione del telefono arrotondata a circa 1 km, scelta in Impostazioni. Prova: `tests/12-meteo.mjs` (con Open-Meteo simulato), `tests/fase5-meteo.mjs`. **Non provato con il vero Open-Meteo dal telefono**
- [ ] Consigli dell'orto che tengono conto del meteo (per esempio non annaffiare se piove, semine rimandate per il gelo) dentro il motore di «Oggi»

## Vermetti vivi (31/10/2026)

- [x] Vestiti per stagioni e feste: inverno (sciarpa e berretto), estate (occhiali da sole), primavera (fiori e farfalle), autunno (foglie), Halloween (zucca e cappello da strega), Natale, festa (cappellino e coriandoli), pioggia (ombrello). Il vestito del giorno viene dal calendario; in Impostazioni si può scegliere a mano
- [x] Toccandoli saltano e dicono una battuta; a volte si punzecchiano (uno parla, l'altro risponde); al sesto tocco cambiano vestito. Respirano piano, e con «riduci movimento» non si animano
- [x] Battute: 16 generiche per ciascuno, 6 per stagione o festa, 5 per il cambio d'abito, 8+ scambi (`data/it/battute.json`, scritte da Codex e ritoccate). Prove: `tests/fase4-vestiti.mjs`, `tests/09-vermetti.mjs`, `tests/mascotte-battute.mjs`
- [x] Altri vestiti: Pasqua (orecchie da coniglio e uovo, da giovedì santo a Pasquetta), Carnevale (cappello da giullare, da giovedì a martedì grasso), compleanno dell'orto (un anno dopo il primo avvio, cappellino e palloncino). Quando tocchi «Fatto» un vermetto compare in basso e fa i complimenti (12 battute per ciascuno, 5 scambi)
- [x] I vermetti prendono l'ombrello quando piove (secondo il meteo; le feste battono la pioggia, e se scegli un vestito a mano resta quello)
- [x] **Livelli e traguardi**: 10 livelli e 36 traguardi (lavori fatti, colture, zone, terreno capito, foto, diagnosi, giorni attivi, giorni di fila, stagioni), punti da lavori, colture, zone, foto e traguardi. Carta del livello in «Oggi», foglio con l'elenco; quando si sblocca qualcosa i vermetti festeggiano con battute apposite. Chi usava già l'app prende i traguardi che aveva già senza una festa per tutti insieme. Prova: `tests/14-progressi.mjs`, `tests/fase5-progressi.mjs`
- [ ] Battute che commentano le colture dell'utente, nuovi vestiti ogni tanto
- [ ] Date vere del gelo: servono le serie giornaliere della stazione ARSIAL di Velletri (320 m); le fonti trovate finora confermano la stazione ma non danno le date

## Futuro, non ora

Account, forum, server IA con abbonamento, Play Store, condivisione dei dati per zona (solo con consenso).

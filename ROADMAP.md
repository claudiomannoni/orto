# Roadmap

Ogni fase si può usare da sola: finita una, l'app resta utile anche se non si fa la successiva.

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Base: nome, stile, mascotte, struttura del progetto | fatta |
| 2 | Primo avvio guidato + calendario + «Oggi in campagna» + calendario lunare, 27 colture | fatta (dati da verificare con fonti locali) |
| 3 | Zone, misure, bussola, profilo del terreno, diario fotografico | fatta |
| 4 | Dottore delle piante (diagnosi da foto con IA) | fatta (provata col telefono: fotocamera in pagina dalla 2.35.2) |
| 5 | Meteo, quiz, curiosità, raccolto, ricette, bustina, resoconto, traguardi | fatta |
| 6 | Api, vermi e galline; colture speciali e da rendita | prima versione (2.37), contenuti da ampliare |
| 7 | Piano visivo dell'orto, notifiche, IA su PC Asus, registro vendite | da fare (vedi `docs/STATO.md`) |

## Fase 1 — Base

- [x] Colture, promemoria su Calendar, backup e offline della versione precedente, portati nella nuova struttura
- [x] Nome «Orto AI» (31/10/2026: «Orto in Tasca» esisteva già, lortointasca.it). Da fare prima di vendere: controllare il marchio (UIBM ed EUIPO)
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

## Un'app da cui non si esce (31/10/2026, v2.14.0)

Partita da una ricerca (`docs/ricerca/utenti-app-orto.md`: 19 pagine, forum e recensioni) su cosa fa restare chi coltiva. Scelte:

- Navigazione: quattro voci (Oggi, Calendario, Colture, Impara); le impostazioni sono nell'ingranaggio in testata; Zone, Diario e Storia si raggiungono da Colture.
- Impara: ricerca tra le colture e il glossario; ogni coltura ha una scheda con mesi (striscia leggibile anche senza colori), lavori, amiche e nemiche (`data/it/consociazioni.json`, 59 coppie, certezza bassa, con fonti), rotazione, fonti e «da verificare».
- «Segui questa coltura» (anche nel primo avvio, come ottavo passo): Oggi e Calendario mostrano i lavori delle colture seguite e di quelle messe in orto.
- Accessibilità: testo grande e molto grande, contrasto alto, meno movimento, pulsante «Ascolta» (voce del telefono); colori del tema chiaro scuriti per il contrasto WCAG.
- La mia storia: cronologia di lavori, foto e note libere, con filtri ed esportazione CSV.
- «L'ho fatto un altro giorno»: il lavoro si registra con la data vera (mai nel futuro).
- Oggi più corta: testi dei vermetti accorciati, scheda di installazione in fondo.

Rimandato, in ordine: Oggi che tiene conto del meteo (pioggia/gelo cambiano i lavori), piano visivo delle aiuole, quantità raccolte, scheda da condividere, date vere di gelo (stazione ARSIAL di Velletri), prove su telefono vero (foto con Gemini, meteo, bussola), controllo marchio «Orto AI» (UIBM/EUIPO).

## Giocare e chiedere (31/10/2026, v2.15.0)

- Oggi tiene conto del tempo: sotto un lavoro compare un consiglio (gelo o brina per semine e trapianti, pioggia per l'annaffiatura, terreno fradicio dopo pioggia forte, caldo, raccolta sotto la pioggia). Il lavoro non sparisce mai: dice solo «aspetta» o «attenzione» (`consiglioMeteo` in `js/motore/meteo.js`).
- Quiz dell'ortolano (`#/quiz`): cinque domande al giorno uguali per tutti (seme = la data), una partita al giorno, serie di giorni di fila, spiegazione dopo ogni risposta. Domande in `data/it/quiz.json`, con fonte.
- Chiedi a Rossella (`#/chiedi`): domanda libera a Gemini con il contesto dell'orto (zona, mese, colture, tempo di oggi). Solo testo, consenso la prima volta, tetto di 20 domande al giorno, risposta con livello di certezza e «da controllare»; niente prodotti né dosi.

- Vermetti con occhi vivi (`js/ui/occhi.js`): pupille che seguono il dito, sguardi tra loro, palpebre; Rosso ride a occhi chiusi al tocco (2.16).
- Oggi riordinata: meteo e lavori in alto, vermetti e progressi sotto (2.17).
- «Condividi il mio orto»: figurina PNG (livello, numeri, vermetti) col foglio di condivisione del telefono, o scaricata (2.18).

- Quattro traguardi del quiz (2.20).
- «Il tuo orto dall'alto» in Colture: le zone come aiuole, con la crescita stimata di ogni coltura (2.21). Solo 7 schede su 27 hanno i giorni alla raccolta: le altre mostrano «Seminata da N giorni» (da completare con fonti).
- «Lo sapevi?» in Oggi: 90 curiosità con fonte (Codex), una al giorno (2.22). Domande suggerite di «Chiedi a Rossella» scelte dalla ricerca di Perplexity sulle domande più frequenti dei forum.

- Saluto del giorno (OpenCode), glossario a 71 termini (Codex), giorni alla raccolta per 15 colture (Codex, fonti estere, certezza bassa), 120 domande di quiz (2.26-2.27).
- «Il mio raccolto»: si segna quanto si raccoglie (anche subito dopo un lavoro di raccolta in Oggi), totali per coltura e per mese; compare nella storia (2.28, modulo OpenCode).
- Pioggia e annaffiature: la carta meteo di Oggi dice quanta pioggia è caduta negli ultimi 7 giorni e se conviene annaffiare (2.29, modulo OpenCode; soglie indicative, da affinare).
- Prossimi, in ordine scelto da Claudio: foto della bustina dei semi, «cosa cucino?», resoconto della settimana. L'IA su PC Asus con modello locale è per dopo.

- Leggi dalla bustina dei semi (2.30), Cosa cucino? (2.31), La mia settimana con figurina da condividere (2.32): tutti e tre con moduli scritti da OpenCode, controllati e collegati da Claude. Le funzioni con IA usano Gemini e chiedono il consenso la prima volta.

## Riordino dell'app (31/10/2026, v2.34.0)

Dopo aver guardato come sono fatte le app di piante e orto di successo (cure e promemoria che fanno tornare ogni giorno, diagnosi da foto come funzione-gancio, navigazione semplice con la fotocamera al centro, aiuole viste dall'alto, niente muro di pagamento prima del valore):

- Barra a cinque voci: Oggi, Il mio orto, Fotografa (tondo al centro), Calendario, Impara. Le impostazioni restano nell'ingranaggio.
- «Fotografa» = il dottore delle piante: foto, analisi di Rossella (cosa vede, cause possibili con certezza, cosa controllare), salvataggio facoltativo nel diario; da lì anche terreno, bustina dei semi, foto per il diario.
- «Il mio orto» è la pagina di tutto ciò che è tuo, a sezioni: nuova coltura, quattro tessere (zone, diario, storia, raccolto), orto dall'alto, elenco delle colture.
- Corretto un difetto grafico: una classe CSS `barra` del grafico del raccolto copriva la barra di navigazione (diventava verde). Ora c'è un controllo nel test 26 che la barra resti chiara.

## DIREZIONE STRATEGICA (01/11/2026): ecosistema produttivo locale con marketplace

Priorità assoluta indicata da Claudio: far evolvere Orto AI in una piattaforma che collega orto, frutteto, lombricoltura, galline, api, raccolti, consumi, eccedenze, scambi e vendite, con una rete locale di utenti (annunci di vendita, scambio e regalo, richieste, profilo produttore, ricerca per distanza). Si lavora **per fasi con approvazione**: Fase 1 analisi e progettazione (`docs/ECOSISTEMA.md`, consegnata, in attesa di approvazione), Fase 2 modello produttivo unificato (lotti + movimenti), Fase 3 marketplace MVP, Fase 4 backend e sincronizzazione (Supabase, da confermare), Fase 5 test e rilascio. Non si sviluppano ora pagamenti, chat, baratto triangolare, matching avanzato, reputazione complessa, logistica. Il resto di questa roadmap resta valido ma passa dopo.

## Prossimo, richiesto da Claudio (01/11/2026): assistenza continua per ogni coltura

- Alla creazione di una coltura si sceglie **seme o piantina** (oggi c'è solo la data di semina); cambia il conto dell'età e delle fasi.
- Ogni coltura ha **fasi di vita** (per esempio: germinazione, piantina, crescita, fioritura, maturazione, raccolto). Per ogni fase una scheda «cosa fare» e le **accortezze di quel periodo** (acqua, luce, concimazione, tutori, diradamento, difese...), con fonte e certezza come ogni altro dato.
- Nel report (Oggi e scheda della coltura) compare sempre il **«cosa fare in questa fase»** della fase in cui la pianta si trova adesso, calcolato dall'età (giorni dalla semina o dal trapianto) e aggiornato man mano che cresce e matura.
- Ogni coltura si può **esaminare con una foto**: l'IA stabilisce la fase reale e la salute reale, e le confronta con la fase attesa per l'età («secondo l'età dovrebbe essere in fioritura, sembra ancora in crescita: ...»). La foto resta nel diario di quella coltura.
- Come si fa: dati delle fasi per coltura (Codex, con fonti; prima le 12-14 colture più comuni), modulo puro per fase-da-età (OpenCode), campo `partenza: 'seme' | 'piantina'` nelle colture (migrazione dati, backup vecchio sempre importabile), prompt di diagnosi con fase attesa. Parte dal modulo `js/motore/crescita.js` che già stima la crescita.

**Aggiornamento 2.55 (Fase 2 dell'ecosistema, parte 1):** database passato alla versione 4 con i lotti di produzione e i movimenti; i raccolti e l'eccesso di prima diventano lotti senza cancellare niente (migrazione una tantum, idempotente); un nuovo raccolto scrive anche il lotto; backup di formato 3 (che ricostruisce i lotti dai backup vecchi); registro delle categorie con le informative sulla vendita basate sulla ricerca normativa (ricerca prevalentemente «non trovato», dichiarato). Modulo di calcolo di Codex dopo due tentativi falliti degli agenti gratuiti (Kilo: timeout e scritture malformate), provato con 40 controlli di Claude. Mancano nella Fase 2: la vista «Disponibilità» al posto di «Il tuo eccesso», «Registra produzione» per tutte le categorie, consumi e riserve.

**Aggiornamento 2.54:** «Il tuo eccesso» (diario del raccolto che avanza: regalato, scambiato, venduto, con lo spreco evitato; nessun prezzo e nessuna regola dettagliata, come scelto; la bacheca fra utenti è rimandata a quando in una zona ci sono abbastanza persone, spiegata nella pagina). Il modulo di Kilo aveva due difetti trovati dalle prove di Claude (data valida scartata per il fuso orario; quantità enorme scartata invece che limitata) e li ha corretti Claude.

**Aggiornamento 2.53:** «I tuoi primi passi» in Oggi (sei cose da provare, il vermetto indica la prossima; modulo di Kilo nemotron); acqua per fase di ogni coltura unita al tempo di oggi («oggi annaffia / controlla / poca / niente»); raccolta e conservazione di 20 colture da fonti italiane (Regione Emilia-Romagna, Università di Bologna, CREA, ISS); fumetti di nozioni sui lombrichi e sulla lombricoltura nel giardino dei vermi.

**Aggiornamento 2.51 (utilità pratica):** nel piano dell'orto «Cosa posso piantare qui adesso?» (colture seminabili questo mese, con amiche/nemiche già presenti, rotazione per famiglia negli ultimi 12 mesi e quante piante entrano in 1 mq); nella banca dei semi la lista della spesa (seminabili ora e senza bustina, solo colture seguite) e i semi da rinnovare (5 anni o più); avviso di aggiornamento dell'app. Moduli: Kilo Code (nemotron 550b) e Kilo auto; bug del modulo trovato dalla prova scritta da Claude (la certezza è una parola, non un numero).

**Aggiornamento 2.49:** piano visivo dell'aiuola (trascina le colture nell'aiuola in scala, vicini amici/nemici dalle consociazioni con la loro certezza; moduli di Codex e prova sua) e storia di ogni pianta (foto in fila con fase, salute, andamento). OpenCode gratuito non rispondeva (fermo su «build»): scala degli errori applicata, Codex ha fatto i due moduli.

**Aggiornamento 2.48:** fasi di vita per 22 colture (aggiunte rucola, ravanelli, spinaci, zucche, broccoli, cavolfiori, verze, porri, bietola, aglio; restano finocchi, asparagi, carciofi, basilico, prezzemolo); schede degli alberi da frutto e della vite (10 specie, Codex) con potatura e impollinazione ma senza calendario mensile (nessuna fonte trovata: da completare); date e ordine alfabetico seguono la lingua (pronto per l'inglese).

**Fatto (2.45) il primo passo dell'assistenza continua:** scelta «da seme / da piantina» nelle nuove colture (la data diventa quella di trapianto e all'età si somma quella tipica della piantina); `data/it/fasi.json` con le fasi di vita di 12 colture (Codex, 6 fonti universitarie estere, certezza media/bassa; l'inizio del raccolto è allineato ai giorni alla raccolta della scheda); in «Oggi» un blocco per ogni pianta con fase, «cosa fare adesso», accortezze del periodo e fonti; «Esamina con una foto» apre il dottore con la coltura scelta e chiede a Gemini in che fase sembra essere, confrontandola con quella attesa per l'età. Moduli: `js/motore/fasi.js` (OpenCode glm), test dei dati (OpenCode deepseek). Da fare: fasi per le altre 15 colture, mostrare la fase anche nella carta della coltura e nella scheda, promemoria al cambio di fase, ricontrollo dopo la prova su telefono vero.

## Dalla 2.35 alla 2.37 (31/10/2026)

- Foto: la fotocamera si apre dentro l'app (prima su Android la pagina si chiudeva e la foto andava persa); galleria; se Google è sovraccarico (503) l'app riprova e prova un altro modello (2.35.1-2.35.4).
- Vermetti vivi: due vermi a segmenti che strisciano, guardano il dito e saltano nel palco di «Oggi» (2.36-2.37.0); guida non invasiva al primo accesso a ogni schermata (2.36).
- Schede «Api, vermi e galline» e «Colture speciali» (zafferano, funghi, fiori edibili, varietà rare, aromatiche): contenuti di Codex con fonti, certezza dichiarata, molti campi «da verificare» (2.37.0).
- Rosso e Rossella sono ora disegnati nel codice ovunque (conversazioni, battute flash, impostazioni, figurina da condividere), con 11 vestiti; tolte le vecchie immagini e `occhi.js` (2.37.2).
- Vermi liberi (2.38): niente più finestrella; Rosso e Rossella girano sul bordo dello schermo sopra la barra, scavano, vanno sotto terra e escono altrove; saltano fuori quando l'app festeggia.
- Vermi più utili e discreti (2.39): Rosso (rosso scuro, sopracciglia folte) e Rossella (rosa, occhiali, ciglia, fiocco) si distinguono; diventano trasparenti e lasciano passare i tocchi sopra icone e testo; ogni tanto dicono un consiglio utile e cliccabile (lavori di oggi, pioggia, quiz, curiosità, foto). Modulo dei consigli scritto da OpenCode (gratis), controllato da Claude.
- Vermi che dormono (2.40): se manchi da una settimana i vermi dormono (con le zeta) e si svegliano al primo tocco; il bentornato dice quanti giorni sono passati. Modulo assenza scritto da OpenCode glm (gratis).
- Banca dei semi (2.41): bustine con anno e quantità, «da seminare questo mese», avviso sui semi datati (nessuna promessa sulla germinazione); modulo di OpenCode deepseek, schermata di Claude. Dati di semina (profondità e distanze) compilati da Codex per 16 colture con fonti, certezza media/bassa; 6 colture restano senza dati.
- Gioco dei vermi a tutto schermo (2.46): niente testata né barra, tasto Esci, vermi più grandi, presa più larga per le dita, un tocco sulla terra manda un verme a scavare. Trovato e corretto un difetto del CSS (una graffa lasciata aperta faceva sparire tutte le regole dopo, anche touch-action: per questo sul telefono il dito scorreva la pagina invece di trascinare); ora c'è una prova che controlla le graffe.
- Vignette più grandi e più carine (2.44): vermi 104 px con occhi grandi e luminosi, sei espressioni (contento, pensa, sorpreso, triste, arrabbiato, ride), bocca che si muove mentre parlano, reazioni (festa: ridono e saltano; pioggia: Rosso sorpreso); Rossella con occhiali blu e fiocco, Rosso con sopracciglia folte.
- Giardino dei vermi (2.43): gioco antistress a parte (icona in testata): si trascinano e lanciano i vermi, si solleticano con un tocco, si infilano nella terra in sezione, si nutrono con foglie e compost; contatore di minuti di relax. Fisica corda (OpenCode deepseek) e conto minuti (OpenCode glm), schermata di Claude.
- Tolti i vermi che giravano sul bordo (2.42): davano fastidio. Il consiglio utile e il bentornato ora parlano nella vignetta di Oggi. In arrivo: vignette più grandi e carine con più espressioni, e un mini gioco antistress a parte (trascina, lancia, solletica, scava, dai da mangiare, minuti di relax).
- Pulizia: eliminati i worktree di Codex, aggiunti `docs/STATO.md` e `scripts/prova-tutto.mjs` (2.37.4).

## Futuro, non ora

Account, forum, server IA con abbonamento, Play Store, condivisione dei dati per zona (solo con consenso).

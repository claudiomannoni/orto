# Orto AI come ecosistema produttivo locale: analisi e proposta (Fase 1)

Documento tecnico condiviso. Stato: **proposta da approvare**, nessun codice è stato cambiato. Scritto il 01/11/2026 sulla versione 2.54.0, leggendo il codice, non per supposizione.
Chi lo legge: Claudio (decide), Claude (architetto e revisore), Codex (implementatore e verificatore), gli agenti gratuiti OpenCode e Kilo Code (moduli piccoli), altre sessioni che riprendono il lavoro.

## 0. La direttiva, adattata alle nostre regole

Obiettivo: Orto AI diventa un ecosistema in cui orto, frutteto, lombricoltura, galline, api, raccolti, consumi, eccedenze, scambi e vendite sono **un unico flusso di dati**, con una rete locale di utenti. Non si ricostruisce niente: il progetto attuale resta la base.

Come lavoriamo (regole del progetto, valide per ogni fase):
- **Claude** = architetto, coordinatore, revisore. Controlla ogni cosa prima di dire «fatto», scrive le prove dei casi limite, pubblica.
- **Codex** = implementatore e verificatore tecnico dei pezzi grandi e dei dati con fonti (schema SQL, regole di sicurezza, motore di sincronizzazione, ricerche normative); non fa git, i commit li fa Claude.
- **Agenti gratuiti** (OpenCode glm/deepseek, Kilo nemotron/kilo-auto) = moduli puri e delimitati (calcolo delle quantità, validatori, ordinamenti) con un solo file da creare. **Le prove le scrive Claude**, con casi che l'agente non ha visto (già successo: hanno trovato difetti veri nei moduli degli agenti). Scala degli errori: prima un altro modello gratuito, poi Codex, Claude per ultimo.
- **Perplexity** (modalità Ricerca) solo se Claudio lo dice: serve per la normativa.
- Regole fisse: niente invenzioni (ogni dato di contenuto con fonte e certezza); niente emoji; ogni passo concluso = prove verdi (`node scripts/controllo-veloce.mjs`), versione aumentata, commit, push; nessuna chiave segreta in nessun file; i dati personali restano sul telefono salvo scelta esplicita; l'app personale funziona senza account e senza connessione.
- **Porte di approvazione**: si procede per fasi, e alla fine di ogni fase Claudio approva prima della successiva. Una fase con problemi strutturali non si chiude.

Cosa NON si fa adesso (come da direttiva): pagamenti, chat complessa, baratto triangolare, matching avanzato, reputazione complessa, logistica e spedizioni. L'architettura lascia i punti d'innesto (sezione 5 e 8).

## 1. Stato reale del progetto

- **App**: PWA statica italiana, nessun build e nessuna dipendenza npm (moduli ES, file serviti così come sono), pubblicata su GitHub Pages dal ramo `main`. Versione **2.54.0**, circa **8.400 righe di JavaScript**: 23 schermate (`js/screens`), 26 moduli di logica pura (`js/motore`), 7 moduli di dati (`js/store`), 27 moduli di interfaccia (`js/ui`), 7 moduli IA (`js/ai`).
- **Dati sul telefono**: IndexedDB `orto` versione 3, cinque archivi: `colture`, `impostazioni`, `zone`, `eventi`, `foto` (le foto sono Blob JPEG). Le `impostazioni` sono un archivio chiave-valore con **35 chiavi predefinite**; molte funzioni nuove vi tengono la loro lista (`semi`, `eccesso`, `relax`, `traguardi`, `quiz_risultati`...).
- **Contenuti** (`data/it`, 15 file): 27 schede coltura, fasi di vita di 22 colture, raccolta e conservazione di 20, consociazioni, glossario, quiz, curiosità, alberi (10), animali (3), colture speciali (6), terreno, traguardi, battute.
- **IA**: Gemini con la chiave dell'utente (resta sul telefono, mai nei backup); foto, domande, bustina dei semi, ricette.
- **Offline**: service worker con cache `orto-<versione>`, elenco dei file generato da `scripts/aggiorna-cache.mjs`; avviso «Aggiorna ora» dalla 2.50.
- **Prove**: 78 gruppi automatici (browser simulato con Playwright e moduli puri in Node), lanciati da `node scripts/controllo-veloce.mjs`.
- **Rete**: l'unico traffico esterno è verso Google (Gemini) e Open-Meteo (meteo); **nessun backend nostro, nessun account**. Esiste già `coltivatore_id` (identificativo anonimo creato la prima volta e tenuto sul telefono, descritto nello schema come «serve solo se un giorno ci saranno account o scambi») e il campo `eventi.condivisibile: false`, riservato a una futura condivisione.
- **Documenti di riferimento nel repo**: `CLAUDE.md`, `BRIEF.md`, `ROADMAP.md` («Futuro, non ora: account, forum, server IA con abbonamento, condivisione dei dati per zona, solo con consenso»), `docs/schema-dati.md`, `docs/STATO.md`, `docs/CONTROLLO.md`.

## 2. Funzionalità già disponibili (rilevanti per l'ecosistema)

| Area | Cosa c'è | Dove | Come registra i dati |
|---|---|---|---|
| Orto | colture da seme o piantina, zone con misure, piano visivo dell'aiuola, fasi di vita con «cosa fare», acqua per fase, storia delle foto di ogni pianta | `colture.js`, `zone.js`, `piano.js`, `pianta.js`, `fasi-pianta.js` | archivi `colture`, `zone`, `foto` |
| Frutteto | schede di 10 alberi (potatura, impollinazione) | `alberi.js` | sola lettura (contenuti) |
| Raccolto | segnare chili, grammi o pezzi di una coltura; totali per coltura e mese | `raccolto.js`, `raccolto-form.js`, `motore/raccolto.js` | **eventi** con `tipo: 'raccolto'`, `quantita`, `unita` (kg, g, pezzi), `nomeColtura`, `colturaId`, `schedaId`, `zonaId` |
| Eccesso | segnare cosa avanza, stato regalato/scambiato/venduto, spreco evitato | `eccesso.js`, `motore/eccesso.js` | **lista dentro le impostazioni** (`impostazioni.eccesso`) |
| Semi | banca dei semi, lista della spesa, semi da rinnovare | `semi.js` | lista dentro le impostazioni (`impostazioni.semi`) |
| Allevamenti | schede di lombricoltura, api, pollaio (obblighi, errori, fonti) | `animali.js` | **solo lettura: non si registra alcuna produzione** (uova, miele, humus, lombrichi) |
| Colture speciali | zafferano, funghi, fiori edibili, varietà rare | `rendita.js` | sola lettura |
| Cucina | ricette dagli ingredienti raccolti (IA) | `cucina.js` | legge i raccolti |
| Condivisione | figurina PNG (livello, numeri) e settimana | `condividi.js`, `resoconto.js` | non esce dati: genera un'immagine |
| Gioco e guide | quiz, giardino dei vermi, primi passi, fumetti | vari | impostazioni |
| Sicurezza dati | backup JSON (formato 2, foto facoltative) e ripristino, compatibile con il formato 1 | `store/backup.js` | `colture`, `zone`, `eventi`, `foto` + tutte le impostazioni tranne la chiave Gemini (quindi anche `semi` ed `eccesso`, che non sono archivi propri) |

## 3. Funzionalità mancanti rispetto alla direttiva

1. **Un modello unico delle produzioni.** Oggi il raccolto è un evento, l'eccesso una lista nelle impostazioni, i semi un'altra lista: **tre modi diversi** di registrare quantità, senza collegamento (se segni 20 kg raccolti e poi 5 kg di eccesso, i due dati non si parlano; il rischio di inserirli due volte c'è già).
2. **Produzioni non vegetali**: nessun registro di uova, miele, humus, lombrichi, compost, piantine prodotte.
3. **Consumi, riserve, disponibilità** per quantità: non esistono.
4. **Marketplace**: annunci, richieste, profilo, ricerca locale, categorie con regole. Esiste solo «Il tuo eccesso» come diario personale (2.54) e la nota nella pagina che la bacheca arriverà.
5. **Account e backend**: nessuno.
6. **Posizione e distanza**: l'app conosce la **zona climatica** (Castelli Romani) e, facoltativamente, `meteo_posizione` (coordinate scelte dall'utente e arrotondate); non c'è un concetto di «zona pubblica» né un calcolo di distanza fra utenti.
7. **Immagini condivisibili**: le foto sono locali; non c'è archivio remoto né riduzione pensata per la pubblicazione.
8. **Moderazione, segnalazioni, informative normative per categoria**: nulla.

## 4. Architettura attuale (cosa conta per le scelte)

- **Livelli**: `contenuti` (JSON in `data/`) → `motore` (funzioni pure, provate in Node) → `store` (IndexedDB) → `screens/ui` (DOM costruito con `el()`), testo solo in `i18n/it.json`.
- **Navigazione**: indirizzi `#/rotta?param`, 23 rotte caricate al bisogno (`js/main.js`), barra a 5 voci (`js/ui/nav.js`); le altre schermate sono sottorotte di «Il mio orto». Un marketplace trova posto come sottorotta di «Il mio orto» e come pulsante nei moduli, senza cambiare la barra.
- **Schermate riusabili**: `apriFoglio` (foglio dal basso), `raccolto-form` (inserimento quantità), figurina, guida dei vermetti: il marketplace deve riusarle, non duplicarle.
- **Dipendenze**: nessuna libreria. Questo **vincolo** (regola del progetto) influenza il backend: niente SDK; si parla con il servizio via `fetch` (vedi sezione 6).
- **Migrazione dati**: `db.js` crea gli archivi mancanti a ogni salita di versione (`onupgradeneeded`) senza toccare quelli esistenti; `normalizzaColtura`/`normalizzaZona`/`normalizzaFoto` rendono i record vecchi conformi; il backup formato 2 si importa anche dal formato 1. Lo schema `docs/schema-dati.md` documenta ogni campo.
- **Sicurezza attuale**: nessun segreto nel repo (prova `tests/05-segreti.sh`), la chiave Gemini non esce nei backup (`PRIVATE = ['ai_chiave']`), consenso esplicito prima di inviare foto o testo a Google.
- **Punti di forza per l'espansione**: moduli puri e provabili; il lavoro con agenti paralleli funziona; il service worker garantisce l'uso offline.
- **Debolezze da conoscere**: le `impostazioni` contengono liste di dati veri (`semi`, `eccesso`) pensate per piccole quantità; il formato 2 del backup non conosce archivi nuovi; non c'è un meccanismo di versione per il formato dei dati utente oltre `schemaVersion` sui singoli record.

## 5. Proposta di modello dati

### 5.1 Principi
- **Un lotto di produzione + un registro dei movimenti.** Il lotto dice *cosa* e *quanto* si è ottenuto; i movimenti dicono *cosa ne è stato fatto*. Le quantità «disponibile», «riservata», «pubblicata», «ceduta» non si salvano: si **calcolano** sommando i movimenti. Così non si disallineano e la sincronizzazione è semplice (movimenti solo aggiunti, mai modificati).
- **Un solo posto in cui l'utente inserisce un raccolto.** Tutto il resto lo legge.
- **Categorie con proprietà proprie**, descritte in un file di contenuti (`data/it/categorie-produzione.json`), non in `if` nel codice: unità ammesse, campi specifici, gruppo normativo, informativa.
- Gli archivi personali **non vanno sul server**; sul server vanno solo oggetti pubblici scelti dall'utente (sezione 6).

### 5.2 Archivi locali nuovi (IndexedDB versione 4)

**`produzioni`** (un lotto)
- `id`, `categoria` (una delle categorie del registro), `prodotto` (nome libero, es. «Pomodori cuore di bue»), `schedaId` (facoltativo), `origine`: `{ tipo: 'coltura' | 'allevamento' | 'manuale', colturaId?, zonaId?, allevamento?: 'api' | 'galline' | 'lombrichi' }`, `unita` (`kg | g | pezzi | dozzine | vasetti | litri | ...` ammesse dalla categoria), `quantita_ottenuta`, `data`, `proprieta` (oggetto con i campi specifici della categoria: per il miele il tipo di fiore e il lotto; per le uova la data di deposizione; per l'humus il mese di maturazione; per le piantine la specie e l'età), `note`, `creata`, `schemaVersion`.

**`movimenti`** (registro, solo aggiunte)
- `id`, `produzioneId`, `tipo`: `consumo | riserva | rilascio_riserva | pubblicazione | ritiro_pubblicazione | cessione | perdita | rettifica`, `quantita` (positiva), `data`, `annuncioId?`, `controparte?` (testo libero o nome pubblico; mai dati privati), `note`, `creato`.

**`annunci`** (bozze e pubblicati, vedi 5.4) e **`richieste`** (le mie richieste).

**`coda_sync`** (operazioni da inviare al server: sezione 6.4).

### 5.3 Come si calcolano le quantità
Per ogni lotto, sommando i movimenti:
- ottenuta = `quantita_ottenuta`; consumata = Σ consumo; ceduta = Σ cessione; persa = Σ perdita; riservata = Σ riserva − Σ rilascio_riserva; pubblicata_attiva = Σ pubblicazione − Σ ritiro_pubblicazione − (cessioni legate a quegli annunci);
- **disponibile libera** = ottenuta − consumata − ceduta − persa − riservata − pubblicata_attiva (mai sotto zero: il modulo rifiuta il movimento che la porterebbe sotto zero).

Esempio della direttiva (20 kg di pomodori): ottenuta 20; riserva 8; consumo 4; pubblicazione 8 → libera 0, pubblicata 8. Cessione di 3 kg sull'annuncio → ceduta 3, pubblicata attiva 5, annuncio con disponibilità 5. Tutto in un modulo puro `js/motore/produzioni.js`, con prove a tappeto (arrotondamenti, unità diverse, grammi/chili, movimenti rovinati).

### 5.4 Annuncio e richiesta (stessa forma locale e remota)
**Annuncio**: `id` (UUID creato sul dispositivo), `tipo` (`vendita | scambio | regalo`), `produzioneId` (**tipo A**, collegato) oppure `null` (**tipo B**, manuale), `categoria`, `titolo`, `descrizione`, `quantita_totale`, `quantita_disponibile`, `unita`, `prezzo` (facoltativo, in centesimi, con unità di prezzo), `foto` (riferimenti), `zona` (zona pubblica approssimata, vedi 6.3), `ritiro` (testo e opzioni: ritiro, consegna concordata), `pubblicato_il`, `scade_il`, `stato` (`bozza | attivo | esaurito | scaduto | ritirato`), `condivide`: l'elenco **esplicito** dei campi che l'utente ha scelto di rendere pubblici (nome del lotto, quantità, foto, data di raccolta...), `versione`.
**Richiesta**: `id`, `categoria`, `titolo`, `descrizione`, `zona`, `scade_il`, `stato`.
Per l'annuncio di tipo A, `quantita_disponibile` **non si scrive a mano**: segue i movimenti del lotto (pubblicazione, cessione, ritiro).

### 5.5 Profilo pubblico (solo online, separato dai dati privati)
`profili`: `id` (= identificativo dell'account), `nome_pubblico`, `zona` (approssimata), `presentazione`, `creato`. Indirizzo, email, coordinate precise e posizione esatta **non stanno nel profilo**: l'email vive nel servizio di autenticazione, le coordinate non lasciano mai il telefono. Previsti ma non sviluppati: `recensioni` (tabella vuota predisposta), `segnalazioni`.

### 5.6 Registro delle categorie (contenuti, con fonti)
`data/it/categorie-produzione.json`: per ogni categoria `id`, `nome`, `gruppo` (`alimentare | agricolo | materiale | animale | altro`), `unita_ammesse`, `campi` specifici, `vendita`: `{ stato: 'verifica' | 'con_requisiti' | 'non_gestita', informativa, fonti, certezza }`. Esempi di categorie iniziali: ortaggi, frutta, uova, miele, piantine, semi, humus e compost, lombrichi, zafferano e colture speciali, funghi, fiori edibili. **Nessuna categoria si presume vendibile liberamente**: finché la normativa non è verificata con fonti ufficiali, la categoria è `verifica` e prima di pubblicare compare l'informativa («informati presso il tuo Comune/ASL»). Le categorie di **animali vivi** (per esempio lombrichi da allevamento) si trattano come `animale` con requisiti propri. Le informative sono dati con fonte e certezza come tutto il resto (nessuna invenzione; la ricerca normativa è un compito per Codex/Perplexity, vedi roadmap).

### 5.6 bis Esito della ricerca normativa (01/11/2026, Perplexity in modalità Ricerca)

File completo: `CERVELLO/agenti/log/ricerca-normativa.md` (nel cervello, non nel repo). Sintesi, **senza interpretare**:
- **Trovato con fonte**: norme di commercializzazione dell'ortofrutta (MASAF), uova (stampigliatura, reg. UE 1308/2013; esenzione nazionale per piccoli allevamenti nel luogo di produzione con un decreto da verificare se ancora valido), miele (etichetta, direttiva 2001/110/CE; registrazione degli apiari in BDN), sementi di ortaggi (catalogo comune), passaporto delle piante fra professionisti, conserve domestiche (il Ministero dà linee guida di preparazione e non autorizza la vendita), DSA e GDPR in generale.
- **Non trovato** (non vuol dire che non esista): definizione ufficiale di «vendita occasionale» o soglia per l'hobbista; testo dell'art. 4 D.Lgs. 228/2001 e articoli del Codice civile su permuta e donazione (da leggere su Normattiva); funghi, zafferano, humus e compost, animali vivi e lombrichi, piantine vendute da un privato, fiori edibili (solo la regola generale sull'igiene degli alimenti).
- **Aperto per il parere professionale**: quali obblighi del DSA valgono davvero per un servizio piccolo di soli annunci senza pagamenti; ASL competente per la zona (due versioni trovate, non verificate).
- Effetto sul prodotto: `data/it/categorie-produzione.json` riporta solo ciò che è sopra, con fonte e certezza, e dichiara «non trovato» il resto; ogni categoria resta in stato `verifica` e invita a informarsi presso Comune/SUAP e ASL.

### 5.7 Migrazione dei dati esistenti (non distruttiva)
- Gli **eventi di raccolto** esistenti diventano lotti (`produzioni`) con id deterministico `raccolto:<idEvento>` e `origine: coltura`; **gli eventi restano dove sono** (Storia, traguardi, resoconto, ricette e totali continuano a leggerli). Il modulo del raccolto scrive d'ora in poi l'evento **e** il lotto collegato (`evento.produzioneId`), in un'unica operazione.
- La lista `impostazioni.eccesso` diventa movimenti: una voce `disponibile` → lotto manuale + movimento di riserva o pubblicazione; una voce `regalato/scambiato/venduto` → lotto manuale + cessione. La pagina «Il tuo eccesso» diventa la **vista «Disponibilità»** sui lotti (nessuna schermata duplicata).
- `impostazioni.semi` resta com'è (non è una produzione ma un magazzino): un lotto di «semi salvati» potrà essere creato quando l'utente vuole pubblicarli.
- La salita IndexedDB 3 → 4 è **idempotente** (si può ripetere senza duplicare) e si prova con un backup vecchio. Il **backup passa al formato 3** (aggiunge `produzioni`, `movimenti`, `annunci` bozze), sempre in grado di leggere i formati 1 e 2.

## 6. Proposta backend

### 6.1 Scelta: Supabase (da confermare)
Supabase offre autenticazione, PostgreSQL con **Row Level Security**, archivio delle immagini e funzioni lato server, quello che serve, senza gestire un server nostro. Alternative scartate per ora: Firebase (modello a documenti, meno adatto a ricerca e filtri), un server nostro (costo di gestione).
Numeri da riverificare sulla pagina ufficiale prima di decidere (cambiano; fonti non ufficiali discordano): il piano gratuito indicato come adatto a un prototipo ha limiti su database (circa 500 MB), archivio file (circa 1 GB) e utenti attivi mensili (circa 50.000), **ma i progetti gratuiti vengono messi in pausa dopo una settimana di inattività**; il piano Pro parte da circa 25 dollari al mese. Fonte da controllare: la pagina prezzi di Supabase. **Per un'app con utenti veri serve il piano a pagamento** (nessuna pausa): è una decisione di costo che spetta a Claudio.
Regione: Europa (Francoforte), per i dati di utenti italiani.

### 6.2 Vincolo «nessuna dipendenza»
Non si usa l'SDK: si chiama il servizio direttamente con `fetch` (autenticazione, interrogazioni e archivio file sono interfacce HTTP documentate). Un modulo `js/rete/servizio.js` incapsula tutto, e un'interfaccia `DepositoMarketplace` ha **due implementazioni**: una **locale** (usata nelle prove e nella Fase 3, funziona senza backend) e una **Supabase** (Fase 4). Così il marketplace si sviluppa e si prova prima del backend e il backend si può cambiare senza riscrivere l'app.
Nell'app c'è **solo la chiave pubblica («anon»)**, pensata per stare nel client: la protezione dei dati sta nelle regole RLS, non nella segretezza della chiave. **La chiave amministrativa (`service_role`) non entra mai nel repository né nell'app.**

### 6.3 Posizione e distanza (privacy)
- L'utente sceglie la zona **a mano** (comune o mappa a griglia) oppure usa la geolocalizzazione, **facoltativa**; la posizione precisa non lascia il telefono.
- Sul server si salva solo una **cella geografica approssimata** (per esempio una griglia di circa 5 km o il codice del comune). I filtri 5, 10, 25, 50 km si calcolano fra centri delle celle: la precisione è quella della cella (si dichiara all'utente: «distanza indicativa»).
- Nessun indirizzo, nessuna coordinata precisa nel profilo pubblico né negli annunci. Il luogo di ritiro si concorda fuori dall'app (o con testo libero scelto dall'utente).

### 6.4 Tabelle e sicurezza (bozza)
`profili`, `annunci`, `richieste`, `immagini_annunci` (riferimenti ai file), `segnalazioni`, `recensioni` (vuota, predisposta). Regole RLS:
- `annunci`/`richieste`: **lettura pubblica solo delle righe `attivo`**; scrittura, modifica ed eliminazione **solo del proprietario** (`auth.uid() = proprietario`); le quantità si modificano con funzioni server (`pubblica`, `cedi`, `ritira`) che controllano i limiti, così nessuno può scrivere numeri incoerenti.
- `profili`: lettura pubblica dei soli campi pubblici; modifica del proprio.
- Archivio immagini: cartella per utente (`/<uid>/...`), scrittura solo nella propria, lettura pubblica per gli annunci attivi, limite di dimensione e tipo file.
- `segnalazioni`: inserimento da utenti autenticati, lettura solo agli amministratori.
- Limiti di frequenza e dimensione dei testi (anti abuso). Prove automatiche delle regole con utenti finti (provare che A non possa modificare i dati di B).

### 6.5 Sincronizzazione e conflitti
- **Cosa si sincronizza**: solo oggetti pubblici (profilo, annunci propri, richieste proprie, foto degli annunci) e la **lettura** degli annunci altrui. Lotti, movimenti, colture, foto del diario **restano locali**.
- **Coda in uscita** (`coda_sync`): ogni modifica a un annuncio mette un'operazione in coda, con id creato sul dispositivo (idempotente: rimandarla due volte non duplica). Al ritorno della connessione la coda si svuota in ordine.
- **Conflitti**: ogni annuncio ha un solo proprietario, quindi i conflitti possibili sono solo fra i suoi dispositivi. Si risolvono con un contatore di versione e regola «vince la modifica più recente per campo»; le quantità non entrano in conflitto perché derivano dai movimenti (che si sommano) e sono applicate dal server con funzioni atomiche.
- **Lettura offline**: ultima ricerca tenuta in memoria locale con data; l'app dice quando i dati sono vecchi.

### 6.6 Account
Opzionale e **solo per il marketplace**. Metodo previsto: accesso senza password (link o codice via email), per non gestire password. L'account si crea la prima volta che l'utente tocca «Pubblica». `coltivatore_id` anonimo **non** si usa come identità di rete (non è segreto); l'identità sarà quella dell'autenticazione. Cancellazione dell'account e dei propri annunci a richiesta (obbligo di privacy: vedi rischi).

### 6.7 Alternative a Supabase (richiesto da Claudio il 01/11/2026)

Confronto prudente: le fonti trovate sono blog di confronto (non ufficiali, con cifre in parte discordanti), quindi **i numeri vanno riverificati sui siti dei fornitori prima di decidere** (Fase 4). Quello che conta per noi: costo, quanto lavoro di gestione resta a Claudio, chi risponde della sicurezza, ricerca per zona, facilità di cambiare fornitore.

| Strada | Come funziona | Costo indicativo | A favore | Contro |
|---|---|---|---|---|
| **Supabase** (proposta) | servizio gestito: PostgreSQL, accessi, archivio immagini, regole RLS | piano gratuito per provare (con pausa dopo inattività); Pro da circa 25 dollari al mese | database relazionale adatto a filtri e ricerche; sicurezza a livello di riga; dati esportabili (è PostgreSQL standard, quindi si cambia fornitore) | costo mensile con utenti veri; le regole di sicurezza vanno scritte e provate bene |
| **Appwrite** | servizio gestito o da installare su un server proprio | circa 25 dollari per progetto al mese nella versione gestita (fonte non ufficiale) | simile a Firebase come uso; installabile in proprio | meno adatto a ricerche relazionali; stessa spesa di Supabase |
| **PocketBase** | un solo programma con database SQLite, da installare su un server (VPS) | circa 5-10 euro al mese di server (stima da blog) | il più economico; semplice; regole di accesso incluse | **la gestione, gli aggiornamenti, i backup e la sicurezza del server sono nostri**; un solo scrittore alla volta nel database (limite se gli utenti crescono); le immagini pesano sul nostro disco |
| **Firebase** | servizio gestito di Google, database a documenti | pagamento a consumo, difficile da prevedere | ottimi strumenti per telefoni; molto diffuso | ricerche e filtri per zona più scomodi in un database a documenti; costi a consumo imprevedibili; SDK grandi, contro la regola «nessuna dipendenza»; legame forte con Google |
| **Server di casa** (PC Asus con PocketBase) | lo stesso programma sul PC acceso in casa, aperto a Internet con un tunnel | solo corrente e connessione | gratis; già pensato per l'IA futura | tutto cade se il PC o la linea si fermano; sicurezza e backup a carico di Claudio; poco adatto a dati di altri utenti |
| **Senza server (solo Fase 3)** | l'annuncio si crea nell'app e si manda come immagine/testo su WhatsApp o social | zero | si parte subito, nessuna normativa da piattaforma | niente ricerca per zona, niente richieste, niente sincronizzazione |

**Raccomandazione**: sviluppare comunque le Fasi 2 e 3 **senza server** (già previsto: deposito locale + condivisione come immagine), così Claudio ha tempo di vedere se serve davvero e quante persone la usano. Per la Fase 4 il **confronto reale è tra Supabase (meno lavoro, costo mensile) e PocketBase su un piccolo server (meno costo, più lavoro e responsabilità)**. L'interfaccia `DepositoMarketplace` permette di scegliere o cambiare senza riscrivere l'app. La scelta definitiva resta a Claudio dopo aver confrontato i prezzi aggiornati.

### 6.8 DECISIONE (01/11/2026): strada a costo zero

Claudio non ha soldi da investire e ha crediti limitati, e ha chiesto a Claude di scegliere la soluzione efficace. Decisione presa da Claude, da riconfermare solo se cambiano le condizioni:

**Principio: non si spende finché non ci sono utenti che lo giustificano, e ogni gradino si può fermare senza perdere quello che c'è.**

| Gradino | Cosa | Costo | Quando |
|---|---|---|---|
| **0 (ora)** | Fase 2 e Fase 3 **senza server**: lotti, disponibilità, annunci e richieste nell'app; l'annuncio si condivide come immagine o testo su WhatsApp, social, gruppi di quartiere | **zero** | subito |
| **1** | Backend **Supabase, piano gratuito**, solo quando ci sono persone vere che vogliono cercarsi in una zona. Il progetto gratuito si mette in pausa se per 7 giorni c'è poca attività: lo si evita con un **piccolo controllo automatico ogni pochi giorni** che legge il database (GitHub Actions, gratuito per i repository pubblici; metodo descritto da più guide, **da provare davvero** prima di fidarsi) | **zero** entro i limiti gratuiti (circa 500 MB di database, 1 GB di file, 50.000 utenti attivi al mese: cifre da riverificare sul sito ufficiale) | Fase 4 |
| **2** | Piano a pagamento (circa 25 dollari al mese) | a pagamento | **solo** se si superano i limiti gratuiti o si vuole togliere il rischio di pausa; si finanzia con un ricavo (per esempio un contributo volontario dei sostenitori): Claudio non deve metterci soldi propri |

Perché Supabase gratuito e non le altre strade:
- **Firebase (piano Spark)**: non si mette in pausa e non può addebitare costi (al superamento dei limiti si ferma), ma i filtri per zona e categoria sono scomodi e **non adatti a regole di sicurezza complesse**; richiede librerie grandi e lega a Google. Resta il piano B se Supabase non andasse.
- **PocketBase o server di casa**: costo di server o PC sempre acceso, e **backup e sicurezza a carico di Claudio**: troppo lavoro e rischio senza soldi né tempo.
- **Supabase**: relazionale (filtri semplici), regole di sicurezza forti (RLS), dati portabili (PostgreSQL), nessun server da gestire; il difetto della pausa si aggira.

Per contenere i limiti gratuiti: massimo 3 foto per annuncio, ridotte a circa 100-150 KB l'una; annunci che scadono e si cancellano da soli; niente chat né file pesanti.

**Come spendiamo i crediti di Claudio** (la risorsa vera): lavori piccoli ai modelli gratuiti (Kilo, OpenCode) con le prove scritte da Claude; i pezzi grossi a Codex (già pagato); Claude per progettare, controllare e correggere; prove automatiche gratuite sul computer prima di ogni consegna; niente ricerche a pagamento senza il via libera di Claudio. Il passo successivo (Fase 2, parte 2) è solo interfaccia e logica locale: nessun costo.

## 7. Piano di integrazione del marketplace nell'app

- **Dove**: nuova sottorotta `#/mercato` (ricerca, annunci, richieste, i miei annunci, profilo) raggiungibile da «Il mio orto» e da un pulsante «Pubblica» nei moduli. Nessuna voce in più nella barra.
- **Dai moduli**: «Raccolto» → «Pubblica una parte»; «Lombricoltura/Api/Pollaio» (con il nuovo registro delle produzioni) → «Segna humus/miele/uova» e «Pubblica»; «Il tuo eccesso» diventa **Disponibilità** con gli stessi pulsanti; «Piantine e semi» dal diario/banca dei semi. In tutti i casi l'annuncio nasce **già compilato** dal lotto e l'utente sceglie cosa condividere.
- **Cosa si riusa**: `apriFoglio`, `raccolto-form` (diventa «registra produzione» per ogni categoria), figurina di condivisione (annuncio come immagine da mandare anche fuori), guida dei vermetti (passo «Pubblica il primo annuncio»), prove e controllo veloce.
- **Cosa non si duplica**: oggi il raccolto è registrato due volte (evento + eccesso). Dopo la Fase 2 esiste un solo punto d'ingresso.
- **Cosa resta funzionante senza account**: tutto il personale. Il mercato mostra «Accedi per pubblicare» solo quando serve.

## 8. Rischi e criticità

1. **Normativa e responsabilità** (la più seria). Non tutti i prodotti si possono vendere liberamente: alimenti, uova, miele, funghi, animali vivi, piante, piantine e materiali (humus, compost) hanno regole diverse; per chi vende possono esserci obblighi fiscali e sanitari. Una piattaforma che ospita annunci ha inoltre doveri propri (segnalazione e rimozione dei contenuti illeciti, informative, privacy, termini d'uso). **Serve un parere di un professionista prima del lancio pubblico**; fino ad allora il registro categorie dichiara «verifica» e l'app non dà consulenza.
2. **Privacy (GDPR)**: profilo, zona, foto sono dati personali; servono informativa, consenso, cancellazione, minimizzazione (già previsto: niente coordinate precise, niente indirizzi).
3. **Mercato vuoto all'inizio**: un marketplace locale senza utenti nella zona è inutile; la direttiva stessa lo prevede come fase successiva. Mitigazione: partire con «Disponibilità» e annunci condivisibili anche fuori (immagine/testo), aprire il mercato per zona quando c'è massa critica.
4. **Abusi e frodi**: truffe, contenuti inadatti, spam. Servono segnalazioni, limiti di frequenza, moderazione minima, nessun pagamento in app (resta fuori, come da direttiva).
5. **Costo e continuità del backend**: i progetti gratuiti vengono messi in pausa; con utenti veri serve il piano a pagamento. Decisione di Claudio.
6. **Sicurezza**: una regola RLS sbagliata espone dati. Mitigazione: prove con utenti finti, nessuna chiave amministrativa nel client, revisione indipendente (Claude rivede il lavoro di Codex).
7. **Migrazione dei dati**: salire IndexedDB a 4, backfill degli eventi, backup formato 3. Mitigazione: operazione idempotente, backup compatibile con i formati 1 e 2, prova con i dati di oggi (compreso un backup reale di Claudio) prima del rilascio.
8. **Complessità**: il rischio di «accumulare funzionalità scollegate». Mitigazione: un solo modello (lotti + movimenti), un solo punto d'ingresso, porte di approvazione.
9. **Offline**: pubblicare senza rete deve funzionare (coda); l'annuncio risulta «in attesa» finché non parte; la quantità non può diventare negativa in nessun caso.
10. **Vincolo nessuna dipendenza**: scrivere e provare a mano un client HTTP per autenticazione e archivio file costa più di usare l'SDK; è una scelta di regola da riconfermare (se si preferisce, un'unica libreria caricata dal sito ufficiale, con versione fissata e prova offline).
11. **Peso dei dati**: le foto degli annunci vanno ridotte prima del caricamento (già esiste la riduzione a 1024 px); la cache offline non deve riempirsi di immagini altrui.
12. **Dati esterni** (consociazioni, fasi, conservazione): molte fonti sono estere; non cambia con il marketplace ma pesa sulla fiducia.

## 9. Roadmap ordinata per priorità

Ogni fase finisce con: prove verdi (`controllo-veloce`), documentazione aggiornata (`docs/schema-dati.md`, `ROADMAP.md`, questo file), elenco dei problemi residui. **Si passa alla successiva solo con l'approvazione di Claudio.**

**Fase 1 — Analisi e progettazione** (questo documento). Esito: **modello approvato** (01/11/2026); backend ancora da decidere (6.7); la Fase 2 non dipende dal backend e può partire.

**Fase 2 — Modello produttivo unificato** (solo locale, nessun backend, nessun marketplace)
1. Registro categorie (`data/it/categorie-produzione.json`) con unità e campi, normativa «da verificare».
2. Modulo puro `produzioni.js`: lotti, movimenti, quantità calcolate, validazione (agente gratuito + prove di Claude).
3. IndexedDB v4 (`produzioni`, `movimenti`), migrazione idempotente degli eventi di raccolto e dell'eccesso; backup formato 3.
4. «Registra produzione» generale (riusa il form del raccolto) e registro per uova, miele, humus, lombrichi, compost, piantine; «Disponibilità» al posto del diario dell'eccesso; consumi e riserve.
5. Prove: matematica delle quantità, migrazione con dati vecchi e con un backup reale, nessuna regressione nelle 78 serie esistenti.
*Uscita*: l'esempio dei 20 kg funziona come descritto; nessun doppio inserimento.

**Fase 3 — Marketplace MVP** (con deposito locale, senza rete)
1. Interfaccia `DepositoMarketplace` e implementazione locale.
2. Annunci (vendita, scambio, regalo) tipo A e B, scelta dei campi condivisi, scadenza, foto, informativa per categoria.
3. Richieste, ricerca con filtri (distanza, categoria, tipo, disponibilità, prezzo) su dati di prova, selezione zona manuale.
4. Profilo pubblico (bozza), «Pubblica» dai moduli, passo nella guida dei vermetti.
*Uscita*: si pubblica, si cede, la disponibilità si aggiorna, tutto provato offline.

**Fase 4 — Backend e sincronizzazione** (prima: ricerca normativa e parere legale in parallelo)
1. Progetto Supabase in Europa, schema SQL e regole RLS (Codex), prove di sicurezza con utenti finti (Claude rivede).
2. Client `js/rete/servizio.js` (autenticazione senza password, interrogazioni, archivio immagini), implementazione Supabase di `DepositoMarketplace`, coda di sincronizzazione.
3. Account opzionale, cancellazione dati, segnalazioni, limiti di frequenza.
*Uscita*: due telefoni vedono gli annunci l'uno dell'altro; offline → coda → sincronizzazione; un utente non può toccare i dati di un altro.

**Fase 5 — Test e rilascio**
Prove di: uso offline, sincronizzazione e riconnessione, aggiornamento delle quantità, backup e ripristino dei formati 1, 2 e 3, sicurezza (RLS, nessuna chiave nel codice), compatibilità con i dati precedenti, tre persone vere che la provano. Rilascio graduale per zona.

**Dopo (non ora, ma predisposti)**: pagamenti, messaggi, matching tra richieste e offerte, reputazione, logistica. Punti d'innesto già previsti: `movimenti.controparte`, `annunci.stato`, tabella `recensioni`, funzioni server `cedi`, `profili`.

## 10. Decisioni che servono a Claudio per approvare la Fase 1

1. **Modello**: APPROVATO da Claudio il 01/11/2026 («lotti + movimenti», migrazione non distruttiva, «Il tuo eccesso» → «Disponibilità»). La Fase 2 può partire.
2. **Backend**: DECISO da Claude il 01/11/2026 su richiesta di Claudio (nessun budget): strada a costo zero, sezione 6.8 (prima senza server, poi Supabase gratuito con controllo anti-pausa, a pagamento solo se e quando arriva un ricavo).
3. **Nessuna dipendenza**: Claudio non ha preferenze; decide Claude al momento della Fase 4 (default: mantenere la regola).
4. **Accesso**: link/codice via email senza password va bene?
5. **Normativa**: Claudio ha autorizzato la ricerca con Perplexity (modalità Ricerca): richiesta inviata, esito atteso in `CERVELLO/agenti/log/ricerca-normativa.md`. Resta da decidere il parere professionale prima del lancio pubblico.
6. **Zona**: griglia di circa 5 km oppure comune? (la griglia è più semplice e privata, il comune più comprensibile).
7. **Nome e marchio**: il mercato resta dentro «Orto AI» o ha un nome suo? (il controllo del marchio è ancora da fare).

## 11. Cosa è stato verificato leggendo il codice (per chi vuole controllare)

`js/store/db.js` (versione 3, cinque archivi), `js/store/impostazioni.js` (35 chiavi, `PRIVATE`), `js/store/backup.js` (formato 2: `colture`, `zone`, `eventi`, `foto`), `js/store/dati.js` (`nuovoEvento` con `condivisibile: false`), `js/motore/raccolto.js` e `js/ui/raccolto-form.js` (evento `raccolto` con `quantita` e `unita` in kg, g, pezzi), `js/screens/eccesso.js` e `js/motore/eccesso.js` (lista nelle impostazioni), `js/screens/semi.js`, `js/screens/animali.js` (sola lettura), `js/main.js` (23 rotte), `js/ui/nav.js`, `docs/schema-dati.md`, `ROADMAP.md`. Nessun codice per account, rete propria, annunci o posizione degli utenti è presente.

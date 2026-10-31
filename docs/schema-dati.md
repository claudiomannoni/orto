# Schema dei dati

Due parti: i contenuti agronomici (file JSON nel repository, scritti dall'agronomo) e i dati dell'utente (IndexedDB sul telefono, scritti dall'app).

Tutte le date sono `AAAA-MM-GG` (ora locale). Tutti gli id sono stringhe minuscole senza spazi (contenuti) o UUID (utente).

## 1. Contenuti agronomici

Cartella `data/<lingua>/` (oggi solo `it`).

### Livelli di certezza

- `alta`: confermata da una fonte autorevole che l'agronomo ha aperto e letto.
- `media`: fonte autorevole ma generica (non specifica per la zona), o fonti concordi ma non ufficiali.
- `bassa`: tradizione, indicazione non verificabile, fonti in disaccordo. L'app la mostra con l'avviso di Rossella.

Ogni informazione con `certezza` ha anche `fonti`: elenco di id che esistono in `fonti` del file. Un'informazione senza fonte ha certezza `bassa`. Mai inventare una fonte o un link: si cita solo ciò che è stato aperto e letto, con la data di consultazione.

### `fonti` (in ogni file)

    "fonti": {
      "f1": { "titolo": "...", "ente": "...", "url": "https://...", "consultata": "2026-10-30", "nota": "cosa ci ho preso" }
    }

### `zone-climatiche.json`

    {
      "versione": 1,
      "zone": [{
        "id": "castelli-romani",
        "nome": "Castelli Romani",
        "descrizione": "2-3 righe per un principiante",
        "quota_m": [200, 600],
        "clima": "testo breve",
        "gelo": { "ultimo_medio": "testo", "primo_medio": "testo", "certezza": "media", "fonti": ["f1"] },
        "note": "particolarità utili (vento, nebbie, suoli vulcanici...)",
        "da_verificare": ["..."]
      }],
      "fonti": { }
    }

### `colture/indice.json`

    { "versione": 1, "colture": ["fave", "aglio"] }

### `colture/<id>.json` (scheda coltura)

    {
      "versione": 1,
      "id": "fave",
      "nome": "Fava",
      "alias": ["fave", "baccello"],
      "nome_scientifico": "Vicia faba",
      "famiglia": "Fabaceae",
      "icona": "assets/colture/fave.svg",
      "descrizione": "1-2 righe",
      "giorni_alla_raccolta": { "min": 150, "max": 200, "certezza": "media", "fonti": ["f1"] },
      "semina": { "profondita_cm": 5, "distanza_file_cm": 60, "distanza_piante_cm": 10, "certezza": "media", "fonti": ["f1"] },
      "consociazioni": { "amiche": ["id"], "nemiche": ["id"], "certezza": "bassa", "note": "...", "fonti": [] },
      "rotazione": { "dopo": ["id o famiglia"], "prima_di": ["..."], "certezza": "media", "note": "...", "fonti": [] },
      "avvisi": ["avvisi di sicurezza, se ci sono"],
      "calendario": { "castelli-romani": [ <lavoro con mesi> ] },
      "lavori": [ <lavoro con dopo_giorni> ],
      "da_verificare": ["cose che non si è riusciti a confermare"],
      "fonti": { }
    }

### Lavoro (compito che l'app può proporre)

    {
      "id": "fave-semina",
      "operazione": "semina",
      "titolo": "Semina le fave",
      "mesi": [10, 11],
      "ottimale": [11],
      "dopo_giorni": [10, 25],
      "perche": "1-3 righe: perché si fa così e perché ora",
      "glossario": ["pacciamatura"],
      "metodi": [
        { "tipo": "biologico", "come": "...", "pro": ["..."], "contro": ["..."] },
        { "tipo": "tradizionale", "come": "...", "pro": ["..."], "contro": ["..."] },
        { "tipo": "sinergico", "come": "...", "pro": ["..."], "contro": ["..."] }
      ],
      "rosso": "battuta del contadino all'antica (max 220 caratteri)",
      "rossella": "risposta della scienziata prudente (max 220 caratteri)",
      "certezza": "media",
      "fonti": ["f1"]
    }

- `operazione`: `semina`, `trapianto`, `raccolta`, `cura`, `lavorazione`.
- `mesi` e `ottimale` (numeri 1-12) solo nei lavori del `calendario`: i mesi in cui il lavoro è possibile e quelli in cui è meglio. Se il lavoro vale per più zone, va ripetuto nella zona, con i suoi mesi.
- `dopo_giorni` ([min, max], giorni dalla data di semina inserita dall'utente) solo nei `lavori` collegati a una coltura già seminata.
- `metodi`: se per quel lavoro esiste un solo metodo sensato, uno solo, con scritto perché. Non inventare metodi per riempire. Ogni metodo ha almeno un pro e un contro.
- `glossario`: id che esistono in `glossario.json`.
- `rosso` e `rossella`: si rispondono fra loro, in tono leggero. `rosso` porta la tradizione (e la presenta come tale), `rossella` dice cosa si sa davvero e quanto è solido. Mai in contraddizione con `perche`.

### `glossario.json`

    {
      "versione": 1,
      "termini": [
        { "id": "pacciamatura", "termine": "Pacciamatura", "definizione": "1-2 righe per un principiante", "esempio": "facoltativo", "vedi_anche": ["id"] }
      ]
    }

### `terreno.json` (profilo del terreno)

Contenuti per capire il terreno di una zona: un questionario, le piante spontanee indicatrici e il test del barattolo. L'app ricava tre valori (`tessitura`, `drenaggio`, `humus`, vedi sezione 2) e mostra i consigli.

    {
      "versione": 1,
      "questionario": [{
        "id": "stringa-fra-le-mani",
        "testo": "Domanda in italiano semplice",
        "perche": "1-2 righe: cosa ci dice questa domanda",
        "opzioni": [{
          "id": "si-modella",
          "testo": "Risposta",
          "valori": { "tessitura": "argilloso", "drenaggio": "lento" }
        }],
        "certezza": "media",
        "fonti": ["f1"]
      }],
      "piante_indicatrici": [{
        "id": "romice",
        "nome": "Romice",
        "nome_scientifico": "Rumex obtusifolius",
        "indica": [{ "asse": "drenaggio", "valore": "lento" }],
        "come_riconoscerla": "2 righe",
        "note": "limiti dell'indicazione",
        "certezza": "bassa",
        "fonti": []
      }],
      "test_barattolo": {
        "titolo": "Test del barattolo",
        "materiali": ["barattolo di vetro con coperchio", "..."],
        "passi": [{ "testo": "un passo, una frase" }],
        "lettura": "come leggere gli strati e quanto aspettare",
        "tipi": [{ "id": "sabbioso", "nome": "...", "come_si_riconosce": "...", "sabbia_pct": [70, 100], "argilla_pct": [0, 15] }],
        "certezza": "media",
        "fonti": ["f1"]
      },
      "consigli": [{
        "asse": "tessitura",
        "valore": "argilloso",
        "testo": "consiglio pratico e prudente",
        "certezza": "media",
        "fonti": ["f1"]
      }],
      "da_verificare": ["..."],
      "fonti": { }
    }

- Assi e valori ammessi in `valori`, `indica` e `consigli`: `tessitura` (`sabbioso` | `medio` | `argilloso`), `drenaggio` (`rapido` | `buono` | `lento`), `humus` (`povero` | `medio` | `ricco`). Una risposta può portare uno, due o tre assi, o nessuno.
- Le piante indicatrici hanno prove deboli: certezza `bassa` salvo fonte che dica altro, e `note` dice cosa non possono dire (il pH, per esempio, non si legge da una pianta sola).
- Come tutti i contenuti: niente dati inventati, ogni fonte aperta e letta.

## 2. Dati dell'utente (IndexedDB, database `orto`, versione 3: la 3 aggiunge lo store `foto`)

Stores:

- `colture` (keyPath `id`): già esistente dalla prima versione. Campi: `id`, `nome`, `varieta`, `dataSemina`, `dove` (`semenzaio` | `orto`), `note`, `creata`. Nuovi, facoltativi: `schedaId` (id della scheda coltura), `zonaId`, `schemaVersion` (2).
- `impostazioni` (keyPath `chiave`): coppie `{ chiave, valore }`. Chiavi: `zona` (default `castelli-romani`), `metodo` (`biologico` | `tradizionale` | `sinergico` | `nessuno`), `esperienza`, `superficie_mq` (numero: il tetto della fascia scelta nel primo avvio, 10 | 30 | 100 | 300, dove 300 vuol dire oltre 200 m²; `null` se non indicata), `acqua` (`poca` | `media` | `molta` | `null`), `tempo` (`poco` | `medio` | `molto` | `null`), `nome_orto` (testo, max 40, facoltativo, vuoto se non scritto), `nome_coltivatore` (testo, max 30, facoltativo), `coltivatore_id` (identificativo anonimo creato la prima volta e tenuto sul telefono; non contiene niente di personale; serve solo se un giorno ci saranno account o scambi, e anche allora si condivide solo con consenso), `lingua` (`it`), `ai_provider` (`gemini`), `ai_modello`, `ai_chiave` (mai nel backup), `primo_avvio_fatto`, `colture_scelte` (elenco di id di scheda che l'utente segue; vuoto = tutte), `testo` (`normale` | `grande` | `enorme`), `contrasto` (booleano), `movimento_ridotto` (booleano), `quiz_risultati` (`{ 'AAAA-MM-GG': punti }`), `ai_testo_ok` (ha accettato di mandare le domande a Gemini), `ai_testo_conteggio` (`{ data, n }`). Le note libere della «Mia storia» sono eventi con `tipo: 'nota'` e il testo in `note`.
- `zone` (keyPath `id`): le zone di coltivazione dell'utente (fase 3). Campi: `id`, `nome`, `tipo` (`aiuola` | `terreno`), `stato` (`coltivata` | `da_preparare`), `misure` (`{ lunghezza_m, larghezza_m }`, numeri o `null`), `superficie_mq` (lunghezza x larghezza, o `null`), `esposizione` (`{ gradi }`: 0-359, la direzione verso cui guarda la zona; 0 = nord; `null` se non indicata), `terreno` (`null` oppure `{ tessitura, drenaggio, humus, risposte, barattolo, piante, aggiornato }`, vedi sotto), `note`, `creata`, `schemaVersion` (3). Non confondere con l'impostazione `zona`, che è la zona climatica.
  - `terreno.tessitura`: `sabbioso` | `medio` | `argilloso` | `null`. `terreno.drenaggio`: `rapido` | `buono` | `lento` | `null`. `terreno.humus`: `povero` | `medio` | `ricco` | `null`.
  - `terreno.risposte`: `{ idDomanda: idOpzione }` del questionario. `terreno.barattolo`: `null` oppure `{ sabbia_pct, limo_pct, argilla_pct }` (somma circa 100). `terreno.piante`: id delle piante indicatrici segnate dall'utente. `terreno.foto`: `null` oppure `{ indizi: { tessitura?, drenaggio?, humus? }, data }`, gli indizi che l'utente ha accettato dall'analisi delle foto (le foto non si salvano; contano come un'erba, cioè mezza risposta).
  - Impostazioni legate alle foto: `ai_foto_ok` (l'utente ha accettato che le foto vadano a Google) e `ai_foto_conteggio` (`{ data, n }`: foto analizzate oggi, tetto di 10 al giorno per non finire la quota gratuita).
- `eventi` (keyPath `id`): registro di ciò che succede. Campi: `id`, `tipo` (`lavoro_fatto` | `lavoro_saltato` | `nota` | ...), `zonaId`, `colturaId` (id utente), `schedaId`, `lavoroId`, `data`, `esito` (`ok` | `problema` | `saltato`), `note`, `creato` (ISO), `condivisibile` (sempre `false` per ora: la condivisione per zona, con consenso, è futura).

- `foto` (keyPath `id`, dalla versione 3 del database): il diario fotografico. Campi: `id`, `data` (AAAA-MM-GG), `creata` (ISO), `zonaId` e `colturaId` (o `null`), `nota` (max 500), `immagine` (Blob JPEG, lato lungo al massimo 1024 px), `miniatura` (data URL JPEG, lato lungo 240 px), `larghezza`, `altezza`, `diagnosi` (`null` oppure `{ data, risultato }`: `risultato` = `{ pianta: { nome, confidenza } | null, stato: sana | dubbio | problema | non_si_vede, problemi: [{ nome, confidenza, perche, cosa_controllare }], avvisi }`, sempre ipotesi da verificare), `schemaVersion` (3). Le foto non lasciano mai il telefono, tranne quando l'utente chiede a Rossella di guardarne una (permesso la prima volta).
- Impostazioni di progresso: `traguardi` (`{ id: data }` dei traguardi presi), `livello_raggiunto`, `orto_nato` (data del primo avvio), `vestiti` (`auto` o un vestito dei vermetti), `installa_rimandato`.

### Backup

    {
      "formato": "orto-backup",
      "versione": 2,
      "esportato": "2026-10-30T10:00:00.000Z",
      "impostazioni": { "zona": "castelli-romani" },
      "colture": [],
      "zone": [],
      "eventi": []
    }

- Senza `ai_chiave`, mai.
- Le foto del diario ci sono solo nel backup «con foto» (chiave `foto`: le stesse della sezione sopra, con `immagine` come data URL). Importando un backup senza `foto` quelle già nel diario restano; con `foto` vengono sostituite.
- L'import accetta anche il backup della prima versione (`{ "app": "il-mio-orto", "versione": 1, "colture": [...] }`) e un semplice elenco di colture. L'import sostituisce i dati dopo conferma.

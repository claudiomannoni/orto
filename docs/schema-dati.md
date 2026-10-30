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

## 2. Dati dell'utente (IndexedDB, database `orto`, versione 2)

Stores:

- `colture` (keyPath `id`): già esistente dalla prima versione. Campi: `id`, `nome`, `varieta`, `dataSemina`, `dove` (`semenzaio` | `orto`), `note`, `creata`. Nuovi, facoltativi: `schedaId` (id della scheda coltura), `zonaId`, `schemaVersion` (2).
- `impostazioni` (keyPath `chiave`): coppie `{ chiave, valore }`. Chiavi: `zona` (default `castelli-romani`), `metodo` (`biologico` | `tradizionale` | `sinergico` | `nessuno`), `esperienza`, `superficie_mq`, `acqua`, `tempo`, `lingua` (`it`), `ai_provider` (`gemini`), `ai_modello`, `ai_chiave` (mai nel backup), `primo_avvio_fatto`.
- `zone` (keyPath `id`): create ma vuote fino alla fase 3. Campi previsti: `id`, `nome`, `tipo` (`aiuola` | `terreno`), `misure`, `esposizione`, `terreno`.
- `eventi` (keyPath `id`): registro di ciò che succede. Campi: `id`, `tipo` (`lavoro_fatto` | `lavoro_saltato` | `nota` | ...), `zonaId`, `colturaId` (id utente), `schedaId`, `lavoroId`, `data`, `esito` (`ok` | `problema` | `saltato`), `note`, `creato` (ISO), `condivisibile` (sempre `false` per ora: la condivisione per zona, con consenso, è futura).

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
- L'import accetta anche il backup della prima versione (`{ "app": "il-mio-orto", "versione": 1, "colture": [...] }`) e un semplice elenco di colture. L'import sostituisce i dati dopo conferma.

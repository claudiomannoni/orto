# 🌱 Il mio orto

Web app installabile (PWA) per tenere traccia delle colture dell'orto.
HTML, CSS e JavaScript semplici: nessun framework, nessuna dipendenza, nessun servizio a pagamento, nessuna chiave o password.

## Cosa fa (versione 1)

- **Aggiungi coltura**: nome, varietà, data di semina, dove (semenzaio/orto), note.
- **Lista colture** con i giorni passati dalla semina (le più recenti in alto).
- **Aggiungi promemoria**: apre Google Calendar con l'evento già compilato (titolo, data, descrizione). Titolo, data (di default tra 7 giorni) e descrizione si possono modificare prima.
- **Dati sul telefono** in IndexedDB. **Esporta backup** scarica un file JSON; **Importa backup** lo ricarica (sostituisce le colture attuali, dopo conferma).
- **Installabile su Android** e **funziona offline** (manifest + service worker).

## Struttura

```
index.html              pagina unica
style.css               stile (mobile first, tema chiaro/scuro automatico)
db.js                   accesso a IndexedDB
app.js                  logica dell'app
sw.js                   service worker (cache per l'offline)
manifest.webmanifest    manifest PWA
icons/                  icone dell'app
.nojekyll               per GitHub Pages
```

## Provarla in locale

Il service worker funziona solo su `http://localhost` o `https://`, quindi non basta aprire `index.html` con doppio clic: serve un piccolo server.

Dalla cartella del progetto:

```bash
python3 -m http.server 8080
```

Poi apri <http://localhost:8080> nel browser (Chrome consigliato).
Per simulare il Pixel 9: DevTools (F12) → icona del telefono → scegli un dispositivo o imposta 412 × 923.

In alternativa, con Node.js installato:

```bash
npx serve .
```

### Provarla sul telefono dalla rete di casa

Su `http://IP-DEL-PC:8080` l'app si apre ma, non essendo HTTPS, Android non la installa e l'offline non funziona. Per la prova completa sul telefono usa GitHub Pages (sotto).

## Pubblicare su GitHub Pages

1. Crea un repository su GitHub (es. `orto`) e carica tutti i file di questa cartella:

   ```bash
   git remote add origin https://github.com/TUO-UTENTE/orto.git
   ```

   ```bash
   git push -u origin main
   ```

2. Su GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, cartella `/ (root)`, **Save**.
3. Dopo un minuto l'app è su `https://TUO-UTENTE.github.io/orto/`.

Tutti i percorsi sono relativi, quindi funziona anche in una sottocartella come `/orto/`.

## Installarla sul Pixel 9

1. Apri l'indirizzo GitHub Pages in **Chrome**.
2. Menu ⋮ → **Installa app** (o **Aggiungi a schermata Home**).
3. L'icona "Orto" compare tra le app; da lì si apre a schermo intero e funziona anche senza connessione.

## Aggiornare l'app

Dopo aver modificato i file, cambia `VERSIONE` in `sw.js` (es. `orto-v2`) prima di pubblicare: così i telefoni scaricano i file nuovi invece di usare quelli in cache.

## Note sui dati

- I dati stanno **solo nel browser di quel telefono**. Disinstallare l'app o cancellare i dati di Chrome per il sito li elimina: esporta un backup ogni tanto (es. salvalo su Drive).
- Il backup è un normale file JSON leggibile:

  ```json
  {
    "app": "il-mio-orto",
    "versione": 1,
    "esportato": "2026-10-30T10:00:00.000Z",
    "colture": [
      { "id": "…", "nome": "Pomodoro", "varieta": "Cuore di bue", "dataSemina": "2026-10-20",
        "dove": "semenzaio", "note": "3 semi per vasetto", "creata": "…" }
    ]
  }
  ```

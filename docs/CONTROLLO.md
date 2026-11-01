# Procedura di controllo (veloce e a costo zero)

Serve per sapere in due minuti se l'app è in ordine, senza spendere crediti: gira tutto sul computer.

## Il comando

```
node scripts/controllo-veloce.mjs          # ogni volta che si finisce un passo, prima di pubblicare
node scripts/controllo-veloce.mjs --link   # una volta a settimana: apre anche tutte le fonti (serve internet)
```

Risponde con una riga per punto, «ok» o «ROSSO», e dice cosa non va. Cosa controlla:

1. Tutte le prove automatiche (circa 67 gruppi: schermate, flussi, IA simulata, fotocamera, vermi, dati).
2. Versione dell'app = versione della cache offline (`js/versione.js` e `sw.js`), ed elenco dei file offline aggiornato.
3. Tutti i JSON validi, senza caratteri rotti, senza emoji.
4. Niente modifiche non salvate e niente da pubblicare su GitHub.
5. La versione online (GitHub Pages) è quella del computer.
6. Con `--link`: le fonti dei contenuti rispondono (ATTENZIONE 403 = sito che blocca i programmi, non è un errore; ROTTO = da riparare).

## Cosa NON controlla (va fatto a mano o con altri strumenti)

- Come si vede e come si sente sul telefono vero (fotocamera, dito, installazione, offline): provare a mano dopo ogni cambio grosso, 5 minuti.
- Se un contenuto è vero: ogni dato deve avere fonte e certezza. Controllo a campione con `node scripts/riepilogo-contenuti.mjs .` (dove mancano dati) e riaprendo le fonti.
- Codice che non serve più: `node scripts/trova-codice-morto.mjs .` (segnala soltanto, decidere a mano).

## Ordine per spendere poco

1. `controllo-veloce` (gratis) → se ROSSO, correggere.
2. Compiti piccoli e ripetitivi (prove, conteggi, controlli sui dati): agenti OpenCode gratuiti, in parallelo, uno per cartella.
3. Dati con fonti e ricerche sul web: Codex (già pagato). Ricerca profonda: Perplexity in modalità Ricerca.
4. Revisione e correzioni: Claude, per ultimo.

## Lezioni dai difetti trovati (per non ripeterli)

- Una graffa lasciata aperta nel CSS fa sparire in silenzio tutte le regole dopo (è successo: il dito scorreva la pagina invece di trascinare). Ora lo controlla `tests/css-bilanciato.mjs`.
- Una frase italiana con un apostrofo dentro una stringa tra apici rompe il caricamento del modulo: dopo ogni modifica a un file `.js` provare a caricarlo in un browser, non solo `node --check`.
- Le fonti: un controllo automatico può dare 404 a un sito che in realtà funziona (blocca i programmi): riaprirlo con un browser prima di decidere.

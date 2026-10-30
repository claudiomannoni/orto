# Lavorare sul PC (invece che sul cloud)

Il progetto si può portare avanti da Claude Code sul proprio computer, con il cervello a portata di mano. L'app online (GitHub Pages) non cambia: continua a pubblicarsi dal repository pubblico `claudiomannoni/orto` a ogni push.

## Una volta sola

1. Servono: Git, Node.js (versione 20 o più recente) e Python 3 (per il piccolo server di prova). Su Windows, Git per Windows porta anche Git Bash, che serve per `tests/run-fase1.sh`.
2. Metti il progetto accanto al cervello, nella stessa cartella madre, così `CLAUDE.md` lo trova da solo:

        <cartella madre>\
          CERVELLO\    (già c'è, non si tocca)
          orto\        (questo progetto)

   Dalla cartella madre:

        git clone https://github.com/claudiomannoni/orto.git

3. Prove automatiche (una volta): dalla cartella `orto`,

        cd tests
        npm install
        npx playwright install chromium
        cd ..

   Non entra niente nell'app: i pacchetti restano in `tests/node_modules`, che Git ignora.

## Ogni volta che lavori

1. Apri il terminale nella cartella `orto` e prendi gli ultimi cambiamenti: `git pull`.
2. Avvia Claude Code aggiungendo il cervello in lettura: `claude --add-dir ../CERVELLO`.
   (Il cervello è sola lettura per questo progetto: la regola è scritta in `CLAUDE.md`.)
3. Per vedere l'app: `python -m http.server 8080` (su Windows spesso `py -m http.server 8080`) e apri http://localhost:8080. Per un altro giorno aggiungi `?oggi=2026-11-10`.
4. Dopo ogni modifica ai file dell'app: aumenta `APP_VERSIONE` in `js/versione.js` e lancia `node scripts/aggiorna-cache.mjs`.
5. Prove: vedi `tests/README.md` (motore e contenuti non hanno bisogno del server: `node tests/fase2-motore.mjs .` e `node tests/fase2-contenuti.mjs .`).
6. Commit e push: `git add -A`, `git commit -m "..."`, `git push`. GitHub Pages ripubblica da solo.

## Cosa cambia rispetto al cloud

- Gli agenti in `.claude/agents/` funzionano uguale. Sul PC, con internet normale, l'agronomo può aprire i siti agricoli: è il modo più semplice per dare le fonti ai dati (oggi tutti "Da verificare"). Di quel lavoro si occupa l'agronomo, in `data/it/`.
- Qui non c'è la rete bloccata del cloud: le ricerche sul nome e i controlli dei domini si possono rifare.
- Il push usa l'accesso GitHub del tuo computer.

# Orto in Tasca - istruzioni per Codex e altri agenti

Le istruzioni del progetto vivono in un posto solo: `CLAUDE.md`, nella stessa cartella.
Leggilo per intero e seguilo come se fosse scritto qui; poi leggi `BRIEF.md`.

Il cervello sta in `../CERVELLO` (sola lettura da qui). L'orchestrazione fra Claude e Codex è descritta in
`../CERVELLO/CLAUDE.md`, sezione ORCHESTRAZIONE.

Promemoria per chi lavora in un worktree:
- Non fare git: lascia le modifiche senza commit e proponi il messaggio; il commit lo fa Claude.
- Dopo ogni modifica ai file dell'app aumenta `VERSIONE` in `sw.js` (e `APP_VERSIONE` in `js/versione.js`), poi `node scripts/aggiorna-cache.mjs`.
- Prove: `node tests/fase2-motore.mjs .` e `node tests/fase2-contenuti.mjs .` (senza server).

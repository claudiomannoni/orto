# Prove della Fase 2 ("Oggi in campagna")

Provate sulla copia congelata del commit 88f791e. Server statico, poi:

    node tests/fase2-motore.mjs <cartella-app>                 # motore, dati finti (Node, nessun server)
    node tests/fase2-contenuti.mjs <cartella-app>              # coerenza di data/it/*.json, glossario, icone
    node tests/fase2-oggi.mjs http://localhost:<porta>         # interfaccia 412x923, date simulate, offline, tema scuro

Screenshot in `tests/schermate/fase2/` (nelle schermate a pagina intera la testata e la barra in basso
compaiono a meta' immagine: e' un effetto dello screenshot, non un difetto).

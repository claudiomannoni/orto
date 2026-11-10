# Risultato: sopravvivenza all'inverno delle 23 nuove piante

Data di ricerca: 6 novembre 2026. Compito in `compito.md`.

Ogni pagina elencata è stata aperta e letta durante la ricerca (direttamente o tramite gli agenti di ricerca lavorati in parallelo); i link sono stati poi verificati anche in un passaggio di controllo (risposta HTTP 200 e contenuto corrispondente alla pianta). Riferimento del clima: Castelli Romani, circa 340 m s.l.m., gelate occasionali fino a circa -5 °C.

File consegnato: `data/it/sopravvivenza-nuove.json` (fonti con prefisso `n1`-`n44`, senza scontri con gli id di `sopravvivenza.json`).

## Piante fatte (23 su 23), con le fonti usate

- **zucchine** — `sul-posto` no; `semi` si. Fonti: n1 (agraria.org, scheda zucca e zucchine), n2 e n3 (Orto da Coltivare).
- **melanzane** — `sul-posto` no; `in-casa` dipende; `semi` si. Fonti: n4 (agraria.org), n5 (Orto da Coltivare), n6 (Gardentopia, svernamento), n7 (Quando Si Pianta, semi).
- **patate** — `sul-posto` no; `semi` (conservazione dei tuberi-seme per la primavera). Fonte: n8 (agraria.org).
- **cetrioli** — `sul-posto` no; `semi` si. Fonti: n9 (agraria.org), n10 (Orti di Pace, semi).
- **piselli** — `sul-posto` dipende (resiste a -8 °C allo stadio di 4-5 foglie, ma è danneggiata in fioritura; semina autunnale). Fonte: n12 (agraria.org).
- **fave** — `sul-posto` dipende (-6 °C fatali alla maggioranza delle varietà). Fonte: n13 (agraria.org).
- **rucola** — `sul-posto` dipende (sopporta brevi gelate leggere, serve tessuto non tessuto o tunnel). Fonte: n21 (Cose di Casa).
- **spinaci** — `sul-posto` si (tolleranza del freddo in rosetta, coltivazione invernale normale). Fonte: n15 (agraria.org).
- **zucche** — `sul-posto` no; `semi` si. Fonti: n1 (agraria.org), n11 (Coltivazione Biologica, semi).
- **broccoli** — `sul-posto` dipende (il gelo danneggia i grumi; protezioni in collina; ricaccio laterale con broccoletti). Fonti: n17 (agraria.org), n18 e n19 (Cose di Casa).
- **cavolfiori** — `sul-posto` dipende (stessa situazione; protezione tradizionale delle foglie legate sopra il grumolo). Fonti: n17 (agraria.org), n18 (Cose di Casa).
- **verze** — `sul-posto` dipende (tollera il freddo ma non il gelo; varietà invernali). Fonti: n20 (agraria.org), n18 (Cose di Casa).
- **porri** — `sul-posto` si (varietà invernali resistenti al gelo, rincalzo e pacciamatura). Fonti: n24 (agraria.org), n25 (Guide Giardinaggio).
- **aglio** — `sul-posto` si (si pianta in autunno nelle zone a clima mite); `divisione` (ripianto degli spicchi). Fonti: n26 (agraria.org, aromatiche), n27 (Orto da Coltivare).
- **finocchi** — `sul-posto` dipende (teme il gelo; il freddo prolungato porta la pianta a montare a seme al posto di formare il grumolo). Fonti: n31 (agraria.org), n32 (Orto da Coltivare).
- **asparagi** — `sul-posto` si (perenne, asparageto di circa 10-12 anni); `divisione` (impianto per zampe). Fonti: n36 (agraria.org), n37 (Orto da Coltivare), n38 (Coltivare.info).
- **prezzemolo** — `sul-posto` dipende (biennale; pacciamatura/TNT per proteggere dal gelo); `divisione` e `semi` si. Fonti: n39 (agraria.org), n40 e n41 (Gardentopia).
- **fagiolini** — `sul-posto` no (muore a 1-2 °C). Fonte: n14 (agraria.org).
- **lattuga** — `sul-posto` dipende (da taglio meglio delle da cespo; protezioni con tessuto non tessuto notturno o tunnel); `semi` si. Fonti: n42 (agraria.org), n43 e n44 (Orto da Coltivare).
- **carote** — `sul-posto` si (coltura particolarmente resistente; gelo leggero migliora il sapore; pacciamatura di 15-20 cm o tunnel). Fonti: n33 (agraria.org), n34 (Gardentopia), n35 (Orto da Coltivare).
- **cipolla** — `sul-posto` si (cipolle invernali passano l'inverno in campo); `semi` si (raccolti dal fiore del secondo anno e conservati fino a due stagioni). Fonti: n28 (agraria.org), n29 e n30 (Orto da Coltivare).
- **ravanelli** — `sul-posto` no (si danneggia sotto i 5 °C). Fonti: n22 (Cose di Casa), n23 (agraria.org).
- **bietola** — `sul-posto` dipende (tollera -2/-3 °C). Fonte: n16 (agraria.org).

## Piante senza fonti

Nessuna: per tutte le 23 piante c'è almeno una pagina vera consultata. Per qualche dettaglio in più, vedi la sezione "Dubbi".

## Dubbi e dettagli da rivedere

- **Alta certezza riservata ad agraria.org**: spinaci, bietola, patate, piselli, fave e fagiolini si basano solo su quella scheda, senza seconda fonte incrociata.
- **Cose di Casa e Gardentopia** restano fonti divulgative complete ma non istituzionali: dove la loro affermazione è da sola (rucola, semi di patate, semi di melanzane, semi di zucchine, semi di zucca, semi di cetrioli, divisione del prezzemolo), la certezza è `bassa`, come previsto dalle regole del compito.
- **Rucola**: l'unica fonte è divulgativa (n21); nessuna fonte pubblica quantifica il gelo che regge.
- **Lattuga, semi**: la pagina n44 è una guida generale sui semi d'orto, non specifica per lattuga: è dichiarato anche nel JSON.
- **Prezzemolo**: la divisione dei cespi viene descritta solo da Gardentopia (n41), fonte sola e divulgativa.
- **Bietola**: nessun dettaglio su protezioni specifiche d'inverno (tessuto non tessuto o tunnel) in fonte; esito per prudenza resta "dipende".
- **Verze**: n20 non riporta una soglia numerica di temperatura, ma solo che la verza tollera il freddo e non il gelo.
- **Asparagi**: i numeri di distanza d'impianto (30-40 cm di profondità, 35 cm tra le piante) stanno nelle fonti divulgative n37/n38, coerenti tra loro; n36 (agraria.org) dà il resto.
- **Finocchi**: n31 dice chiaramente che sotto 7 °C la pianta monta a seme; n32 aggiunge il problema del gelo invernale.
- **Carote**: l'affermazione "il gelo leggero migliora il sapore" e i dettagli di protezione vengono da Gardentopia (n34), fonte divulgativa.
- **Cipolla, semi**: i dettagli di raccolta e di conservazione stanno in n30 (fonte divulgativa), che dà anche la distanza minima tra varietà (circa 500 metri).

## Controlli esclusi o non usati

- La scheda agraria.org "bietola da orto" (barbabietola rossa) non è stata usata per la bietola da coste, perché parla di una pianta diversa.
- Wikipedia e due pagine segnalate come redatte con l'intelligenza artificiale non sono state usate.

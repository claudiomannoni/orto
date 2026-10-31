# Roadmap

Ogni fase si può usare da sola: finita una, l'app resta utile anche se non si fa la successiva.

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Base: nome, stile, mascotte, struttura del progetto | in corso |
| 2 | Primo avvio guidato + calendario del mese + "Oggi in campagna" + calendario lunare | prova fatta con 5 colture di novembre, più il primo avvio guidato (senza luna); il resto da fare |
| 3 | Zone, misure, bussola, profilo del terreno, diario fotografico | da fare |
| 4 | Diagnosi da foto con Rosso e Rossella (IA) | da fare |
| 5 | Lombrichi e compost, galline, alberi e olivi | da fare |
| 6 | Piano dell'orto con consociazioni e rotazioni | da fare |
| 7 | Meteo (Open-Meteo) | da fare |
| 8 | Diario del raccolto e banca dei semi | da fare |
| 9 | Registro produzione e vendite | da fare |

## Fase 1 — Base

- [x] Colture, promemoria su Calendar, backup e offline della versione precedente, portati nella nuova struttura
- [x] Nome provvisorio "Orto in Tasca" (da confermare: vedi nota sul nome)
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

## Futuro, non ora

Account, forum, server IA con abbonamento, Play Store, condivisione dei dati per zona (solo con consenso).

# Struttura dell'app: analisi e proposte (informazioni facili da trovare, intuitività, utilità)

Scritto il 01/11/2026 sulla versione 2.55.0. È uno studio con proposte: **non cambia ancora niente nell'app**. Le misure sono state prese aprendo ogni schermata con un utente di prova (3 colture, 1 aiuola, su un telefono da 412 x 923 px) e contando altezza, collegamenti, pulsanti e titoli.

## 1. Cosa abbiamo oggi (misure vere)

| Schermata | Lunghezza (schermate di scorrimento) | Collegamenti | Pulsanti | Titoli | Tessere |
|---|---|---|---|---|---|
| Oggi | **4,6** | 12 | **31** | 11 | 5 |
| Il mio orto | 2,8 | 13 | 8 | 6 | **9** |
| Fotografa (dottore) | 1,6 | 3 | 3 | 2 | 3 |
| Calendario | 2,4 | 0 | 21 | 5 | 0 |
| Impara | **8,1** | **29** | 1 | 3 | 2 |
| Impostazioni | **4,3** | 2 | 13 | 10 | 0 |
| Schermate secondarie (zone, raccolto, semi, eccesso, animali, alberi...) | 0,5 - 1,7 | pochi | pochi | 1-4 | 0-10 |

23 schermate in tutto, con la barra a 5 voci (Oggi, Il mio orto, Fotografa, Calendario, Impara) e le altre raggiungibili da tessere dentro «Il mio orto» e «Impara», dall'ingranaggio (Impostazioni) e da un'icona senza etichetta in testata (il giardino dei vermi).

## 2. Problemi trovati

1. **«Oggi» è un elenco troppo lungo (4,6 schermate, 31 pulsanti).** Contiene meteo, «I tuoi primi passi», un blocco per ogni pianta (ognuno con cosa fare, accortezze, acqua, raccolta, fonti), il consiglio dei vermi, i lavori, «Per te oggi», «Lo sapevi?», la conversazione, i progressi e l'invito a installare. La cosa più importante («cosa devo fare adesso») è a metà pagina, dopo il meteo e le piante.
2. **«Il mio orto» ha nove tessere tutte uguali** (zone, diario, storia, raccolto, banca dei semi, il tuo eccesso, api-vermi-galline, colture speciali, alberi da frutto): cose di tipo diverso (il mio orto, le mie scorte, cose da imparare) mescolate, senza gerarchia.
3. **«Impara» è lunga 8 schermate**: tutte le 27 colture e le 71 parole una dopo l'altra, in un'unica pagina; la ricerca c'è ma non si capisce che serva a tutto. Alberi, animali e colture speciali (che sono «da imparare») stanno invece in «Il mio orto».
4. **Funzioni nascoste**: il giardino dei vermi si trova solo da un'icona senza nome in alto; la storia di una pianta e «Esamina con una foto» si trovano solo dentro il blocco della fase in «Oggi»; il piano visivo solo da un piccolo link nel «dall'alto».
5. **Impostazioni è lunga 4,3 schermate** con dieci titoli: aspetto, IA, backup, informazioni, vestiti dei vermi, tutto di seguito.
6. **Non c'è una ricerca generale**: chi cerca «lombrichi», «pomodoro» o «potatura» non sa in quale schermata guardare (colture? impara? animali? alberi?).
7. **Nomi che non aiutano**: «Colture» è diventato «Il mio orto» ma i testi dicono ancora «colture» ovunque; «Il tuo eccesso» sta per diventare «Disponibilità»; «Fotografa» è il dottore delle piante (e il nome non lo dice).
8. **Una pianta ha tre case diverse**: la sua carta in «Il mio orto», il suo blocco di fase in «Oggi», la sua storia (`#/pianta`), più la scheda generale della coltura (`#/coltura`) in «Impara». Chi vuole «tutto sulle mie zucchine» non ha un posto solo.
9. **Primo avvio con 8 domande**: tutte saltabili, ma sono tante prima di vedere qualcosa di utile.
10. **Tornare indietro**: le schermate secondarie non hanno un modo uniforme per tornare (a volte un pulsante, a volte solo la barra o il tasto del telefono).

## 3. Idee, in ordine di valore e di semplicità (tutte a costo zero)

### Subito (poco lavoro, grande effetto)
- **A. Raggruppare «Il mio orto» in tre sezioni con titolo**: *Il mio orto* (zone, piano, diario, storia), *Raccolti e scorte* (raccolto, disponibilità, banca dei semi) e *Allevamenti e frutteto* (api-vermi-galline, alberi) con le colture speciali in «Altre coltivazioni». Dalla tessera nove a tre gruppi, ognuno con 2-4 voci.
- **B. «Impara» a schede**: tre linguette in alto, *Colture*, *Parole*, *Altre coltivazioni* (alberi, animali, speciali) + quiz e domande a Rossella in evidenza; ricerca sempre visibile in cima. Da 8 schermate di scorrimento a circa 2 per linguetta.
- **C. Impostazioni a sezioni apribili** (Il mio orto, Intelligenza artificiale, Aspetto e accessibilità, Dati e backup, Informazioni): una sola sezione aperta alla volta.
- **D. Freccia «indietro» uniforme nelle schermate secondarie**, nella testata.
- **E. Etichettare il giardino dei vermi**: il tondino diventa «Gioca» (o una tessera «Pausa con i vermi» in «Impara»).

### Poi (lavoro medio)
- **F. «Oggi» riordinata in tre blocchi**: (1) *Adesso*: meteo in una riga e i lavori di oggi con l'acqua; (2) *Le mie piante*: una riga per pianta (nome, fase, giorni alla prossima fase, un pulsante «Apri») che si apre in una pagina sola; (3) *Per te*: consiglio dei vermi, «Lo sapevi?», quiz, progressi. «I tuoi primi passi» diventa una striscia sottile in alto. Obiettivo: da 4,6 a circa 2 schermate.
- **G. Pagina unica «La mia pianta»**: raccoglie in schede (*Oggi*, *Storia*, *Scheda*, *Piano*) le tre case di oggi: fase e cosa fare, acqua, raccolta e conservazione, foto in fila, scheda generale della coltura, posizione nell'aiuola, «Esamina con una foto». Dalla riga di «Oggi» e dalla carta in «Il mio orto» si arriva lì.
- **H. Ricerca generale**: un'icona lente in testata che cerca in colture, parole del glossario, animali, alberi, semi e curiosità, e porta alla schermata giusta. Si fa con i dati che abbiamo già, senza server.
- **I. Azione rapida «+»** sempre a portata di mano (raccolto, foto, nota, eccesso): oggi per segnare un raccolto servono tre passaggi.

### Più avanti
- **J. Primo avvio in tre domande** (zona, colture che interessano, il tuo nome facoltativo); le altre diventano «primi passi» più avanti.
- **K. «Disponibilità» e il mercato** nel posto giusto: «Raccolti e scorte» (vedi A), con il pulsante «Pubblica» che nasce dai lotti (vedi `docs/ECOSISTEMA.md`).
- **L. Nomi coerenti**: elenco dei nomi ufficiali (Il mio orto, Fotografa, Il giardino dei vermi, Disponibilità, Colture speciali...) usato in tutti i testi.
- **M. Un centro «Aiuto»** in Impostazioni con le domande frequenti (come si aggiorna, come si fa il backup, come si cancellano i dati) e la riapertura della guida dei vermetti.

## 4. Misure di successo (per decidere se è meglio)
- «Oggi» sotto le 2,5 schermate e sotto i 15 pulsanti.
- Qualsiasi funzione raggiungibile in al massimo 2 tocchi dalla barra, o con la ricerca.
- Nessuna schermata «lista infinita» (oltre 3 schermate) senza linguette o ricerca visibile.
- Le prove automatiche contano i tocchi richiesti per le 6 azioni principali: aggiungere una coltura, segnare un lavoro, segnare un raccolto, fotografare, vedere la fase di una pianta, aprire il piano.

## 5. Cosa NON si tocca
Barra a cinque voci (funziona e i test la proteggono), Fotografa al centro, dati e backup, offline, regole di sicurezza. Ogni modifica si fa un gruppo alla volta, con le 80 serie di prove verdi prima di pubblicare.

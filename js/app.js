(function (RS) {
'use strict';
RS.VERSION = '2.0';
RS.BUILD = 259;
RS.DATA_BUILD = '2026-11-11';
RS.versioneEstesa = () => RS.VERSION + ' · build ' + RS.BUILD + ' del ' + RS.DATA_BUILD.split('-').reverse().join('/');
RS.NOVITA = [
{ build: 259, data: '2026-11-11', voci: [
'Autostrade: nella scheda Strade il gruppo «Autostrada», con carreggiata autostradale a 2 o a 3 corsie (corsia di emergenza a destra, banchina interna a sinistra), autostrada 2+2 con new jersey, 3+3 con doppio guard-rail, curva autostradale e piazzola di sosta. Misure di partenza: corsie 3,75 m, emergenza 3,00 m, banchina interna 0,70 m.',
'Corsia di emergenza su ogni strada per corsie e sulle curve a raggio misurato: nelle proprietà, campo «Corsia emergenza» (0 = nessuna). Prende il posto della banchina alla destra di ogni senso di marcia, con la scritta sulla tavola. Lo spartitraffico può essere rialzato con aiuola, new jersey o doppio guard-rail.',
'Elementi nuovi: barriera antirumore e attenuatore d\'urto (Strade, Barriere stradali); triangolo di pericolo, freccia luminosa / carrello segnaletico e pannello a messaggio variabile con il testo mostrato (Arredo, Segnalazione del sinistro e cantieri).',
'Autodiagnosi: una prova nuova per le autostrade, 80 in tutto.'
] },
{ build: 258, data: '2026-11-11', voci: [
'Panoramica a 360° ripresa direttamente da RILSIN: Altro, Rilievo, «🌐 Panoramica 360°», «📸 Riprendi ora con RILSIN». Si apre la fotocamera con dei pallini bianchi: porti un pallino al centro del cerchio, stai fermo un attimo e lo scatto parte da solo. 24 foto (16 attorno all\'orizzonte e 8 più in basso, per l\'asfalto), circa un minuto; le scritte dicono da che parte girare. Alla fine RILSIN unisce le foto e chiede di toccare sulla tavola il punto in cui eri.',
'RILSIN misura da solo l\'ampiezza dell\'obiettivo del telefono confrontando le foto vicine; su Android la bussola orienta il segnaposto (con la freccia del Nord sulla tavola). Le foto si uniscono secondo i sensori: dove si toccano possono vedersi piccole imperfezioni, soprattutto su oggetti vicini o in movimento. Resta possibile scegliere una panoramica già fatta (fotocamera a 360°, la qualità migliore).',
'App Android: ora chiede il permesso della fotocamera, la prima volta che si fa una ripresa o una foto (serve per la panoramica dentro l\'app). La fotocamera si usa solo dentro RILSIN, mai per un sito.',
'Autodiagnosi: una prova nuova per la ripresa a 360°, 79 in tutto.'
] },
{ build: 257, data: '2026-11-11', voci: [
'Panoramiche a 360° della scena (Altro, Rilievo, «🌐 Panoramica 360°»): si sceglie la foto a 360° (fotocamera a 360°, Photo Sphere o Panorama di Android, Pano di iPhone) e si tocca sulla tavola il punto da cui è stata fatta. Compare il segnaposto viola P1, P2… con lo spicchio che indica dove guarda il centro della foto.',
'La panoramica si guarda a tutto schermo e si gira col dito (due dita per avvicinare), anche senza rete; in alto dice verso dove si guarda, se sulla tavola c\'è la freccia del Nord. Serve a tornare sul posto quando la scena non c\'è più: che cosa vedeva un conducente, se un segnale era visibile, dov\'era un ostacolo.',
'«📷 Aggiungi questa vista al fascicolo»: l\'inquadratura del momento diventa una foto del fascicolo, con la didascalia già scritta (es. «Vista dalla panoramica P1, verso Nord-Est»). La panoramica intera non si stampa: resta nel dispositivo, nel file della tavola e nella copia di sicurezza, come le foto dei documenti.',
'Le foto delle fotocamere a 360° che registrano l\'orientamento si girano da sole sulla tavola (con la freccia del Nord); per i panorami «a striscia» RILSIN chiede quanto giro si è fatto.',
'Autodiagnosi: una prova nuova per le panoramiche, 78 in tutto.'
] },
{ build: 256, data: '2026-11-11', voci: [
'Schermata di apertura: il logo è animato. Le due strade si disegnano dal centro, il veicolo blu e quello verde arrivano all\'incrocio e compare il punto d\'urto rosso, con un\'onda che si allarga e poi pulsa piano. Sui telefoni impostati con «riduci animazioni» il logo resta fermo.'
] },
{ build: 255, data: '2026-11-11', voci: [
'Schizzo collaudato con 800 disegni simulati come fatti col dito (tratti tremolanti, inizi e fine imprecisi, a zoom diversi): croci, incroci a T, strade oblique dal centro o che attraversano l\'incrocio, prosecuzioni, rotatorie e strade aggiunte alla rotatoria. Corretti i casi in cui qualcosa spariva o si deformava:',
'— con la vista lontana, due strade corte che si incrociano avevano le punte vicine e venivano unite in un angolo: ora, se si attraversano, restano un incrocio;',
'— la «punta» che sborda oltre un incrocio e viene tagliata è al massimo di 12 m e di circa 1 cm sullo schermo (con la vista lontana poteva arrivare a 24 m e tagliare un braccio vero);',
'— un cerchio disegnato con la vista ravvicinata poteva essere preso per strisce pedonali: ora è una rotatoria;',
'— una strada che arriva a filo della rotatoria senza entrarci risultava «dentro la rotatoria» e non veniva aggiunta: ora si collega.',
'Autodiagnosi: i casi trovati nel collaudo sono entrati nelle prove.'
] },
{ build: 254, data: '2026-11-11', voci: [
'Schizzo, incroci con strade corte: due strade che si incrociano a metà venivano prese per un pezzo che prosegue l\'altro e fuse in una curva sola, oppure mezza strada veniva tagliata come una «punta» che sborda; anche una strada obliqua aggiunta su un incrocio poteva far sparire un braccio. Ora l\'incrocio resta tale, e una strada che parte da un incrocio è un braccio nuovo (si unisce a un\'altra solo se la prosegue quasi dritta).',
'Schizzo, rotatoria (cerchio sopra un incrocio): ogni strada che ci arriva si divide sul cerchio e diventa un braccio, anche obliqua o un po\' fuori centro; una strada curva resta curva oltre il braccio. Prima una strada poteva sparire o diventare un braccio dritto.',
'Schizzo: una strada disegnata dopo fino alla rotatoria (o che la attraversa) si collega da sola: diventa un suo braccio, o un braccio corto con la strada attaccata se arriva di sbieco o in curva.',
'Informazioni, pagina di presentazione e licenza: tolta la frase sull\'applicativo non distribuito dall\'Arma.',
'Autodiagnosi: una prova nuova per incroci e rotatorie dello schizzo, 77 in tutto.'
] },
{ build: 253, data: '2026-11-11', voci: [
'PC, RILSIN installato come app da Edge o Chrome (dal sito, icona «Installa app» nella barra dell\'indirizzo): una tavola salvata si apre con un doppio clic sul file, o con il tasto destro, «Apri con», RILSIN, come un documento di Word. Se RILSIN è già aperto la tavola arriva in quella finestra; se quella aperta ha modifiche non salvate, prima lo chiede. Restano gli avvisi di Apri (tavola di un collega, salvata con una versione più nuova). Il primo Salva chiede il permesso di scrivere nel file.'
] },
{ build: 252, data: '2026-11-11', voci: [
'Pagina di presentazione di RILSIN: axeleuse.github.io/rilsin/presentazione.html. Dice che cosa fa l\'app, come si installa su Android, iPhone, iPad e PC, con le novità delle ultime versioni, la guida e i contatti. È il link da passare ai colleghi; l\'app dal sito resta allo stesso indirizzo di prima.',
'App per Android scaricabile anche dalla pagina di presentazione (tasto «Scarica per Android»), sempre all\'ultima versione. Resta disponibile anche sul canale Telegram.',
'Diritti d\'autore: sul sito il file di licenza «Tutti i diritti riservati». L\'app si usa gratuitamente; il codice non si può copiare, modificare o ripubblicare senza il permesso dell\'autore.',
'Nome dell\'autore senza grado (MANZONI Alessandro) nell\'app, nella guida e sul sito. Nella guida la schermata della tavola è aggiornata.'
] },
{ build: 251, data: '2026-11-11', voci: [
'App Android: Salva non funzionava e mancavano «Esporta la tavola» e «Condividi». Le versioni recenti di Android dichiarano la finestra «Salva con nome» del PC, che nell\'app non si apre: RILSIN credeva di essere su un PC. Ora sul telefono le tavole si salvano sempre nel dispositivo e i tasti Esporta e Condividi sono tornati.',
'Configurazione iniziale (Dati del Comando): sul telefono la finestra ora scorre e i tasti «Salta per ora» e «Salva e continua» restano sempre visibili in fondo, grandi da toccare.',
'Segnala un problema più a portata di mano: nel menu iniziale, in Altro (Applicazione) e in cima alle Informazioni, oltre che nel menu del PC.',
'Informazioni: nuova sezione «Sostieni RILSIN», più chiara. Nel menu iniziale il tasto «Sostieni RILSIN» porta lì.',
'Foto di sfondo: «✂ Ritaglia» nelle proprietà (e in Altro, Foto aerea). Si trascinano gli angoli e i lati del riquadro; la parte tenuta resta esattamente al suo posto, in scala e con la stessa rotazione, quindi la calibrazione non si perde. Annulla la riporta intera.',
'Foto di sfondo bloccata: un tocco sullo sfondo, con nulla di selezionato, mostra «🔒 Sfondo bloccato» con il tasto «🔓 Sblocca». Nelle proprietà i tasti «Blocca lo sfondo» / «Sblocca lo sfondo» al posto della casella; anche Altro, Foto aerea, li propone.',
'Veicoli sopra la foto di sfondo: un tocco vicino al veicolo (o a un punto, un segnale…) prende quello e non più lo sfondo. Col dito lo sfondo prima si seleziona e si sposta solo con un secondo trascinamento, così non si sposta più per sbaglio.',
'Frecce di marcia dei veicoli più lunghe (quasi quanto il veicolo, almeno 3,5 m) e semitrasparenti: con veicoli vicini le frecce che si incrociano non coprono più il disegno e si capisce dove punta ciascuna.'
] },
{ build: 250, data: '2026-11-10', voci: [
'Apri, con più di 5 tavole nel telefono: compaiono tutte, con un campo di ricerca. Si cerca per nome, via, comune, data, numero di protocollo, targa o nome di conducenti, proprietari e pedoni (es. «AB123», «Rossi», «via roma 08/11»).',
'Nome proposto al primo salvataggio: data del sinistro e luogo presi dall\'intestazione (es. «Sinistro 08/11/2026 Via Roma»), invece della sola data di oggi. Si può sempre cambiare.'
] },
{ build: 249, data: '2026-11-10', voci: [
'Scambio dati, «✍ Firme per ricevuta sullo schermo»: quando consegni la copia, la parte firma con il dito sul telefono. La firma, con la data e l\'ora della consegna, entra nel documento al posto della riga «Per ricevuta»; lo stesso per la firma dell\'operatore. Vale solo per la persona con cui è stata presa: se il nome cambia, torna la riga da firmare a penna.',
'Promemoria della copia di sicurezza: se le tavole del telefono non sono state copiate da più di una settimana e qualcuna è cambiata, dopo il salvataggio compare il tasto «💾 Fai la copia» (al massimo una volta al giorno). In Informazioni, Memoria, la data dell\'ultima copia.'
] },
{ build: 248, data: '2026-11-10', voci: [
'iPhone e iPad: con più veicoli sulla tavola, aggiungendone uno ricomparivano quelli eliminati, ed eliminandone uno sparivano tutti. Era un difetto di ridisegno di Safari con l\'ombra sfumata di veicoli ed edifici: su iPhone, iPad e Safari l\'ombra ora è disegnata in modo semplice e la tavola mostra sempre quello che c\'è davvero.',
'Più sicurezza sui dati: ogni oggetto della tavola ha sempre un identificativo suo. Se una tavola ne avesse due uguali (e quindi eliminandone uno sparirebbero entrambi), all\'apertura vengono separati da soli.'
] },
{ build: 247, data: '2026-11-10', voci: [
'Guida PDF: ora si apre anche sui telefoni. Nell\'app Android va al lettore PDF del telefono (prima non era nemmeno inclusa nell\'app); su iPhone e iPad il sito riapriva l\'app invece del manuale.',
'Proprietà: tutte le spiegazioni sotto i campi sono nascoste e si mostrano con il tasto «Spiegazioni» in testa al pannello (prima alcune, come quella delle corsie, restavano sempre visibili). Restano in vista solo avvisi e risultati.',
'Proprietà delle strade, degli incroci e delle curve: le frecce delle corsie sono disegnate, della stessa misura su ogni telefono (prima la freccia a sinistra poteva uscire più piccola).'
] },
{ build: 246, data: '2026-11-10', voci: [
'Tasto Salva della tavola sul telefono: dal secondo salvataggio la tavola si aggiorna senza finestre, e l\'unico segnale era un messaggio che finiva nascosto dietro i tasti dello zoom, così sembrava che non succedesse nulla. Ora compare ben visibile «✓ Tavola salvata nel dispositivo», con un breve colpetto di vibrazione.',
'iPhone e iPad (app dal sito): Salva e Apri cercavano l\'archivio condiviso dell\'ufficio, che sul sito non esiste, e non salvavano. Ora le tavole si salvano nel dispositivo, come sul telefono Android.'
] },
{ build: 245, data: '2026-11-10', voci: [
'iPhone: i salvataggi di file (esporta la tavola, copia di sicurezza, PNG, Word) non facevano nulla quando il file richiedeva un attimo per essere pronto. Ora compare «📄 File pronto» con il tasto «Salva o condividi»: un tocco apre il menu Condividi, da cui si sceglie «Salva su File».',
'Aspetto in un solo comando (Altro, Vista, «🎨 Aspetto»; sul PC il tasto Aspetto): Scuro, Chiaro, Pieno sole o Notte. Al posto dei comandi separati Pieno sole, Notte e Tema chiaro/scuro.',
'Segnala un problema: si invia per e-mail a rilsin.app@gmail.com, con l\'app di posta del telefono e tutto già scritto.',
'Modalità notte (Altro, Vista; sul PC il tasto Notte): tavola, piantine, foto e documenti attenuati per non abbagliare durante i rilievi notturni. Pieno sole e Notte si escludono.',
'Condizioni di luce nell\'intestazione: «☀ Calcola» scrive giorno, alba o crepuscolo, oppure notte dalla posizione del sole all\'ora del sinistro (senza internet); con il sole basso aggiunge la direzione e il possibile abbagliamento. Si compila da solo quando il GPS rileva la posizione. Va nel cartiglio e nel fascicolo.',
'Informazioni, «🐞 Segnala un problema»: un testo pronto da incollare nel canale con versione, dispositivo ed eventuali errori dell\'app, senza dati delle tavole o dei coinvolti.',
'iPhone e iPad: aggiornamenti molto più leggeri e affidabili. Prima ogni nuova versione riscaricava tutti i 27 MB dell\'app (compreso il lettore dei documenti) in una seconda copia: su iPhone poteva mancare lo spazio o il download si interrompeva chiudendo l\'app, e «Aggiorna ora» non compariva. Ora si scaricano solo i file cambiati, di solito pochi KB, senza doppioni. Quando parte compare «Scarico l\'aggiornamento…»; in Informazioni c\'è «Controlla aggiornamenti».',
'Telefono, iPhone e browser: in Apri, «Copia di sicurezza di tutte le tavole» crea un solo file .zip con tutte le tavole e le loro foto, da conservare fuori dal telefono (Salva su File, Drive, PC); «Ripristina da una copia di sicurezza» le rimette, anche su un telefono nuovo. Le tavole già presenti restano come sono.',
'iPhone, iPad e app dal sito: all\'avvio RILSIN chiede al browser di non cancellare da sé tavole e foto (prima lo chiedeva solo aprendo il fascicolo fotografico). In Informazioni la voce «Memoria» dice quanto spazio occupano e se sono protette.',
'Autodiagnosi: due prove nuove (forme dello schizzo fuori strada, loghi negli atti), 76 in tutto.',
'Timbro del Comando senza testo predefinito: al primo avvio e nelle tavole nuove il campo è vuoto (prima proponeva «LEGIONE CARABINIERI»), con un esempio in grigio; ognuno scrive il proprio Comando o la propria istituzione.',
'Loghi negli atti a scelta: in «Dati del Comando» (primo avvio) e in Dati e misure, Intestazione, si cambiano il logo del Comando (planimetria e cartiglio) e l\'emblema in cima a verbale, fascicolo e scambio dati, oppure si toglie ciascuno («Nessuno»); «Originale» li rimette. Per chi usa RILSIN in un\'altra istituzione. La scelta resta nel dispositivo.',
'iPhone e iPad: le lettere dei veicoli, i numeri dei punti e le altre scritte del disegno sono di nuovo al centro dei loro cerchi (Safari le spostava un po\' in alto).',
'iPhone e iPad: verbale, planimetria, scambio dati e fascicolo si aprono larghi come lo schermo e non più ingranditi; Safari non ingrandisce più da solo i caratteri.',
'Sicurezza (app Android): la pagina dell\'app, che comunica con il telefono, resta sempre dentro RILSIN; qualunque collegamento verso internet si apre nel browser del telefono. I nomi dei file salvati o condivisi vengono ripuliti (niente cartelle nascoste nel nome). Testi nei documenti e nelle finestre protetti in ogni posizione.',
'Schizzo: un tocco su un edificio (o su albero, cartello, testo, strisce, frenata) ora lo seleziona, come i veicoli: tenuto premuto e trascinato si sposta, con le maniglie si gira o si ridimensiona. Prima il trascinamento disegnava una strada.',
'Schizzo: un rettangolo più largo di qualunque veicolo (oltre 4,5 m) fuori strada diventa un edificio e non più un mezzo pesante.',
'iPhone e iPad: anche qui il telefono legge da solo i dati dalla foto di patente, carta di circolazione, carta d\'identità e documento assicurativo, senza internet, con lo stesso lettore dell\'app Android (stessi risultati sulle foto di prova). La prima lettura richiede qualche secondo in più perché si prepara il lettore.',
'iPhone e iPad: RILSIN come app web da Safari («Condividi → Aggiungi alla schermata Home»), con la sua icona, a tutto schermo e anche senza rete. Gli aggiornamenti arrivano da soli: l\'app chiede «Aggiorna ora». Verbale, planimetria, scambio dati e fascicolo si aprono dentro l\'app con «Stampa / PDF»; i file da salvare vanno al menu Condividi (Salva su File, Mail, AirDrop).',
'Guida PDF ricontrollata: in copertina e a piè di pagina la versione è quella dell\'app (2.0, non più 1.2); descritti anche la barra di stato sul telefono, il tasto «ℹ Spiegazioni» delle proprietà e gli edifici tratteggiati.',
'Verifiche RCA, revisione e rubato nell\'app Android senza le pagine dei siti: i siti ufficiali si caricano nascosti dentro RILSIN con tipo di veicolo e targa già scritti (anche la tipologia per la revisione). Un pannello mostra per ciascuno l\'immagine del codice di controllo copiata dal sito e il campo dove scriverlo; con «Verifica tutto» le tre immagini sono insieme. Si scrivono i codici e si preme Verifica: i risultati compaiono nel pannello e poi vanno nella scheda. Se un codice è sbagliato compare la nuova immagine; ↻ ne chiede un\'altra. Il codice lo legge e lo scrive sempre l\'operatore. «Apri la pagina del sito» resta per i casi in cui un sito cambia.',
'Misure guidate: la piantina del veicolo non cambia più dimensione da una misura all\'altra. Il riquadro ha un\'altezza fissa, il veicolo è sempre disegnato orizzontale e alla stessa scala, e la freccia dice da che lato del veicolo sta il caposaldo. In alto marca e targa del veicolo («Veicolo A · Fiat Panda · AB123CD»), prese dalle proprietà o dalla scheda dei coinvolti.',
'Nome della via: si sposta trascinandolo dove si vuole (in Selezione subito; nello schizzo tenendolo premuto un attimo, poi trascinando). Resta inclinato come la strada e segue la strada se questa si sposta; nelle proprietà della strada «Nome della via nella posizione automatica» lo rimette dove lo sceglie l\'app.',
'Verifica copertura RCA: compagnia e scadenza vanno nella scheda; il numero di polizza il servizio pubblico non lo mostra, quindi alla fine «Fotografa il documento assicurativo» (anche il certificato digitale sul telefono della parte) o «Scrivi il numero di polizza». Se un giorno il sito mostrasse anche il numero, verrebbe letto da solo.',
'Misure guidate sul telefono: la schermata si adatta all\'altezza dello schermo. La piantina del veicolo prende lo spazio che resta e sui telefoni più bassi i tasti si stringono un poco: Salta e Indietro restano sempre visibili senza scorrere.',
'Telefono, barra in basso: «📋 Mancano … voci» (che cosa manca prima di lasciare il luogo) e la procedura sono i primi, sempre visibili; tolti strumento e coordinate del puntatore, che al tocco non servono.',
'Schizzo: spostando un veicolo si sposta con lui anche la sua frenata (e la sua freccia), anche con le frecce della tastiera sul PC. Vale anche per le frenate dei disegni già fatti che partono dal veicolo.',
'Carta d\'identità, retro: si legge anche la residenza (via e comune) e la scadenza dalla zona a lettura ottica. Fronte: il comune che l\'ha rilasciata e la scadenza. Si legge anche la vecchia carta cartacea (cognome, nome, nato il, a, residenza e via, numero tipo AT 1234567, comune e scadenza). Dal documento del proprietario anche la sua residenza.',
'Scheda della persona: nuovi campi «Rilasciato da» e «Scadenza» del documento, compilati dalla foto; nei controlli in cima alla scheda l\'avviso se il documento era scaduto il giorno del sinistro; nell\'atto di scambio dati il documento riporta anche chi l\'ha rilasciato e la scadenza.',
'Schizzo: gli oggetti si spostano anche senza uscire dallo schizzo. Caposaldi, punti fissi e punto P del pedone si trascinano direttamente col dito; un veicolo o un altro oggetto si tocca una volta (si seleziona), poi si tiene premuto un attimo (un colpetto di vibrazione) e si trascina. Un tratto che parte subito dal veicolo resta una frenata o una freccia, anche se il veicolo è selezionato; un tocco senza spostamento apre come prima il menu dell\'oggetto.',
'Misure guidate: in alto una piccola piantina del veicolo di cui si parla, con i suoi punti numerati, il punto da misurare in rosso e il nastro tratteggiato dal caposaldo (o una freccia che dice da che parte è il caposaldo).',
'Veicolo aggiunto dopo: quelli presi dalla tavolozza hanno subito i punti numerati, e le misure guidate li aggiungono a quelli che ne erano privi; così anche un veicolo dimenticato entra in «Aggiungi misura». Nel menu del veicolo nello schizzo il tasto «👤 Dati» e nelle proprietà «Scheda completa del veicolo» aprono la sua scheda dei coinvolti, per scrivere i dati o fotografare i documenti.',
'App Android: l\'anteprima del PDF si apre intera sullo schermo e si ingrandisce o rimpicciolisce con due dita.',
'Carta d\'identità: quando le scritte italiana e inglese sono su due righe («LUOGO E DATA DI NASCITA» e sotto «PLACE AND DATE OF BIRTH») luogo e data di nascita si prendono dalla riga giusta, non più dalla scritta inglese.',
'Foto dei documenti scattate con il telefono: restano anche nella galleria, cartella RILSIN/Documenti, per ogni uso futuro (sempre fuori dal fascicolo fotografico).',
'Tolto il servizio di verifica a pagamento: le verifiche usano solo i siti pubblici e gratuiti.',
'Lettura dei documenti: un documento capovolto e storto si rilegge girato; le parole della stessa riga separate dal lettore si riuniscono; i campi si riconoscono anche con il punto mancante («2 MARIO»), con l\'etichetta su una riga e il valore sotto, con «R0ma», «AMB1/B», «Pofizza», date senza barre e la M letta come W (corretta con il codice fiscale). Su foto di prova difficili i dati giusti nella scheda passano dall\'87% al 97,5%.',
'Lettura dei documenti potenziata: il telefono raddrizza da solo il documento inclinato, ingrandisce la zona del testo se è lontano, corregge contrasto, buio e riflessi e rilegge le righe incerte. Su foto di prova rovinate gli errori sui caratteri scendono dal 5,5% allo 0,2%.',
'Controlli sui dati, senza internet, in cima alle schede: codice fiscale con nome, nascita, sesso e luogo; assicurazione e patente rispetto al giorno del sinistro; categoria di patente e tipo di veicolo; scadenza della revisione calcolata dalle date; telaio e marca; targa e tipo di veicolo. Dalla carta di circolazione si legge anche la prima immatricolazione.',
'Carta di circolazione: il telaio (campo E) si legge anche quando il lettore confonde O e 0 o lo spezza; dal campo C.2.3 anche la residenza del proprietario. Nella scheda il campo si chiama solo «Telaio».',
'Proprietario: nella sua parte della scheda i tasti per fotografare la carta di circolazione e il suo documento d\'identità; i dati letti vanno nei campi del proprietario.',
'Verifiche: «Verifica tutto» apre di seguito copertura RCA, revisione e rubato; scrivi solo il codice di controllo di ciascun sito. La finestra si chiude da sola appena il risultato è letto. Compagnia, scadenza e la nuova parte «Revisione» (data, esito, km) si riempiono da sole nei campi vuoti; un riepilogo finale segnala i dati diversi da quelli già scritti.',
'Schizzo, strade oblique: un innesto di sbieco (anche ad angolo stretto) non cancella più un pezzo del bordo opposto della strada principale e non lascia più un dente squadrato fuori dall\'asfalto; viene riconosciuto come incrocio a T.',
'Schizzo: una linea tracciata sopra una strada già disegnata e oltre il suo capo la allunga fin dove arriva (anche da tutte e due le parti); se dopo il capo la linea piega, la strada prosegue con una curva. Una linea tutta sopra la strada non aggiunge nulla; una che se ne stacca di lato è una diramazione.',
'Menu iniziale: ogni bozza non salvata ha il cestino per eliminarla (con conferma). La bandiera in alto arriva fino al bordo dello schermo.',
'Informazioni e diritti: sul telefono la data dell\'aggiornamento non esce più dal riquadro.',
'Sul telefono: «Offri un caffè all\'autore», in fondo al menu e nelle Informazioni, per chi vuole sostenere il progetto.',
'Coinvolti: targa, marca e modello, conducente e tipo scritti prima nelle proprietà del veicolo disegnato compilano da soli i campi vuoti della sua scheda.',
'Legenda del pannello: dice il modello e la targa del veicolo («A — Fiat Panda (AB123CD)»), non più solo «Autovettura».',
'Freccia di marcia anche sui veicoli presi dalla tavolozza; nello schizzo, Altro, «Frecce: sì / no» le toglie o le rimette a tutti i veicoli.',
'Proprietà: le spiegazioni sotto i campi sono nascoste; il tasto «ℹ Spiegazioni» in alto le mostra.',
'Nome della via scritto sull\'asfalto, lungo la strada, in un punto non coperto da veicoli o da altre strade. Edifici con tratteggio e doppio contorno, riconoscibili anche in bianco e nero.',
'Schizzo: un pezzo di strada curvo innestato su un\'altra strada non cancella più un tratto del bordo opposto.',
'Coinvolti: i veicoli sono uno per lettera del disegno (le posizioni della dinamica A′, A″ non contano come altri veicoli). Una scheda vuota di un veicolo che sul disegno non c\'è più si toglie da sola; se ha dei dati resta, con l\'avviso «non c\'è un veicolo … sul disegno». Nella scheda si può cambiare la lettera: le foto dei documenti la seguono.',
'Foto dei documenti: oltre a scattarla si può prendere dalla galleria del telefono (anche una scansione); il testo si legge lo stesso.',
'Barra più chiara. Sul telefono, nell\'ordine del lavoro: Menu, Salva, Schizzo, Coinvolti, Misure, Foto (fascicolo fotografico con le foto guidate), Atti. «Coinvolti» apre in ogni momento le schede di veicoli e persone, per scrivere i dati o fotografare i documenti, anche senza procedura guidata. «Atti» raccoglie verbale di rilievi, scambio dati tra le parti, fascicolo, planimetria e controllo. Sul PC: Coinvolti nel gruppo Rilievo e menu «Atti» con anche lo scambio dati.',
'Triangola (sul telefono) e il segnaposto «punto di ripresa di una foto» sul disegno ora stanno nel menu Altro.',
'Atto di scambio dati: si può inviare per e-mail alle parti (conducenti, pedoni e proprietari che non guidavano), un messaggio breve per ciascuno con l\'atto in PDF allegato, dalla tua app di posta. Nel PDF la chiusura indica la trasmissione per posta elettronica (indirizzo, data e ora) al posto della firma per ricevuta. Nelle schede c\'è il campo E-mail. Nell\'atto e nell\'e-mail c\'è anche se ci sono persone ferite (dall\'esito indicato nelle schede; se manca, la voce si completa a penna).',
'Verifiche sulle banche dati (scheda del veicolo): Copertura RCA e Revisione sul Portale dell\'Automobilista, Rubato o smarrito sul sito del Ministero dell\'Interno. Nell\'app Android il sito si apre dentro RILSIN con tipo di veicolo e targa già scritti: si scrive solo il codice di controllo e il risultato si legge da solo. Compagnia e scadenza si inseriscono con un tocco; l\'esito resta nella scheda con data e ora.',
'Foto dei documenti (patente, carta di circolazione, carta d\'identità, assicurazione): restano nella scheda del coinvolto e non vanno più nel fascicolo fotografico. Quelle già nel fascicolo delle tavole precedenti passano da sole nelle schede.',
'Lettura dei documenti (app Android): dopo la foto di patente, carta di circolazione, carta d\'identità o documento assicurativo il telefono legge il testo, senza internet, e propone i dati; si sceglie quali inserire. Codice fiscale e zona a lettura ottica controllati con le cifre di controllo; i campi letti hanno il bordo giallo finché non li tocchi.',
'Procedura guidata (menu iniziale e «Inizia il disegno»): 1 dati dei coinvolti, 2 disegno, 3 misure, 4 foto, 5 atti; in basso «Procedura · n di 5» riapre i passi. «Inizia il disegno» rifatto, più ordinato.',
'Coinvolti: per ogni veicolo targa, conducente, patente, proprietario, assicurazione e passeggeri; pedoni e testimoni. Dal codice fiscale (controllato) data e luogo di nascita e sesso. Targa, marca e conducente passano da soli al veicolo disegnato con la stessa lettera.',
'Atto di scambio dati: una copia per ogni conducente e pedone, con i dati di tutti i veicoli e le voci scelte.',
'Pieno sole (Altro, Vista; sul PC menu Vista): bianco e nero ad alto contrasto, scritte in grassetto e pulsanti più marcati, per leggere lo schermo all\'aperto. La tavola non cambia; l\'app ricorda la scelta.',
'Telefono: il tasto Indietro di Android chiude una cosa alla volta (finestra, menu, misure o foto guidate, schizzo, selezione) e riporta al menu; dalla pagina iniziale chiede se uscire. Lo schermo resta acceso durante schizzo, misure guidate e foto guidate. Un colpetto di vibrazione conferma oggetto riconosciuto, misura registrata (tre se la misura non torna) e foto arrivata.',
'Versione 2.0: schizzo che capisce la scena, foto guidate, verbale e planimetria in stile ufficiale.',
'Schizzo: «Fine» chiede che cosa fare (passa alle misure, foto guidate, modifica il disegno, porta sul PC); «Passa alle misure» non sta più fra le penne. Con la penna «Modifica» si spostano, girano e sistemano gli oggetti senza uscire dallo schizzo.',
'Schizzo: «Altro» si apre e si richiude; ogni veicolo ha subito la sua freccia di marcia, che gira e si sposta con lui (Gira se è al contrario; si toglie dalle proprietà); il pedone ha il suo punto P per le misure.',
'Foto guidate: in alto quante foto sono fatte e quante mancano. Nel benvenuto e nel menu il nome dell\'autore non si spezza più.',
'Foto guidate (Fascicolo fotografico, o da «Passa alle misure» nello schizzo): una foto alla volta, dal generale al particolare, costruite su ciò che c\'è sulla tavola. Per ogni foto dice che cosa inquadrare, da dove (sulla piantina) e prepara la didascalia.',
'Nelle foto guidate anche interno del veicolo, chilometri, marcia inserita, sistemi di ritenuta e airbag, casco per le moto, cadavere se c\'è. Dall\'app Android si scatta con la fotocamera del telefono: l\'originale resta nel telefono, cartella RILSIN, la copia va nel fascicolo.',
'Schizzo: niente più lineette che restano sulla tavola. Un tratto interrotto dal sistema sparisce; un tratto corto e incerto si vede solo tratteggiato finché non scegli; toccando un oggetto (anche strada, frenata, freccia, tratto libero) lo puoi eliminare.',
'Schizzo: strade sovrapposte più pulite. Due strade che si incontrano alle estremità diventano una sola con l\'angolo raccordato, un pezzo che riparte sopra la fine di un altro lo prosegue, le punte fino a 12 m oltre un incrocio si tagliano.',
'Telefono: barre e pulsanti non si tagliano più con il carattere grande di Android né con la barra del browser; la scala della vista non copre più le penne e «Inizia il disegno».',
'Schizzo: il veicolo resta dove e come lo tracci, anche di traverso o fuori strada; si allinea alla corsia solo se è quasi parallelo. Un rettangolo fuori strada non viene più preso per un edificio se è allungato e non enorme.',
'Schizzo: collisione. Un veicolo tracciato a contatto con un altro viene accostato fino a toccarlo e l\'app propone «Metti il punto d\'urto»; la X dell\'urto si riconosce anche grande e sopra i veicoli, e il simbolo è più visibile.',
'«Inizia il disegno» non copre più la tavola: è una striscia in alto, sparisce appena prendi uno strumento e si chiude con la ✕; fra le scelte anche Schizzo. Nello schizzo anche il riquadro sotto la tavola si chiude con la ✕.',
'Schizzo nuovo: il tratto a mano non si copia, si interpreta. Con la penna Auto le linee diventano strade pulite, anche in curva e senza punte oltre gli incroci; un cerchio su un incrocio diventa una rotatoria; un rettangolo su una strada diventa un veicolo con la sua lettera e i punti numerati per le misure (A1, A2…), allineato alla corsia.',
'Nello schizzo anche: frenata (linea che arriva a un veicolo), direzione di marcia (freccia), punto d\'urto (piccola X), strisce pedonali (zig-zag su una strada), edifici, moto e bici. Sotto la tavola si legge che cosa ha capito l\'app, con Annulla ed «È altro» per correggere con un tocco; le altre penne creano sempre quell\'oggetto.',
'Un tocco nello schizzo chiede che cosa mettere: punto fisso con la lettera scelta da te, nome della via (passa all\'intestazione), urto, pedone o testo; su un veicolo gira, cambia tipo o elimina.',
'«Passa alle misure»: dice che cosa manca e che cosa va misurato, poi apre le Misure guidate oppure porta la tavola sul PC per aggiungere il resto.',
'App Android: lo screenshot di Google Maps arriva senza passare dalla galleria. Si tocca Condividi sullo screenshot, si sceglie RILSIN e l\'immagine va sulla tavola, pronta per calibrare la scala.',
'Verbale di rilievi: nella formula d\'apertura l\'anno e il giorno sono scritti in cifre («L\'anno 2026, addì 4 del mese di novembre»).',
'Timbro del Comando a tre righe (per esempio Legione, Compagnia, Stazione) nel verbale, nella planimetria, nel fascicolo fotografico e negli altri documenti; le tavole già fatte restano a due righe finché non si compila la riga nuova.',
'Intestazione più chiara: «Via o luogo del sinistro» e «Comune» sono due campi distinti. Se il comune viene scritto anche nella via, il verbale lo riporta comunque una volta sola; la frase si adatta da sola («in Via Roma…», «sulla SS 36…», «in località Ponte Vecchio…», sempre seguita da «del comune di…»).',
'Il comune compare anche nella planimetria e nel fascicolo completo e viene salvato nei luoghi.',
'Verbale di rilievi più compatto: una sola tabella per tutti i veicoli, con una riga di titolo per ciascuno (marca, targa, conducente, danni) e sotto i suoi punti, che restano sullo stesso foglio; righe e spazi ridotti, meno fogli.',
'Corretto: i punti di un veicolo chiamato F non compaiono più anche fra le tracce di frenata; con un solo foglio il verbale scrive «n. 1 foglio».',
'Verbale di rilievi: il numero dei fogli («Il presente verbale è composto da n. … fogli») si conta da solo prima della stampa, anche nel fascicolo completo; nella versione Word resta da completare.',
'Verbale di rilievi: la formula d\'apertura porta la data e l\'ora in cui si stampa il verbale («… presso il Comando in intestazione, i sottoscritti … danno atto di aver proceduto il giorno … ai rilievi del sinistro avvenuto il …»).',
'Intestazione: nuovi campi «Inizio dei rilievi» e «Fine dei rilievi» (con il pulsante «Adesso» per scriverli sul posto), usati nella chiusura del verbale; «Data e ora» diventa «Data e ora del sinistro».',
'Esportazione PNG e SVG uguale alla stampa: lo stesso foglio «Planimetria del campo del sinistro», con legenda, Comando, dati, scala, Nord e firme (PNG a 250 punti per pollice); le miniature dell\'archivio mostrano solo il disegno.',
'L\'atto delle misure diventa VERBALE DI RILIEVI PLANIMETRICI: intestazione come il fascicolo fotografico, apertura di rito («L\'anno…, addì… del mese di…, i sottoscritti…») compilata dai dati della tavola, paragrafi numerati, chiusura con orari dei rilevamenti, fotogrammi e «Fatto, letto e sottoscritto», firme dei verbalizzanti, «foglio 1 di 2» a piè di pagina.',
'La stampa del disegno diventa PLANIMETRIA DEL CAMPO DEL SINISTRO, allegata al verbale: legenda con capisaldi, base, metodo, veicoli ed elementi rilevati; Comando con il logo, dati del rilievo con lo stato (BOZZA o DEFINITIVO), scala, Nord e firme.',
'Salva nelle cartelle di rete: se il file è occupato (antivirus, copia in corso) l\'app riprova da sola e, se non ci riesce, avvisa e propone «Riprova» o «Salva come nuovo file» (prima non salvava senza dire nulla).',
'Dinamica: le posizioni prima della quiete hanno le ruote diritte e il mezzo sulle ruote; i danni compaiono solo dall\'urto.',
'PC: menu del tasto destro sulla tavola. Sul vuoto: inserisci qui caposaldo, punto P, foto, testo o gli ultimi oggetti usati; incolla qui; quota da qui; righello, triangola, vista. Su un oggetto: duplica, copia, ruota, specchia, livello, blocca e i suoi comandi (punti di rilievo, raccordi, nome della via, bracci, triangola da qui, calibra). Con più oggetti: ruota insieme, allinea, raggruppa. Mentre si traccia: fine, togli l\'ultimo punto, annulla.',
'Sulla tavola vuota, fra i modi per iniziare, anche «Foto satellitare da Google Maps». Sul telefono si apre l\'app Google Maps: si fa lo screenshot, si torna in RILSIN, si sceglie dalla galleria e si calibra la scala.',
'Rileva con il GPS più affidabile: usa insieme GPS e rete, mostra la precisione mentre cerca, si ferma entro 20 m (o 60 m dopo 12 secondi), non usa mai una posizione vecchia; funziona anche con il permesso di posizione approssimativa (con un avviso).',
'«Fine» per tornare a Seleziona dopo schizzo, triangolazione, righello e gli altri strumenti: sul telefono in evidenza nella barra in basso, sul PC in alto sulla tavola.',
'Più oggetti selezionati (anche tutti): riquadro unico con la maniglia tonda per ruotarli insieme di quanti gradi si vuole; nelle proprietà «Ruota tutto di» con qualsiasi valore e i pulsanti da 1°, 15° e 90°.',
'Marciapiede su entrambi i lati, solo a destra o solo a sinistra, con larghezze anche diverse (strade dritte e curve a raggio misurato); il raccordo d\'angolo lo segue.',
'Nome della via anche sulle strade dritte, sulle strade curve e sulle curve a raggio misurato: scritto accanto alla strada e nella località dell\'intestazione.',
'Misure guidate un caposaldo alla volta: dal primo punto fisso tutte le distanze di tutti i veicoli, poi si passa al caposaldo seguente (con un avviso).',
'Telefono: barra in alto su una riga con i comandi del campo (Menu, Salva, Misure, Triangola, Foto, Schizzo, Fascicolo) tutti visibili; «Ripeti» nella barra in basso; menu «Altro» a riquadri (Documenti, Tavola con la scala, Rilievo, Vista, Applicazione); anche in orizzontale la grafica è quella del telefono.',
'Telefono: le finestre «Dati e misure» e «Ricostruzione» non escono più dallo schermo; compare il pulsante «Converti» degli schizzi.',
'Logo ed emblema presenti anche nelle esportazioni PNG e Word dall\'app Android e dall\'app aperta come file.',
'Sicurezza: le tavole e i luoghi aperti da file vengono ripuliti (nessun codice può entrare nella pagina) e l\'app si collega solo al Geoportale; app Android senza backup automatico sul cloud e senza permesso della fotocamera.',
'Incroci come un oggetto solo: si spostano e ruotano interi, i bracci si regolano trascinando i numeri; regolazione in un clic (STOP, dare precedenza, semaforo) con linee, cartelli e strisce secondo il Regolamento CdS (art. 138 e 144).',
'Nuovi incroci: su 4 corsie, con svolte a destra con isola, ad angolo, passo carrabile, passaggio a livello, semaforico e con STOP pronti; corsie di svolta; nome della via sui bracci.',
'Segnali, linee e strisce degli incroci si modificano uno per uno (clic sul segnale); «Ripristina segnali e strisce» torna a quelli automatici.',
'Rotatorie complete: ingressi raccordati all\'anello, isole a goccia, triangolari o zebrate, strisce pedonali sui bracci, bypass; modelli a 3 e 5 bracci, a doppia corsia, mini-rotatoria.',
'Curve a raggio misurato: raggio da corda e freccia rilevate, scritto sul disegno e nell\'atto; sezione completa con corsie, banchine, marciapiedi e guard-rail.',
'App Android: il pulsante «Stampa / Salva PDF» di atto, fascicolo e planimetria apre la stampa del telefono (anche «Salva come PDF»).',
'Corretto: selezionando una zebrata curva ora compaiono il riquadro e i punti per modificarla.',
'App Android: chi ha una versione precedente alla build 184 deve prima esportare o condividere le tavole del telefono, poi disinstallare la vecchia RILSIN e installare la nuova.'] }
];
RS.AUTORE = 'MANZONI Alessandro';
RS.ANNO = 2026;
RS.COPYRIGHT = '© ' + RS.ANNO + ' ' + RS.AUTORE;
RS.PAYPAL = 'https://paypal.me/manzoniale';
RS.EMAIL_SEGNALAZIONI = 'rilsin.app@gmail.com';
RS.caffe = {
visibile() {
const tel = !!window.RilsinAndroid || (window.matchMedia && matchMedia('(max-width: 820px), (max-height: 500px)').matches && matchMedia('(pointer: coarse)').matches);
return !!RS.PAYPAL && /^https:\/\/(www\.)?(paypal\.me|paypal\.com)\//.test(RS.PAYPAL) && tel;
},
apri() {
if (!this.visibile()) return;
if (window.RilsinAndroid && RilsinAndroid.apriSostegno) RilsinAndroid.apriSostegno(RS.PAYPAL);
else window.open(RS.PAYPAL, '_blank', 'noopener');
}
};
function boot() {
try { if (localStorage.getItem('scenasinistro:tema') === 'light') document.body.classList.add('light'); } catch (e) {}
try { if (localStorage.getItem('rilsin:aiuti') === '1') { document.body.classList.add('aiuti'); document.querySelectorAll('[data-act="aiuti"]').forEach(b => b.classList.add('on')); } } catch (e) {}
try { if (localStorage.getItem('scenasinistro:notte') === '1') { document.body.classList.add('notte'); document.querySelectorAll('[data-act="notte"]').forEach(b => b.classList.add('on')); } } catch (e) {}
try { if (localStorage.getItem('scenasinistro:sole') === '1') { document.body.classList.add('sole'); document.querySelectorAll('[data-act="sole"]').forEach(b => b.classList.add('on')); } } catch (e) {}
try { const t = localStorage.getItem('scenasinistro:testo'); if (t === 'ui-sm' || t === 'ui-lg') document.body.classList.add(t); } catch (e) {}
RS.scene.init();
RS.tools.init();
RS.ui.init();
RS.rulers.init();
RS.layers.init();
RS.home.init();
RS.fascicolo.init();
RS.menuContesto.init();
try {
if ('launchQueue' in window) window.launchQueue.setConsumer(p => {
if (p && p.files && p.files.length) setTimeout(() => RS.ui.apriFileDaWindows(p.files[0]), 300);
});
} catch (e) {}
RS.storage.leggiPostazione();
window.addEventListener('keydown', e => {
const tag = e.target.tagName;
if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? RS.scene.redo() : RS.scene.undo(); }
else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); RS.scene.redo(); }
else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); RS.ui.action(e.shiftKey ? 'salva-come' : 'salva', null); }
else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
e.preventDefault();
const b = document.querySelector('[data-b="dup"]'); if (b) b.click();
}
else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'x') && RS.scene.selection.length) {
e.preventDefault();
RS.tools._clip = RS.scene.selection.map(id => JSON.parse(JSON.stringify(RS.scene.get(id))));
if (e.key.toLowerCase() === 'x') RS.scene.remove(RS.scene.selection);
RS.ui.toast((e.key.toLowerCase()==='x'?'Tagliati ':'Copiati ') + RS.tools._clip.length + ' oggetti');
}
else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && RS.tools._clip && RS.tools._clip.length) {
e.preventDefault();
const newIds = [];
RS.tools._clip.forEach(o => {
const c = JSON.parse(JSON.stringify(o)); delete c.id; delete c.gid;
if (c.pts) c.pts = c.pts.map(p => { const q = { x: p.x+1, y: p.y+1 }; if (p.aid != null) { q.aid = p.aid; q.alx = p.alx; q.aly = p.aly; } return q; });
else { c.x = (c.x||0)+1; c.y = (c.y||0)+1; }
if (c.type === 'vehicle') c.label = '';
newIds.push(RS.scene.add(c, false).id);
});
RS.scene.snapshot(); RS.scene.select(newIds);
RS.ui.toast('Incollati ' + newIds.length + ' oggetti');
}
else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
e.preventDefault();
RS.scene.select(RS.scene.elements.filter(x => !(x.locked && x.type === 'image') && !x.inc).map(x => x.id));
}
});
const salvaSubito = () => { try { if (RS.ui._ready) RS.storage.autosaveNow(); } catch (e) {} };
document.addEventListener('visibilitychange', () => { if (document.hidden) salvaSubito(); });
window.addEventListener('pagehide', salvaSubito);
window.addEventListener('blur', salvaSubito);
document.addEventListener('freeze', salvaSubito);
RS.ui._dirty = false;
RS.scene.on('change', () => { if (RS.ui._ready) { RS.ui._dirty = true; document.title = '● RILSIN — rilievo sinistri'; } });
window.addEventListener('beforeunload', ev => {
if (RS.ui._dirty) { ev.preventDefault(); ev.returnValue = ''; return ''; }
});
RS.scene.fit();
RS.ui._ready = true; RS.ui.markClean();
RS.home.start();
let at; RS.scene.on('change', () => {
clearTimeout(at); at = setTimeout(() => { RS.storage.autosave(); RS.storage.pushVersion(); }, 1200);
});
const sitoWeb = location.protocol === 'https:' && !window.RilsinAndroid;
if ('serviceWorker' in navigator && sitoWeb) {
navigator.serviceWorker.register('sw.js').then(reg => {
const proponi = () => {
if (!reg.waiting || !navigator.serviceWorker.controller || RS._aggiornaProposto) return;
RS._aggiornaProposto = true;
RS.ui.scelta({ titolo: 'Nuova versione di RILSIN', testo: 'È pronto un aggiornamento dell\'app. Le tavole salvate restano.',
opzioni: [{ k: 'ok', t: 'Aggiorna ora', primario: true }] }).then(k => {
if (k !== 'ok') { RS._aggiornaProposto = false; return; }
RS.ui.confermaSostituzione('aggiornare RILSIN').then(ok => { if (ok && reg.waiting) reg.waiting.postMessage('aggiorna'); });
});
};
proponi();
RS._reg = reg; RS._proponiAggiornamento = proponi;
reg.addEventListener('updatefound', () => {
const n = reg.installing; if (!n) return;
if (navigator.serviceWorker.controller) RS.ui.toast('⬇ Scarico l\'aggiornamento di RILSIN… lascia l\'app aperta un momento', 6000);
n.addEventListener('statechange', () => {
if (n.state === 'installed') proponi();
else if (n.state === 'redundant' && navigator.serviceWorker.controller && !reg.waiting) RS.ui.toast('Aggiornamento non riuscito (rete o spazio): riprovo alla prossima apertura', 6000);
});
});
setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
}).catch(() => {});
let ricaricata = false; const giaControllata = !!navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener('controllerchange', () => { if (ricaricata || !giaControllata) return; ricaricata = true; RS.ui._dirty = false; location.reload(); });
}
if (sitoWeb && navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});
}
if (!sitoWeb && 'serviceWorker' in navigator) {
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
if (window.caches && caches.keys) { caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {}); }
}
let loghiJs = null;
const daFile = prop => {
if (!loghiJs) loghiJs = new Promise(ok => {
const s = document.createElement('script'); s.src = 'js/loghi.js';
s.onload = s.onerror = ok; document.head.appendChild(s);
});
loghiJs.then(() => { const d = RS.loghiDati && RS.loghiDati[prop]; if (d) consegna(prop, d); });
};
const consegna = (prop, d) => { if (RS.loghi) RS.loghi.predefinito(prop, d); else if (!RS[prop]) RS[prop] = d; };
const preloadImg = (file, prop) => fetch(file).then(r => r.ok ? r.blob() : null).then(b => {
if (!b) { daFile(prop); return; } const fr = new FileReader();
fr.onload = () => consegna(prop, fr.result); fr.readAsDataURL(b);
}).catch(() => daFile(prop));
preloadImg('logocc.png', 'logoCC');
preloadImg('emblema.png', 'emblema');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})(window.RS = window.RS || {});

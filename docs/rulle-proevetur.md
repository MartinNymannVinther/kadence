# Rulle på en rigtig hometrainer

Rulle har aldrig mødt en rigtig hometrainer (TECH-DEBT.md, "Rulle has
never met a real trainer"). Parserne er testet mod specifikationerne og
mod en falsk trainer i testene, men ingen Wahoo, Tacx, Elite eller Saris
har været forbundet i virkeligheden. Denne tjekliste er til den første
tur, og til at skrive resultatet ind i TECH-DEBT.md bagefter.

## 1. Browser og computer

- **Chrome eller Edge**, på en computer eller en Android-telefon. Safari
  og Firefox kan ikke tale Bluetooth; en iPhone kan det kun med Bluefy.
- **`http://localhost:3000`** er et sikkert kontekst og virker til
  testen; en rigtig `https`-adresse (fx Kadence i produktion, eller en
  adresse delt med Tailscale Funnel) virker også. En almindelig
  `http`-adresse på netværket gør ikke.

## 2. Traineren og pulsbæltet

- Tænd traineren, og sæt den i den tilstand, den normalt bruges i
  (nogle skal "vækkes" med et par trin, før de taler Bluetooth).
- Skriv mærke og model ned — det skal med i TECH-DEBT.md bagefter.
- Har du et pulsbælte eller et ur, der sender puls, så tag det på nu:
  det er lettere at forbinde, før turen starter.

## 3. Tænd loggen

Åbn `/rulle?ble=log`. Et lille panel, "Bluetooth-log", lægger sig i
øverste venstre hjørne. Det er sammenklappet som udgangspunkt — tryk på
det for at folde det ud og se hændelserne, mens de kommer. Loggen holder
kun de sidste 500 linjer, kun i browseren; intet sendes nogen steder.

## 4. Forbind

Tryk "Forbind hometrainer", og vælg enheden i browserens egen liste. Har
du et pulsbælte, så tryk "Forbind pulsbælte" på samme måde. Loggen bør
med det samme vise, at traineren er forbundet, dens services og
karakteristikker, og det første skriv til dens control point.

## 5. Kør et stykke af passet, og se efter

- **ERG holder blokkens watt** — tallet står fast, selv om du skifter
  gear. Loggen viser hver måling fra traineren undervejs.
- **Blokskift**: watt-målet ændrer sig selv ved næste blok, uden at du
  gør noget.
- **Ruten styrer modstanden** (ADR 0107): vælg det på klar-skærmen, hvis
  traineren tilbyder valget, eller tryk E undervejs. Modstanden skal
  stige op ad bakke og falde ned ad, på halv styrke; loggen viser
  skrivninger med op-koden 0x11 og stigningen i hundrededele procent. Du
  skal selv geare for at ramme blokkens watt.
- **ERG letter ved lav kadence** (ADR 0107): træd under 50 i tre
  sekunder under et mål. Skærmen siger "ERG lettet", traineren går til
  60 % af blokkens watt, og den holder igen, når du har været over 60 i
  to sekunder.
- **Sværhedsgrad**: tryk minus til 90 %. Watt-feltet siger "· 90 % af
  passet", og turens notat bagefter siger "Kørt i Rulle på 90 % af
  passet.".
- **Landskabet holder sig fra vejen** (ADR 0108): ingen bropiller eller
  vægge på asfalten, ingen bakke eller trækrone ind over den. Ses det
  alligevel, så notér ruten og cirka hvor langt inde.
- **Kokloen** mod slutningen af en hård blok (ADR 0034) — den skal
  lyde, ikke kun ses.
- **Optagelsen** går hele tiden: tallene på skærmen bevæger sig, og
  loggen bliver længere.
- **Turen lander** på passet, når du afslutter og gemmer: Kadence viser
  "Turen er gemt" og passet på kalenderen får sin FIT-fil.

Går noget i stå eller ser forkert ud, så lad traineren køre lidt
længere alligevel — loggen viser, hvad der skete, bagefter.

## 6. Kopiér loggen tilbage til Claude

Fold "Bluetooth-log" ud, tryk "Kopiér log", og sæt den ind i en besked
til Claude sammen med: hvad der skete, og cirka hvornår (hvilket trin i
denne liste). Loggen er ren tekst — rå bytes i hex og de tal, parserne
læste ud af dem — og den eneste persondata i den er, hvad traineren selv
sender.

## 7. Bagefter

Skriv ind i TECH-DEBT.md, under "Rulle has never met a real trainer",
hvad traineren og pulsbæltet var, og hvad turen viste: holdt watten, kom
turen hjem, og var der noget i loggen, der undrede. Det er den tur, der
lukker punktet.

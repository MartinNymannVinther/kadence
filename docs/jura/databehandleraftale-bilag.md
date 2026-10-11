# Databehandleraftale — bilag A–D

> **UDKAST til Martins rådgiver — ikke gennemgået af en jurist.**
> Hører til [databehandleraftale.md](databehandleraftale.md). Alt her er
> læst i koden 11. oktober 2026; filnavne og ADR'er står ved hvert punkt,
> så det kan efterprøves.

## Bilag A — Oplysninger om behandlingen

### A.1 Formålet med databehandlerens behandling af personoplysninger på vegne af den dataansvarlige

At levere Kadence til klubben: et værktøj til at planlægge og følge
landevejsrytteres træning, hvor klubbens trænere lægger pas i rytternes
kalender, rytterne fører deres ture og en daglig check-in, forældre følger
med i det, rytteren deler, og trænerne ser belastning, form og
opmærksomhedspunkter mod Cykling Danmarks (DCU) anbefalinger for rytterens
klasse.

### A.2 Databehandlerens behandling af personoplysninger på vegne af den dataansvarlige drejer sig primært om (karakteren af behandlingen)

Opbevaring, strukturering, beregning og visning i en webapplikation på
databehandlerens server; import af aktivitetsfiler (FIT, GPX, TCX m.fl.)
og af ture fra tjenester, rytteren selv har forbundet; beregning af
belastning, form og opmærksomhedspunkter; på klubbens valg forslag fra en
sprogmodel; påmindelser uden indhold; eksport og sletning; natlig
krypteret backup; et revisionsspor over alle ændringer.

Ingen automatiske afgørelser (art. 22): opmærksomhedspunkter og forslag er
vist for en træner, der beslutter; "Shown, never enforced" (README.md).

### A.3 Behandlingen omfatter følgende typer af personoplysninger om de registrerede

**Almindelige personoplysninger (art. 6)**

- Konto: navn, e-mail, adgangskode som hash, passkeys (offentlig nøgle),
  totrinshemmelighed (TOTP), sessioner med IP-adresse og browser
  (`users`, `sessions`, `passkeys`, `two_factors`).
- Rolle og tilhørsforhold: medlemskab af holdet og rollen (træner,
  rytter, forælder), forældrelinks og om rytteren har bekræftet dem
  (`memberships`, `riders`, `guardians`).
- Rytteren: navn, fødselsår, køn (valgfrit), klasse, UCI ID (valgfrit),
  hvad rytteren deler med forældrene (`riders`).
- Træning: planlagte pas, kommentarer, kalenderbegivenheder (løb,
  eksamen, skole, lejr, ferie, sygdom), sæsonplan, mål, forløb,
  løbsresultater hentet fra DCU's offentlige sider via UCI ID
  (`planned_sessions`, `comments`, `calendar_events`, `season_plans`,
  `rider_goals`, `race_results`).
- Ture: tid, varighed, distance, stigning, watt, kadence, belastning,
  oplevet anstrengelse, noter og den rå fil, herunder **GPS-spor**
  (lokationsdata) (`activities`, `activity_files`).
- Enhedsforbindelser: udbyderens konto-id og forseglede tokens
  (`device_links`), upload-nøgler som hash (ADR 0029), browserens
  push-adresse (`push_subscriptions`, ADR 0060).
- Klubbens logo og billede (`org_images`), klubmesterskabets resultater.
- Revisionssporet: hver rækkes før og efter, hvem og hvornår, og ved
  login IP-adresse og browser (`audit_log`, ADR 0003).

**Følsomme personoplysninger (art. 9): helbredsoplysninger**

- Daglig check-in: søvn (timer og kvalitet), energi, humør, ømhed,
  stress, smerte efter ATK's smertetrappe (0–3) og hvor, sygdom og en fri
  note (`checkins`, drizzle/0002).
- Målinger: højde, hvilepuls, maks-puls, tærskelpuls, FTP, og vægt for
  ryttere fra det år, de fylder 19, og for yngre kun hvis holdet har slået
  det til (`rider_measurements`, `src/modules/wellbeing/measurements.ts`).
- Puls i ture (gennemsnit, maks, tid i zoner, pulsserie).
- Opmærksomhedspunkter, der udledes af ovenstående (søvn, smerte, sygdom,
  belastningsstigning), og en check-ins "røde zone" (ADR 0060).

[Til rådgiveren: Puls og tærskler er her regnet som helbredsoplysninger,
fordi de i sammenhæng med en navngiven persons træning siger noget om
helbredstilstanden (art. 4, nr. 15, og betragtning 35). Det er det
forsigtige valg.]

**Oplysninger om mindreårige.** De fleste ryttere er 15–22 år (U17, U19,
U23); nogle er 13–14 (U15 findes i beregnerne), og trænere kan oprette
ryttere i alle aldre fra fødselsår 1940 (`riders_birth_year`).

Ingen CPR-numre, ingen oplysninger om strafbare forhold (art. 10).

### A.4 Behandlingen omfatter følgende kategorier af registrerede

- **Ryttere**, typisk 13–22 år, de fleste mindreårige.
- **Forældre** (værger) til ryttere.
- **Trænere** og andre medlemmer af holdet (fx holdleder).
- Personer, der er inviteret men endnu ikke har oprettet en konto (navn
  og e-mail i invitationen).

### A.5 Behandlingens varighed

Behandlingen varer, så længe klubben har sit arbejdsrum i Kadence.
Behandlingen ophører, når klubben sletter arbejdsrummet eller beder
databehandleren om det; backups ruller ud 30 dage efter (punkt 11).

## Bilag B — Underdatabehandlere

### B.1 Godkendte underdatabehandlere

Ved Bestemmelsernes ikrafttræden har den dataansvarlige godkendt brugen af
følgende underdatabehandlere. Listen svarer til `docs/subprocessors.md`
den 11. oktober 2026.

| Navn                                       | CVR / reg.-nr.                    | Adresse                                        | Beskrivelse af behandling                                                                                                                                                        |
| ------------------------------------------ | --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hetzner Online GmbH                        | HRB 6089, Amtsgericht Ansbach [ ] | Industriestr. 25, 91710 Gunzenhausen, Tyskland | Hosting: serveren med Docker og databasen (datacenter Nürnberg, Tyskland), og lageret for de krypterede backups. Holder alt, installationen holder.                              |
| Mistral AI SAS (kun hvis holdet bruger AI) | [ ]                               | 15 rue des Halles, 75001 Paris, Frankrig [ ]   | Sprogmodel via EU-endepunktet `api.eu.mistral.ai`: modtager det, en prompt indeholder, når en træner trykker på en AI-knap. Rytterdata kun, hvis holdet har sagt ja (Bilag C.1). |

[Til Martin og rådgiveren: (1) Udfyld Hetzners og Mistrals registreringsnumre
og adresser fra deres egne databehandleraftaler; adresserne ovenfor er
skrevet efter hukommelsen og skal efterprøves. (2) `docs/subprocessors.md`
nævner kun Nürnberg; deploy-guiden nævner også Falkenstein. Skriv det
datacenter, serveren faktisk står i. (3) Backup-lageret (Hetzner Object
Storage eller en Storage Box, `docs/deploy.md` §7) har ingen egen række i
`docs/subprocessors.md`; den bør have det, med placering. (4) Mistral gemmer
efter egne vilkår API-input og -output i op til 30 dage til misbrugskontrol,
medmindre der er aftalt "zero data retention", og Mistrals gratis
"Experiment"-niveau kan træne på input. Tjek, hvilket niveau
kadence.haij.dk bruger, og skriv det her. (5) Rækken for Mistral i
`docs/subprocessors.md` beskriver et søsterprodukts prompts ("initiatives",
"deliverables"), ikke Kadences; den rettes i S-05.]

**Planlagt, ikke i brug:** Scaleway SAS (Paris, Frankrig), Transactional
Email, til invitationer, nulstilling af adgangskode og bekræftelse af
e-mailadresse (S-07). Den tages først i brug efter varslet i punkt 7.2.

**Ikke underdatabehandlere:**

- Wahoo, Garmin og Polar: tjenester rytteren selv forbinder (punkt 8.2,
  Bilag C.6).
- Browserens push-tjeneste: valgt af personens browser, modtager kun en
  tom besked (ADR 0060).
- Sportstiming ApS (Cykling Danmarks medlemsportal): en kilde, Kadence
  læser en offentlig side fra; den behandler intet på Kadences vegne
  (ADR 0039).
- GitHub (kildekoden) og Let's Encrypt (TLS-certifikatet): ingen
  installationsdata.
- **Holdets egen sprogmodel.** Vælger klubben under Indstillinger → AI sin
  egen udbyder og nøgle (ADR 0006), er den udbyder klubbens egen
  databehandler under klubbens egen aftale, ikke Haijs underdatabehandler.

### B.2 Varsel for godkendelse af underdatabehandlere

Generel godkendelse med 30 dages varsel, jf. punkt 7.2: ændringen står med
dato i `docs/subprocessors.md`, og klubbens kontaktperson får en mail.

## Bilag C — Instruks vedrørende behandling af personoplysninger

### C.1 Behandlingens genstand/instruks

Databehandleren behandler personoplysningerne for at levere Kadence som
beskrevet i Bilag A, og kun som klubbens brug af Kadence fører til. Særligt:

- **Hvem ser hvad** afgøres i databasen, ikke kun i koden (ADR 0011): en
  træner (ejer eller administrator af holdet) ser og skriver alt om
  holdets ryttere; en rytter ser kun sit eget; en holdkammerat ser intet
  om en anden rytter; en forælder ser først noget, når rytteren har
  bekræftet forælderen, og ser da profilen, træningen medmindre rytteren
  siger nej, og check-ins kun hvis rytteren siger ja. Fra 1. januar i det
  år rytteren fylder 18, ser forælderen kun noget, hvis rytteren har
  bekræftet linket igen som voksen. Revisionssporet læses kun af trænere.
- **AI.** Uden en sprogmodel sendes intet. Med Mistral sendes kun det, en
  prompt indeholder, og kun når en træner trykker på knappen. Rytternes
  data (fornavn og opmærksomhedspunkter, fx søvn, smerte, sygdom) sendes
  kun, hvis holdet har slået "AI må læse rytternes data" til
  (`team_settings.ai_on_rider_data`, standard nej). Alt, en person har
  skrevet, lægges i prompten som data, aldrig som instruks, og svaret
  renses og afkortes, før det vises (`src/modules/ai/sanitize-helpers.ts`,
  `tests/ai`). AI'en skriver, sender og sletter intet (Haij-dogme fem).
- **Påmindelser** sendes kun til den, der selv har slået dem til, og
  bærer intet indhold; teksten hentes fra Kadence med personens egen
  session (ADR 0060). En træners påmindelse om en rytter i den røde zone
  nævner ingen navne.
- **Ingen mail.** Kadence sender ingen mail i dag; invitationer og links
  til ny adgangskode gives videre af den, der laver dem (ADR 0032).

### C.2 Behandlingssikkerhed

Sikkerhedsniveauet afspejler, at behandlingen omfatter helbredsoplysninger
om mindreårige. Databehandleren gennemfører som minimum:

**Adskillelse i databasen**

- Hvert hold er adskilt fra de andre med Postgres' row level security, som
  er tvunget (`FORCE ROW LEVEL SECURITY`) på hver tabel; applikationen
  forbinder som en rolle uden ret til at omgå den, og holdet sættes pr.
  transaktion (`withOrgContext`, ADR 0002).
- Ryttere er adskilt inden for holdet efter samme greb, med fem funktioner,
  der spørger, hvem kalderen er for rytteren (ADR 0011).
- Medlemmers e-mailadresser kan kun læses af trænere og af personen selv
  (kolonnerettigheder, ADR 0070).
- Det bevises af tests, der kører mod en rigtig database ved hver ændring:
  `tests/rls/product-isolation.test.ts` (mellem hold),
  `tests/rls/rider-isolation.test.ts` (mellem ryttere og over for
  forældre), `tests/rls/member-addresses.test.ts`, og en meta-test i
  `tests/rls/tenant-isolation.test.ts`, der fejler, hvis en tabel mangler
  tvunget RLS eller et revisionsspor uden en navngiven grund.

**Adgang**

- Adgangskoder på mindst 12 tegn, gemt som hash; passkeys og
  totrinsbekræftelse (TOTP) for alle; begrænsning af loginforsøg (10 pr.
  minut pr. adresse) (`src/core/auth/auth.ts`).
- Lukket registrering: kun ved ejerens godkendelse eller holdets
  invitation (ADR 0004, 0048). Invitationslinks er bundet til én
  e-mailadresse, kan bruges én gang og udløber efter 7 dage
  (`TEAM_INVITATION_DAYS`, ADR 0064).
- Et link til ny adgangskode laves af en træner for et medlem (aldrig en
  ejer), virker én gang inden for en time, logger personen ud alle andre
  steder og står på personens sikkerhedsside med, hvem der lavede det
  (ADR 0032).
- Ingen "log ind som" (ADR 0048).

**Sporbarhed**

- Hver ændring af en række skrives af en trigger i databasen i et
  revisionsspor, som ingen rolle kan ændre eller slette i (ADR 0003);
  login, logud og nulstilling af adgangskode skrives også.
  Undtagelserne er navngivet med grund i meta-testen.

**Kryptering og hemmeligheder**

- Al trafik går over https (TLS fra Let's Encrypt).
- Tokens til enhedsudbydere og holdets egen AI-nøgle forsegles med
  installationens hemmelighed og vises aldrig (`src/core/crypto`).
- Natlige backups krypteres med `age` på serveren, før de forlader den,
  med en offentlig nøgle; den private nøgle ligger offline hos Martin,
  aldrig på serveren (`scripts/backup-kadence.sh`, `docs/deploy.md` §7).
- Ingen hemmeligheder i koden; gitleaks kører i CI.
- [Til rådgiveren: Databasen er ikke krypteret på applikationsniveau;
  den ligger på serverens disk hos Hetzner. Er det tilstrækkeligt sammen
  med de øvrige foranstaltninger?]

**Indgående filer**

- Kadences egen FIT-læser afviser hellere end gætter på en fil, den ikke
  har grund til at stole på; filer hentes kun fra udbyderens egen vært og
  med en størrelsesgrænse (`src/modules/fit`, ADR 0022).

**Drift**

- Én server i EU (Hetzner, Tyskland), drevet med Docker Compose; ingen
  amerikansk sky i driften (Haij-dogme fire). Kortet over ruter serveres
  af Kadence selv, så ingen rytters position når en korttjeneste
  (ADR 0023).
- Opdateringer leveres af Martin i hånden; CI kører lint, typer, alle
  tests, build, begge Docker-images, `pnpm audit --prod` og gitleaks.
- Sårbarheder meldes til security@haij.dk og kvitteres inden for 72
  timer (SECURITY.md).
- Genetablering af en backup testes mindst hvert kvartal
  (`docs/deploy.md` §7).

### C.3 Bistand til den dataansvarlige

Se punkt 9. Det meste gør klubben selv: eksport (Indstillinger → Data),
sletning af en rytter (rytterens side → "Slet rytteren og alle data") og af
arbejdsrummet (Indstillinger → Arbejdsrum). Databehandleren svarer på
spørgsmål fra klubben om en registreret anmodning inden for 5 hverdage.

### C.4 Opbevaringsperiode/sletterutine

- Oplysningerne opbevares, til klubben sletter dem, eller arbejdsrummet
  slettes. Sletning sker med det samme, også i revisionssporet.
- Backups: 30 dage.
- Optegnelser om slettede pas, som en påmindelse kan fortælle om: 7 dage
  (ADR 0060).
- Revisionsspor: i dag så længe arbejdsrummet findes. **Planlagt** (S-11,
  når sporet er partitioneret): rækker om ryttere slettes efter 24
  måneder; rækker om adgang og sletninger gemmes, så længe
  arbejdsrummet findes (Martins svar 11. oktober 2026, plan §10.6).

### C.5 Lokalitet for behandling

Behandlingen sker hos databehandleren (Danmark) og på serveren hos Hetzner
Online GmbH i Tyskland. Backups ligger i Hetzners EU-lager. Uden
klubbens skriftlige godkendelse sker behandling ingen andre steder.

### C.6 Instruks vedrørende overførsel af personoplysninger til tredjelande

Databehandleren overfører ingen personoplysninger til tredjelande. Hvis
den dataansvarlige ikke i dette bilag eller efterfølgende giver
skriftlig instruks herom, er databehandleren ikke berettiget til at
foretage sådanne overførsler.

Det, rytteren selv vælger, sker på rytterens instruks, ikke klubbens
eller Haijs (punkt 8.2):

- **Wahoo og Garmin (USA), Polar (Finland):** ind kommer rytterens egne
  ture som FIT-filer; ud går kun tokens, en afmelding, og — når rytteren
  eller en træner trykker "send" — et planlagt pas med mål regnet fra
  rytterens FTP og tærskelpuls. Aldrig check-ins, målinger, kommentarer,
  holdet eller andres data.
- **Browserens push-tjeneste:** en tom besked til browserens adresse.

### C.7 Procedurer for den dataansvarliges tilsyn med databehandleren

Databehandleren sender én gang om året, og når klubben beder om det, en
kort skriftlig redegørelse til klubben: ændringer i underdatabehandlere,
sikkerhedshændelser, resultatet af den seneste test af en genetablering,
og at testene for adskillelse er grønne. Klubben kan selv læse koden og
køre testene (punkt 12.2) og kan ved behov aftale et fysisk tilsyn mod at
betale egne omkostninger. Databehandleren fører tilsyn med Hetzner og
Mistral ved at læse deres egne revisionserklæringer og vilkår én gang om
året. [Til rådgiveren: Datatilsynets vejledning om tilsyn med
databehandlere (oktober 2021) lader tilsynets form følge risikoen; er en
skriftlig redegørelse nok her, eller bør der være en uafhængig
erklæring, når flere klubber er på?]

### C.8 Procedurer for underretning ved brud

Ved brud underretter databehandleren klubbens kontaktperson senest 24
timer efter at være blevet opmærksom på det (punkt 10), med: hvad der
skete og hvornår, hvilke kategorier af oplysninger og registrerede og
hvor mange, de sandsynlige følger, hvad der er gjort, og hvem klubben
kan tale med. Databehandleren fører en log over alle brud, også dem,
der ikke skal anmeldes (art. 33, stk. 5).

## Bilag D — Parternes regulering af andre forhold

1. **Vederlag.** Kadence er gratis for klubben i pilotvinteren 2026–27
   (oktober 2026 til september 2027). Derefter kommer et enkelt gebyr for
   at drive og vedligeholde løsningen (plan §10.7); det aftales skriftligt
   med mindst tre måneders varsel, og klubben kan i stedet eksportere og
   slette. Der er ingen funktioner kun for betalende (Haij-dogme ét).
2. **Ingen oppetidsgaranti.** Kadence er ny og leveres, som den er, uden
   garantier ud over hvad ufravigelig lovgivning kræver (som `/terms`).
3. **Ansvar.** [Til rådgiveren: et loft over ansvaret, og hvordan det
   forholder sig til art. 82.]
4. **Egen drift.** Klubben kan når som helst køre Kadence selv på egen
   server med samme kode (AGPL-3.0); databehandleren hjælper gerne med
   flytningen (Haij-dogme tre).
5. **Behandling, Haij selv er dataansvarlig for**, og som ikke er omfattet
   af Bestemmelserne: installationens adgangsansøgninger, Trænerrummet på
   tværs af klubber (ADR 0052), den åbne side over danske hold (ADR 0072),
   demoen og personers egne arbejdsrum. De står i
   docs/jura/fortegnelse.md, del 2.
6. **Lovvalg og værneting.** Dansk ret; tvister afgøres ved de danske
   domstole.

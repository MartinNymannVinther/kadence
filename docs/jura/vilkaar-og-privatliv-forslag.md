# Forslag: /terms delt i Vilkår og Privatlivspolitik

> **UDKAST til Martins rådgiver — ikke gennemgået af en jurist.**
> Udkast af 11. oktober 2026. Den engelske udgave af begge tekster står i
> [vilkaar-og-privatliv-forslag-en.md](vilkaar-og-privatliv-forslag-en.md).

## Hvorfor dele, og hvem bygger det

`/terms` er i dag "Vilkår og privatliv" på én side, skrevet til hold
(`src/app/[locale]/terms/page.tsx`, nøglerne `terms.*` i messages/da.json).
Siden siger "jer og jeres hold" og nævner hverken helbredsoplysninger,
forældre eller alder. Når en person kan bruge Kadence alene, er Haij
dataansvarlig for den person, og en privatlivspolitik skal give
oplysningerne i GDPR art. 13 og 14. De passer ikke i en side med vilkår,
og de skal kunne findes for sig.

Forslaget: `/terms` bliver **Vilkår** (aftalen om at bruge tjenesten), og
en ny side, `/privacy`, bliver **Privatlivspolitik** (hvad der sker med
oplysningerne). De linker til hinanden. S-05 retter de sætninger på den
nuværende side, der ikke passer (se "Hvad koden siger" nederst); S-08
bygger de to sider ud fra teksterne her, før døren åbnes for den enkelte.
Tabellen nederst viser, hvor hver nuværende nøgle ender.

Teksterne holder den nuværende sides stemme: korte sætninger, du-form, ingen
udråbstegn, og de siger hvad der sker og hvorfor. "Vi" er Haij.

---

## Del 1: Vilkår (dansk)

**Vilkår**

_Senest opdateret [dato]._

Kadence er et open source-værktøj til træningsplanlægning for
cykelryttere, deres trænere og forældre. Det drives af Vinther Consulting
under navnet Haij. Det her er aftalen mellem dig og os, når du bruger den
udgave, vi driver på kadence.haij.dk. Kører du koden selv, gælder kun
licensen. Hvad der sker med dine oplysninger, står i
[Privatlivspolitikken](/privacy).

**Hvad Kadence er**
Et værktøj til at planlægge og følge træningen: pas i en kalender, ture fra
filer og enheder, en daglig check-in og en sæsonplan. Anbefalinger og
forslag fra AI er udkast, ikke facit, og de erstatter hverken en træner
eller en læge.

**Et hold, eller dig alene**
Et arbejdsrum er enten et hold, som en klub ejer, eller dit eget. På et
hold er det klubben, der bestemmer over holdets data, og vi behandler dem
for klubben efter en databehandleraftale. I dit eget arbejdsrum er det
dig, og vi er ansvarlige for, hvordan oplysningerne behandles.

**Konto og alder**
Du får adgang ved at blive inviteret af et hold, ved at søge, eller
[når S-08 er bygget] ved at oprette dig selv med en e-mailadresse, du
bekræfter. Er du under 15 år, opretter en forælder arbejdsrummet og
inviterer dig. Det er reglen i databeskyttelsesloven for børns samtykke
til tjenester på nettet. Vi gemmer dit navn og din e-mail og bruger dem
til at logge dig ind. Adgangskoder gemmes som hash, og du kan tilføje en
passkey og totrinsbekræftelse.

**Dine data**
Det, du skriver i Kadence, er dit og dit holds. En rytters træning og
check-ins handler om rytteren, og rytteren bestemmer, hvad forældrene
ser. Alt kan hentes ud som regneark og JSON med ét klik og slettes igen.
Vi sælger ingenting og giver intet videre. Vi kigger ikke i jeres data,
medmindre I beder os om hjælp. Den, der driver serveren, kan teknisk
læse databasen; det bruges kun til drift og til at rette fejl.

**AI**
Er der sat en sprogmodel op, og beder en træner om et forslag, sendes det,
forslaget bygger på, til modeludbyderen. Rytternes check-ins og
opmærksomhedspunkter sendes kun, hvis holdet har slået det til. AI'en
foreslår; den skriver, sender og sletter intet uden at et menneske har
sagt ja. Uden en sprogmodel virker alt andet.

**Invitationer og links**
Et invitationslink gælder én adresse, kan bruges én gang og udløber efter
en uge. Et link til ny adgangskode, som en træner laver til dig, virker én
gang inden for en time, og du kan se på din sikkerhedsside, hvem der
lavede det. Del ikke links med andre end den, de er til. [Indtil S-07:]
Kadence sender ingen mails, så det er den, der laver et link, der giver
det videre.

**Det, vi beder dig om**
Læg kun oplysninger om andre ind, når du har lov. I Trænerrummet deler
trænere erfaringer; hold rytternes navne ude af det. Læg ikke rigtige
personoplysninger i demoen.

**At holde op**
Du kan slette dit arbejdsrum med det samme, uden at skrive til nogen og
uden at vente. Eksporten ligger et klik væk, og den kan læses uden
Kadence. Vi beholder ingen kopi bagefter ud over de natlige krypterede
backups, som ruller ud efter 30 dage. Din konto slettes, når du beder om
det [når S-01/S-08 er bygget: under Indstillinger → Mig].

**Pris**
Kadence er gratis i pilotvinteren 2026–27. Derefter kommer et enkelt
gebyr for at drive og vedligeholde tjenesten. Det varsles mindst tre
måneder før, og der er ingen funktioner kun for dem, der betaler.

**Drift og garantier**
Kadence er ny, og der er ingen oppetidsgaranti. Vi passer på jeres data
med krypterede backups hver nat, men I bør hente en eksport ind imellem.
Tjenesten leveres, som den er, uden garantier ud over hvad ufravigelig
lovgivning kræver.

**Licens**
Koden er AGPL-3.0. Du må bruge, ændre og køre den selv; ændrer du den og
stiller den til rådighed for andre over et netværk, skal dine ændringer
også være tilgængelige. Det, du skriver i værktøjet, er ikke omfattet af
licensen. Det er dit.

**Demoen** _(vises kun, når demoen er slået til)_
Et demo-arbejdsrum oprettes uden e-mail eller tilmelding og slettes helt
efter {hours} timer, konto inklusive. Læg ikke rigtige personoplysninger
i det.

**Når vilkårene ændres**
Ændrer vi noget, der betyder noget for dig, står det her med dato mindst
30 dage før, det gælder, og du får det at vide, næste gang du logger ind.

**Lov og tvister**
Dansk ret gælder. Er du forbruger, har du altid de rettigheder, som
ufravigelig lovgivning giver dig.

**Kontakt**
Skriv til martin@vintherconsulting.dk. Har du fundet et sikkerhedsproblem,
står fremgangsmåden i SECURITY.md i kodearkivet; meld det dér frem for i en
almindelig mail.

---

## Del 2: Privatlivspolitik (dansk)

**Privatlivspolitik**

_Senest opdateret [dato]._

Her står, hvilke oplysninger Kadence behandler om dig, hvorfor, hvem der
ser dem, og hvordan du henter eller sletter dem. Kort sagt: de bliver i
EU, ingen sælger dem, og du kan selv hente dem ud og slette dem.

**Hvem er ansvarlig**
Det afhænger af, hvor du er:

- **På et hold** er klubben dataansvarlig for holdets data: rytternes
  træning, check-ins og målinger, forældrelinks og holdets kalender. Vi
  behandler dem kun efter klubbens instruks og efter en
  databehandleraftale. Spørg klubben først; vi hjælper klubben med at
  svare.
- **Alene**, i dit eget arbejdsrum, er vi dataansvarlige.
- **Altid os**: din konto (navn, e-mail, login), ansøgninger om adgang,
  Trænerrummet, demoen og den åbne side om danske hold.

Os: Vinther Consulting (Haij), CVR [ ], martin@vintherconsulting.dk.

**Hvad vi behandler**

- Din konto: navn, e-mail, adgangskode som hash, passkeys, totrinskode og
  hvornår og fra hvilken IP-adresse og browser du logger ind.
- Som rytter: fødselsår, køn hvis du vælger det, klasse, UCI ID hvis det
  er sat, dine pas, ture med tid, watt, puls og GPS-spor, kommentarer,
  kalender, sæsonplan, mål og løbsresultater fra Cykling Danmarks
  offentlige sider.
- Din daglige check-in: søvn, energi, humør, ømhed, stress, smerte og
  hvor, sygdom og en note. Og målinger: højde, puls, FTP, og vægt fra det
  år du fylder 19, eller før hvis holdet har slået det til.
- Som forælder: dit navn, din e-mail og hvilken rytter du følger.
- Hvis du slår påmindelser til: din browsers push-adresse.

Check-ins, målinger og puls er **helbredsoplysninger**. Dem passer vi
ekstra på.

**Hvorfor, og med hvilken ret**

| Hvad                                         | Hvorfor                                               | Hjemmel                                                                                         |
| -------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Din konto og dit arbejdsrum                  | For at levere Kadence til dig                         | Aftalen med dig (GDPR art. 6, stk. 1, litra b)                                                  |
| Check-ins, målinger og puls, når du er alene | For at du kan følge, hvordan du har det og træner     | Dit udtrykkelige samtykke (art. 9, stk. 2, litra a, og art. 6, stk. 1, litra a)                 |
| Holdets data                                 | Klubbens formål                                       | Klubbens hjemmel; spørg klubben                                                                 |
| Login, IP-adresse og revisionsspor           | At holde Kadence sikker og kunne se, hvem gjorde hvad | Vores legitime interesse i sikkerhed (art. 6, stk. 1, litra f) og kravet om sikkerhed (art. 32) |
| Ansøgninger om adgang                        | At afgøre, om vi lukker dig ind                       | Skridt før en aftale (art. 6, stk. 1, litra b)                                                  |

**Samtykke til helbredsoplysninger, når du er alene**
Når du opretter dit eget arbejdsrum, spørger vi, om Kadence må gemme dine
check-ins og målinger. Siger du ja, kan du trække det tilbage under
Indstillinger → Data. Så slår Kadence check-in og målinger fra, de
check-ins og målinger, du har, slettes, efter at du har fået lejlighed til
at hente dem, og resten virker som før: kalenderen, turene, sæsonplanen og
Rulle. Det, vi gjorde, før du trak samtykket tilbage, er stadig lovligt
(art. 7, stk. 3). Er du under 15 år, er det din forælder, der giver og
trækker samtykket.

[Til rådgiveren: (1) Planen sagde, at et nej "slår check-in og målinger fra";
art. 17, stk. 1, litra b kræver vel, at de eksisterende også slettes, når
samtykket var hjemlen. Teksten foreslår sletning efter et tilbud om
eksport. (2) Puls i turene er også helbredsoplysninger. Skal et nej også
fjerne pulsen fra turene, eller kan den bære på aftalen? (3) En person
under 18 kan ikke selv forpligte sig ved en aftale (værgemålsloven § 1,
stk. 2). Bærer art. 6, stk. 1, litra b for en 15–17-årig alene, eller skal
kontoen også hvile på samtykke efter databeskyttelsesloven § 6, stk. 2?]

**Alder**
Du kan selv oprette en konto og give samtykke fra du er 15 år. Er du under
15, opretter en forælder dit arbejdsrum og giver samtykket for dig
(databeskyttelsesloven § 6, stk. 2 og 3, og GDPR art. 8). På et hold er det
klubben, der sørger for samtykke fra dig eller dine forældre.

**Hvem ser hvad**

- **Træneren på dit hold** ser alt, du logger. Det er det, en træner er
  til. Vil du holde noget for dig selv, så log det ikke.
- **Dine holdkammerater** ser intet om din træning eller dine check-ins.
- **Dine forældre** ser først noget, når du har bekræftet dem. Så ser de
  din profil, din træning medmindre du siger nej, og dine check-ins kun
  hvis du siger ja. Fra 1. januar i det år du fylder 18, ser de kun
  noget, hvis du bekræfter dem igen.
- **AI'en** ser kun noget, når en træner beder om et forslag, og kun dit
  fornavn og dine opmærksomhedspunkter, hvis holdet har sagt ja.
- **Vi** kigger ikke i jeres data, medmindre I beder os om hjælp. Den, der
  driver serveren, kan teknisk læse databasen og bruger det kun til drift
  og fejlretning.

Det er sat op i databasen, ikke kun i koden, og der er tests, der beviser
det.

**Hvem vi giver oplysninger til**
Vores leverandører står i listen over underdatabehandlere: Hetzner i
Tyskland driver serveren og backupperne, og Mistral i EU svarer, når en
træner beder AI'en om et forslag. Vi giver dem kun det, de skal bruge.
Ingen andre får oplysninger fra os. [Når S-07 er bygget: Scaleway i
Frankrig sender vores mails om din konto.]

**Uden for EU**
Vi sender intet uden for EU. To ting vælger du selv:

- **Wahoo, Garmin og Polar.** Forbinder du din konto, kommer dine ture ind
  af sig selv. Wahoo og Garmin er i USA, Polar i Finland. Kun du kan
  forbinde, og du kan afbryde når som helst. Ud til dem går kun et pas,
  når du eller din træner trykker "send", aldrig dine check-ins. Hvad de
  gør med dine ture, er mellem dig og dem.
- **Påmindelser.** Slår du dem til, går en tom besked gennem din browsers
  push-tjeneste (Apple, Google, Mozilla eller Microsoft). Beskeden har
  intet indhold; teksten hentes fra Kadence, når den vises.

**Hvor længe**

- Dit arbejdsrum og alt i det: til du sletter det. Det sker med det samme.
- Backups: 30 dage.
- Din konto: til du beder os slette den.
- Revisionssporet: så længe arbejdsrummet findes. [Planlagt: rækker om
  ryttere slettes efter 24 måneder.]
- Ansøgninger om adgang: [Forslag: 6 måneder efter afgørelsen. I dag slettes
  de ikke af sig selv.]
- Påmindelsernes adresse: til du slår dem fra eller forlader holdet.
- Demoen: {hours} timer.

**Dine rettigheder**
Du har ret til at få at vide, hvad vi har om dig, og få det udleveret
(art. 15 og 20), til at få rettet det (art. 16), slettet (art. 17),
begrænset (art. 18), og til at gøre indsigelse (art. 21). Det meste gør du
selv: hent dine data under Indstillinger → Data, ret dem, hvor de står, og
slet dit arbejdsrum under Indstillinger → Arbejdsrum. På et hold sletter
træneren en rytter helt, når rytteren eller forældrene beder om det. Resten
skriver du til os om; vi svarer inden for en måned (art. 12, stk. 3).

**Mails**
Kadence sender ingen mails i dag. [Når S-07 er bygget: Vi sender kun mails
om din konto: bekræftelse af din adresse, invitationer og links til ny
adgangskode. Aldrig nyhedsbreve eller reklame.]

**Cookies**
Kadence bruger kun de cookies, der skal til for at du kan logge ind og
bruge det, du selv har valgt. Ingen statistik, ingen reklame, ingen
cookies fra andre.

| Cookie                                    | Hvad den gør                                                     | Hvor længe                              |
| ----------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| `__Secure-better-auth.session_token`      | Holder dig logget ind                                            | 7 dage, forlænges når du bruger Kadence |
| `__Secure-better-auth.two_factor`         | Under login med totrinsbekræftelse                               | Få minutter                             |
| `better-auth-passkey`                     | Under login eller opsætning med passkey                          | Få minutter                             |
| `kadence_device_oauth`                    | Mens du forbinder Wahoo, Garmin eller Polar                      | 10 minutter                             |
| `NEXT_LOCALE`                             | Husker sproget, når det er et andet end din browsers             | Til du lukker browseren                 |
| `kadence-sidebar`, `kadence-sidebar-tone` | Husker, om menuen er skjult, og dens farve, når du har valgt det | 1 år                                    |

Rulle gemmer en tur i din browser, mens du er uden net, og sender den,
når du er på igen. Et udkast til en uge gemmes også i browseren, til du
gemmer det.

**Demoen** _(vises kun, når demoen er slået til)_
Demoen opretter en konto uden e-mail, som slettes med alt i den efter
{hours} timer. Læg ikke rigtige oplysninger i den.

**Klage**
Er du utilfreds med, hvordan vi behandler dine oplysninger, så skriv til
os. Du kan altid klage til Datatilsynet, Carl Jacobsens Vej 35, 2500
Valby, dt@datatilsynet.dk, www.datatilsynet.dk (art. 77).

**Ændringer**
Ændrer vi noget, der betyder noget for dig, står det her med dato, og du
får det at vide, næste gang du logger ind.

---

## Del 3: Fra de nuværende nøgler til de nye

| Nuværende nøgle (`terms.*`) | Ny plads                                                             | Ændring                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `title`                     | `terms.title` "Vilkår" og `privacy.title` "Privatlivspolitik"        | Delt i to                                                                                                                         |
| `updated`                   | `terms.updated`, `privacy.updated`                                   | Hver side sin dato                                                                                                                |
| `back`, `language`          | `terms.*` og `privacy.*` (eller `legal.back`, `legal.language`)      | Uændret tekst                                                                                                                     |
| `intro`                     | `terms.intro`                                                        | Navngiver Vinther Consulting og linker til privatlivspolitikken                                                                   |
| —                           | `privacy.intro`                                                      | Ny                                                                                                                                |
| `what`                      | `terms.what`                                                         | Uændret, "aktiviteter" bliver "ture"                                                                                              |
| —                           | `terms.workspaces`, `privacy.controller`                             | Nyt: hold eller alene, og hvem der er ansvarlig                                                                                   |
| `account`                   | `terms.account` og `privacy.data`                                    | "skrive til dig om tjenesten" udgår (Kadence sender ingen mail); alder tilføjet; hvad der gemmes flytter til privatlivspolitikken |
| `yourData`                  | `terms.yourData` og `privacy.whoSees`                                | Driftens tekniske adgang nævnes; hvem ser hvad flytter til privatlivspolitikken                                                   |
| —                           | `privacy.bases`, `privacy.consent`, `privacy.age`                    | Nyt: hjemmel, samtykke til helbredsoplysninger, alder                                                                             |
| `ai`                        | `terms.ai` og `privacy.whoSees` (punktet om AI'en)                   | Siger, at AI'en hverken skriver, sender eller sletter                                                                             |
| `shareLinks`                | `terms.links`                                                        | Udvidet med trænerens link til ny adgangskode                                                                                     |
| —                           | `terms.conduct`                                                      | Nyt: det, vi beder dig om                                                                                                         |
| `leaving`                   | `terms.leaving` og `privacy.retention`                               | Siger, at kontoen ikke slettes med arbejdsrummet                                                                                  |
| —                           | `terms.price`                                                        | Nyt: gratis i pilotvinteren, gebyr varslet                                                                                        |
| `availability`              | `terms.availability`                                                 | Uændret                                                                                                                           |
| `license`                   | `terms.license`                                                      | Uændret                                                                                                                           |
| `demo`                      | `terms.demo` og `privacy.demo`                                       | "24 timer" bliver `{hours}`, som siden allerede sender med; "tekniske logdata" udgår (se nedenfor)                                |
| —                           | `privacy.recipients`, `privacy.transfers`                            | Nyt: modtagere og uden for EU                                                                                                     |
| —                           | `privacy.retention`, `privacy.rights`, `privacy.mail`                | Nyt                                                                                                                               |
| —                           | `privacy.cookies` (med tabellen som egne nøgler)                     | Nyt                                                                                                                               |
| —                           | `privacy.complaint`, `terms.changes`, `terms.law`, `privacy.changes` | Nyt                                                                                                                               |
| `contact`                   | `terms.contact` og `privacy.contact`                                 | Uændret                                                                                                                           |
| `subprocessorsNote`         | `privacy.recipients` (linket står i teksten)                         | Flytter                                                                                                                           |

Siden har i dag `SECTIONS` i én liste og ét afsnit pr. nøgle med `title` og
`body`; de to nye sider kan bruge samme mønster. Tabellerne (hjemmel og
cookies) skal have hver celle som sin egen nøgle, så `tests/i18n` kan se
dem.

## Hvad koden siger, som den nuværende side ikke gør

Fundet ved at læse koden 11. oktober 2026. De første fire kan S-05 rette
uden at vente på delingen.

1. **"…og vi bruger dem til … at skrive til dig om tjenesten"**
   (`terms.account`). Kadence sender ingen mail (ADR 0032, `docs/deploy.md`
   §6b), og der er ingen mailadapter i koden.
2. **"Vi opbevarer ikke en kopi bagefter ud over de natlige krypterede
   backups"** (`terms.leaving`). `delete_workspace` (drizzle/0003) sletter
   arbejdsrummet, men ikke medlemmernes konti: navn, e-mail,
   adgangskode-hash, passkeys og sessioner med IP-adresse bliver. Der er
   ingen måde for en person at slette sin konto selv; `docs/subprocessors.md`
   nævner at "slette kontoen", som ikke findes. Adgangsansøgninger med
   IP-adresse slettes aldrig (ADR 0004 siger det selv). Login uden et
   aktivt arbejdsrum skrives i revisionssporet uden `org_id` og slettes
   derfor ikke med noget arbejdsrum.
3. **"Det kan hentes ud … med ét klik"** (`terms.yourData`). Eksporten
   (`src/modules/export/tables.ts`) har ikke de rå FIT-filer, turenes
   målepunkter (`streams`) eller billedernes bytes. S-04 tager filerne med.
4. **"Vi gemmer kun de tekniske logdata der skal til for at holde demoen
   kørende"** (`terms.demo`). Demoens revisionsrækker bliver liggende,
   når demoen slettes (plan §5.0; S-04 retter det).
5. **"…en rytters træning og check-ins tilhører rytteren"**
   (`terms.yourData`). En rytter kan ikke selv slette sig; det kan kun en
   træner (`erase_rider` kræver ejer eller administrator, drizzle/0006).
   Det passer med, at klubben er dataansvarlig, men sætningen lover mere.
6. **Trænere kan læse rytteres og forældres IP-adresser.** Login skrives
   i revisionssporet med IP-adresse og browser og med holdet som
   `org_id` (`src/core/auth/auth.ts`, `recordAuthEvent`); trænere læser
   sporet, og det er med i eksporten ("Revisionsspor"). Ingen side siger
   det. Se dpia.md, risiko R9.
7. **Demo-teksten siger "24 timer"** i stedet for `{hours}`, selv om siden
   sender `hours` med; ændres `DEMO_TTL_HOURS`, passer teksten ikke.

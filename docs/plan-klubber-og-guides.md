# Kadence — plan til godkendelse: klubber, fællesskab og guides

Oktober 2026. Planen svarer på Martins "generelle input" af 3. oktober 2026. Den følger arbejdsgangen i CLAUDE.md: planen, skemaet og API-fladen
godkendes først, og derefter bygges der bølge for bølge, hver på sin egen
branch og med sin egen PR.

Det, der var en ren rettelse, er allerede lavet (afsnit 0). Resten venter
på et ja. Afsnit 11 samler Martins svar på planens spørgsmål.

Researchen bag planen ligger i `docs/research/`:

- `traeningsparadigmer.md` — alternativer til DCU's model
- `klasser-og-gearing.md` — klasserne, vejen til et juniorhold og gearingreglerne
- `udstyr.md` — hvor der er mest fart at hente pr. krone
- `ernaering.md` — mad, drikke, hjemmelavet energi, tænder og energiberegneren

---

## 0. Allerede rettet (PR #5)

`fix/respectful-coach-tone`, klar til at blive merget:

- "Kræver opmærksomhed" hedder nu **"Mulige opmærksomhedspunkter"**.
- "Forslag til, hvem du skal tale med, ikke regler." er fjernet.
- "Advarsler" hedder nu opmærksomhedspunkter.
- Vægtningsordene er nu **Vigtigt nu / Værd at se på / Godt at vide**.
- Punkterne siger "DCU anbefaler" og "ATK anbefaler".
- Alle "…, ikke regler"-forbehold er skrevet om til almindelige
  sætninger. Råd er formuleret som muligheder, ikke som ordrer.
- AI'ens mandagsoverblik bliver bedt om samme tone.
- Forældre, der hverken er træner eller rytter, ser ikke længere
  trænerguiden under Hjælp.

Tonen er nu et princip for alt nyt: Kadence taler til træneren som en
hjælpsom kollega, der ved, at træneren kender sine ryttere og bestemmer.
Det skrives ind i CLAUDE.md under "Danish in the interface", når PR #5 er
merget.

---

## 1. Mange klubber på kadence.haij.dk

### Det, der findes

- Hvert arbejdsrum er adskilt fra de andre i databasen med RLS (ADR 0002).
- En bruger kan være med i flere arbejdsrum, og der er en vælger i
  sidebjælken.
- Installationens ejer (`users.platform_role = 'owner'`) optager nye
  konti under Indstillinger → Adgang (ADR 0004).
- Når en ansøgning bliver godkendt, får ansøgeren et link. Linket låser
  e-mail og klubnavn og opretter klubbens arbejdsrum.

### Hullerne

1. **Alle, der er logget ind, kan oprette så mange arbejdsrum, de vil**
   ("Opret arbejdsrum" og `/onboarding`). Better Auth står til
   `allowUserToCreateOrganization` = ja og har ingen grænse. Optagelsen
   styrer altså, hvem der får en konto, men ikke, hvem der opretter klubber.
2. **Better Auths standardgrænse er 100 medlemmer pr. arbejdsrum.**
   En klub med 40 ryttere, 50 forældre og fem trænere er tæt på.
3. **Ved login vælges det aktive arbejdsrum tilfældigt**, fordi
   forespørgslen mangler en `ORDER BY`. Det er ligegyldigt med ét hold og
   forvirrende med to.
4. **Installationens ejer kan intet ud over at optage.** Der er intet
   overblik over klubberne. Det er godt for privatlivet, men gør driften
   blind.
5. **Arbejdsrummet har kun et navn.** Der er ikke noget logo eller
   billede. Kolonnen `organizations.logo` findes, men bruges ikke.

### Forslaget

**En klub er et arbejdsrum.** Vi beholder modellen og indfører ikke et
niveau mere. En klub med en U17-gruppe og en U19-gruppe bruger grupperne,
som holdplanen allerede har. Hvis en rigtig klub senere har brug for, at
trænere kun ser deres egen gruppe, bliver det en bølge for sig (se
spørgsmål 1).

**Installationens administration (`/admin`)**, kun for installationens
ejer:

- **Klubber:** navn, oprettet, antal trænere, ryttere og forældre,
  seneste aktivitet, pladsforbrug og AI-kald i dag. Kun tal.
  Administrationen ser aldrig en rytters navn, træning eller check-ins.
  Det håndhæves i databasen med én SECURITY DEFINER-funktion,
  `platform_overview()`. Den returnerer kun tællinger og afviser alle
  andre end ejeren. Funktionen kommer på listen i meta-testen.
- **Optag en klub:** den eksisterende ansøgning får feltet "klub", og
  godkendelsen opretter klubbens arbejdsrum med den første træner som
  ejer. Det er det samme flow som i dag, bare tydeligere.
- **Kun ejeren opretter nye arbejdsrum.** Andre opretter kun gennem en
  godkendt ansøgning. "Opret arbejdsrum" vises kun for ejeren. Demoen er
  undtaget, som i dag.
- **Ingen "log ind som".** En klub, der vil have hjælp, inviterer
  administratoren som træner for en tid. Det står i medlemslisten og i
  loggen, og klubben fjerner adgangen igen. Rytternes helbredsdata er
  grunden til, at den dør ikke findes.
- **Sletning:** klubbens ejer sletter selv, som i dag. Er ejeren væk,
  sletter administratoren på skriftlig anmodning med et script, ikke fra
  en knap. Scriptet skriver en linje i loggen.

**Grænser:** `membershipLimit` hæves til 500 og `invitationLimit` til
200 pr. arbejdsrum. Det aktive arbejdsrum ved login bliver det senest
brugte (en kolonne på medlemskabet), og ellers det ældste.

**Aftaler (Martins del):** Når Haij hoster for en klub, er klubben
dataansvarlig og Haij databehandler. Det kræver en databehandleraftale,
opdaterede vilkår på `/terms` og en opdateret `docs/subprocessors.md`.
Om det er gratis den første vinter, og hvad det koster bagefter, er
Martins beslutning. Dogme ét tillader en betalt udgave på samme kode.

### Logo og stemningsbillede

| Tabel        | Kolonner                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `org_images` | `org_id`, `kind` (`logo` \| `cover`), `mime`, `bytes` (bytea), `width`, `height`, `updated_at`, `updated_by`; PK `(org_id, kind)` |

- Tabellen har tvungen RLS: holdets medlemmer læser, og trænerne skriver.
- Den har en audit-trigger. Kolonnen hedder `bytes`, så `audit_redact`
  allerede holder billedet ude af loggen (drizzle/0003:380).
- Den kommer med i eksporten og forsvinder med arbejdsrummet.

**Upload:** browseren skalerer billedet med et canvas, til højst 512 px
for et logo og 1600 px for et stemningsbillede, og gemmer det som WebP.
Det fjerner også EXIF-data som GPS-position. Det kræver ingen ny
afhængighed.

**Serveren** godtager kun PNG, JPEG og WebP, tjekket på de magiske bytes.
SVG afvises, fordi en SVG kan bære script. Logoet må højst fylde 300 KB
og stemningsbilledet 2 MB.

**Ruter:**

- `POST /api/org/image`: multipart, kun trænere. Det er en rute, ikke en
  server action, fordi en action har et loft på 1 MB.
- `GET /api/org/image/[kind]`: kun medlemmer. Den sender
  `Cache-Control: private`, en ETag ud fra `updated_at` og `nosniff`.
- `DELETE /api/org/image/[kind]`.

**Hvor billederne vises:**

- Logoet står ved klubnavnet i sidebjælken, i vælgeren og øverst på
  forældresiden.
- Stemningsbilledet er et bånd øverst på I dag-siden for alle i klubben.

**Hvor de ikke vises:** på login-siden, fordi den ikke ved, hvilken klub
man kommer fra.

**ADR:** "Mange klubber på én installation". Den ændrer ADR 0004 (kun
ejeren opretter arbejdsrum) og beskriver administrationens tal-only-blik.

---

## 2. Klubmester

Det er det eneste sted i Kadence, hvor ryttere ser placeringer og
resultater. Det går imod ADR 0013 ("ingen ranglister nogen steder") og
ADR 0039 (placeringer er kun til træneren). En ny ADR ændrer begge og
siger, hvorfor klubmesterskabet er en undtagelse: det er en klubtradition,
klubben selv står for løbene, og klubben slår det til. Kadence regner det
ikke ud fra DCU-placeringer.

**Sådan virker det:**

- Klubben slår "Klubmesterskab" til under Indstillinger → Holdet. Det er
  slået fra som standard.
- Træneren opretter et mesterskab, fx "Klubmesterskab 2027", med
  afdelinger. Det kan være en enkeltstart, en bjergspurt, et linjeløb,
  et kriterium eller noget helt andet. En afdeling kan hænge på en
  begivenhed i kalenderen.
- Træneren skriver tider eller placeringer ind i et hurtigt skema. Point
  pr. placering er en enkel tabel, som klubben kan ændre. Standarden er
  10-8-6-5-4-3-2-1, og alle, der gennemfører, får ét point.
- Stillingen opdeles i klasser: U17, U19, U23 og "åben".
- **"Klubmestre gennem tiden"** er en æresliste pr. år og klasse.
  Træneren kan også skrive år ind fra før Kadence, med navne som tekst.

**Tonen er hyggelig:**

- Overskriften lyder "Tillykke til årets klubmestre". Podiet står øverst.
- Alle, der kørte med, står nedenunder.
- En ny personlig rekord på klubbens faste enkeltstart får sin egen lille
  markering.
- "Årets fremgang" går til den største forbedring på samme afdeling fra
  sidste år, og Kadence regner den ud.
- "Holdets ildsjæl" vælges af træneren.
- Der er ingen røde tal og ingen "sidst".

**Hvem ser det:** alle medlemmer af klubben, også forældre. Det er en
resultattavle i klubhuset. Andre klubber ser det aldrig. En rytter, der
ikke vil stå med navn, beder træneren fjerne det.

| Tabel                       | Kolonner                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `club_championships`        | `org_id`, `season`, `title`, `points` (jsonb), `created_by`                                                       |
| `club_championship_rounds`  | `org_id`, `championship_id`, `held_on`, `kind`, `title`, `measure` (`time` \| `place`), `event_id`?               |
| `club_championship_entries` | `org_id`, `round_id`, `rider_id`?, `name`, `class`, `time_ms`?, `place`?, `status` (`finished` \| `dnf` \| `dns`) |
| `club_champions`            | `org_id`, `year`, `class`, `title`, `rider_id`?, `name`, `note`                                                   |

**RLS:** alle medlemmer af klubben læser, og trænerne skriver. Det er en
bevidst undtagelse fra rytteradskillelsen, fordi `rider_id` her ikke går
gennem `app_can_read_rider`. Isolationstestene beviser tre ting:

- En anden klub ser intet.
- En holdkammerat ser stillingen, og det er undtagelsen, skrevet ned som
  en test.
- En rytter kan ikke skrive.

**Ren logik:** stilling, point, fremgang og personlige rekorder ligger i
`src/modules/club/standings.ts` og testes for sig.

**Sider:**

- `/klubmester` for alle, når klubmesterskabet er slået til.
- `/klubmester/[id]` for trænerens redigering.

**Senere, hvis I vil:** en afdeling i Rulle, hvor alle kører den samme
rute indendørs.

---

## 3. DCU's rolle

Det, Kadence allerede giver DCU:

- Deres anbefalinger bliver brugt, som de er skrevet, og med kilde.
- Deres styrkeprogrammer ligger i biblioteket.
- Deres klasseregler, distancer og udveksling er bygget ind.

DCU har ingen direktør før tidligst 2027. Den rigtige første kontakt er
stadig Morten Bennekou (elitechef).

Det, vi kan tilbyde, sorteret efter hvor meningsfuldt det er, og hvor lidt
det koster rytternes privatliv:

1. **Deres anbefalinger holdes levende.** DCU's tal ligger som data i
   `src/modules/dcu`. Når DCU udgiver nye anbefalinger, opdaterer Kadence
   dem med versionsnummer og kilde. Den gamle udgave kan stadig vælges.
   DCU kan læse og godkende tallene, før de går ud. For DCU er det en
   kanal ud til trænerne for deres anbefalinger, uden at de skal bygge
   noget selv.
2. **Klassereglerne som fælles data.** Distancer, udvekslingsgrænser og
   etapelængder kommer ét sted fra og bruges af gearingberegneren,
   trænerens råd og vagtværnet. DCU retter ét sted, og alle klubber har
   det samme.
3. **Et DCU-hjørne i Trænerrummet** (afsnit 5): kursusdatoer,
   regelændringer før sæsonen og nyt materiale. DCU's konsulent skriver,
   og trænerne spørger. Det er en direkte linje til klubtrænerne, som DCU
   ikke har i dag.
4. **Trænerguiden i samarbejde med træneruddannelsen.** Guiden kan pege
   på DCU's kurser og bruge samme sprog som uddannelsen.
5. **DCU som vært.** Koden er åben. DCU kan køre Kadence selv for alle
   klubber, eller vi hoster en installation med DCU som partner. Det er
   den store udgave, og den kræver en aftale.
6. **Viden uden navne, senere og kun med samtykke.** Et eksempel er "Hvor
   mange timer kører U17-ryttere faktisk i januar, sammenlignet med
   anbefalingen?" Svaret kunne gøre DCU's anbefalinger klogere. Det er
   helbredsdata om mindreårige, så det kræver samtykke fra rytteren, at
   klubben vælger det til, mindst ti ryttere i hver celle, en
   konsekvensanalyse og formentlig et forskningssamarbejde. Det hører til
   efter den første vinter og ikke før.
7. **Rytteren deler med en landstræner.** Før en talentlejr kan rytteren
   selv dele sine seneste otte uger med lejrens træner, læseadgang i en
   begrænset tid, som forældrelinket. Rytteren ejer det. DCU ser intet,
   rytteren ikke har valgt.

**Det, vi ikke tilbyder:** at DCU kan se rytteres data uden rytterens
eget valg. Det ville bryde princippet om, at rytteren ejer sine data, og
det ville gøre trænere og forældre utrygge ved værktøjet.

**Forslag:** Vi tager punkt 1–4 med til den første snak med DCU. Punkt 5
nævnes som en mulighed. Punkt 6 og 7 nævnes som noget, vi tænker over,
efter den første vinter. Der skrives ingen kode, før DCU har svaret. Et
kort oplæg til Bennekou kan ligge klar som kladde (aldrig sendt), hvis
Martin vil.

---

## 4. DCU's anbefalinger som et valg, og andre paradigmer

### Valget

Træneren skal kunne slå DCU's vejledning fra og til, når som helst.

**Hvor valget gemmes:** på to niveauer.

- **Holdets standard** ligger i `team_settings` som en kolonne
  `guidance` (tekst). Standarden er `dcu-2025`, og `none` betyder "ingen
  fast model". Senere kommer der én værdi pr. paradigme. Alle holdets
  trænere kan ændre den når som helst (se spørgsmål 4).
- **Den enkelte sæsonplan** har allerede kolonnen `basis`. Den kan
  afvige fra holdets standard, så en træner kan prøve et alternativ på
  én rytter. `basis` må være tom, når der ingen model er.

To trænere på samme hold ser altså det samme, og rytterne ser det
grundlag, deres plan er lagt efter.

**Når DCU's vejledning er slået fra, forsvinder:**

- DCU's kolonne og korridor i sæsonplanen. Træneren lægger sine egne
  timer, og `season_plans.basis` må være tom.
- DCU-baren under ugen i kalenderen og på rytterens I dag-side.
- Punkterne om timer i forhold til DCU's ramme og om den længste tur.
- DCU-rådene i trænerens råd.
- Linjen "følg DCU" i AI'ens prompts. AI'en følger i stedet trænerens
  sæsonplan og de almene principper for unge.

**Disse bliver, uanset valget**, fordi de handler om helbred og regler og
ikke om DCU's model:

- smertetrappen
- trivselszonerne
- søvn
- stigningen fra uge til uge
- 48 timer mellem styrkepas
- klassernes distancer og udvekslingsgrænser, som er DCU's regler og
  ikke anbefalinger

DCU's styrkeprogrammer og standardpas bliver også i biblioteket som
indhold.

**Hvor valget skal læses:** se kortlægningen i afsnit 9.

**ADR:** ændrer ADR 0014 ("DCU som standard"). DCU er stadig standarden,
men nu som et valg.

### Paradigmer

Et paradigme beskrives som data bag én fælles form, og DCU 2025 bliver
den første udgave af den form:

```ts
type Paradigm = {
  id: string; // "dcu-2025"
  name: string; // vist navn (message key)
  source: Source[]; // kilder med links
  hours(category, classYear, month): { low; target; high } | null;
  phases(month): PhaseKey | null;
  intensity(phase): { low; mid; high } | null; // andel af tiden
  longestRide(category): { hours; km } | null;
  strength: ProgrammeKey[];
};
```

Det ligger i `src/modules/paradigms/`, ren logik uden database, testet
for sig. DCU's tal flyttes ikke. `dcu-2025.ts` læser dem fra
`src/modules/dcu`.

**Hvilke alternativer:** se afsnit 4a, som bygger på
`docs/research/traeningsparadigmer.md`.

### 4a. Hvilke alternativer (`traeningsparadigmer.md`)

**DCU's model er ikke forældet.** Strukturen ligner det, norske
verdensklassetrænere gør i dag: mængde først, så intensitet, og fra lange
til korte intervaller. Den er tynd på to punkter:

- Intensiteten er kun angivet som "intervaltid 10–20 %", med tempo talt
  med.
- Der er ingen timetal for kvinder.

Der findes ikke nyere DCU-materiale end 2025-tabellen.

**Det, forskningen siger:**

- Evidensen handler om fordelingen af intensitet og ikke om timetal.
- Polariseret og pyramidal fordeling giver omtrent samme effekt
  (Rosenblat 2025, Oliveira 2024).
- Meget træning omkring tærsklen ser ud til at være dårligst. Det
  gælder også i det eneste studie af juniorcykelryttere i den rigtige
  alder (Guellich & Seiler 2010).
- Juniorer og U23 træner i praksis allerede meget i midterzonen (Gallo
  2022, Leo 2020), og løbene leverer en stor del af den hårde tid.
- Blokperiodisering gav ingen ekstra effekt i to forsøg med juniorer.

**Forslag, i denne rækkefølge:**

1. **"Lav intensitet først"**, en intensitetsprofil oven på enhver
   timemodel, også DCU's.
   - I distance- og basisfaserne ligger mindst 75–80 % i lav zone,
     højst 10 % i mellemzonen og resten i høj zone. Løbsdagene tæller
     med.
   - Profilen viser et opmærksomhedspunkt, når mellemzonen vokser sig
     stor.
   - Den hedder ikke "80/20", fordi ingen fast fordeling er bevist bedst.
   - Første skridt er en visning af ugens fordeling i tre zoner, talt
     efter pasets mål og ved siden af DCU's årshjul. Den bygger på
     `src/modules/load/zones.ts`.
2. **BDR 2009 (Tyskland)** som alternativ timemodel.
   - Den har timer pr. alder fra 15 til 20 år, og den er den eneste med
     tal for kvinder.
   - Den angiver også pas pr. uge, en rytme på 2:1 og 3:1 og en grænse
     for lange pas i træk.
   - Den er ældre end DCU's og har ingen månedsprofil. Kadence fordeler
     årstimerne efter DCU's profil og siger, at det er Kadences valg.
   - Vi skal spørge BDR om lov først.
3. **SCF 2025 (Sverige), "Den blågula cykelvägen"**, som korridormodel.
   - Den er den nyeste forbundsmodel.
   - Den har brede spænd pr. fase, og faserne følger modenhed og
     erfaring frem for årgang.
   - Kadence viser en korridor og ikke et mål.
   - Vi skal spørge SCF om lov.

**Kun links eller tekst i trænerguiden:** Cycling Canada og KNWU (alle
rettigheder forbeholdt), Sport for Life, Olympiatoppen, British Cycling,
IOC og REDs og "den norske model" med dobbelt tærskel, som der ikke er
evidens for hos unge.

**Et paradigme kan kun tilføje eller stramme vagtværn.** Det kan aldrig
løsne Kadences standarder for unge. I visningen med fire tal bliver
"DCU" til "Reference (DCU 2025)" eller "Reference (BDR 2009)".

---

## 5. Trænerrummet: et lille fællesskab for trænere

Det bygges, når der er flere klubber på installationen (efter afsnit 1).

**Hvad det er:**

- Tråde og svar i nogle få kategorier: Træning, Styrke, Trivsel, Løb og
  regler, Udstyr og DCU-hjørnet.
- En tråd kan have en kopi af et pas fra klubbens bibliotek vedhæftet,
  altså strukturen og ingen rytterdata. Den, der læser, kan tage passet
  med i sit eget bibliotek med ét tryk.
- Navn og klub står ved hvert indlæg.

**Hvem:**

- Kun trænere, dvs. ejer eller administrator i mindst ét arbejdsrum.
- Ryttere og forældre ser det aldrig.
- Der er ingen private beskeder, heller ikke mellem trænere. Det holder
  dogmet om ingen private samtaler mellem voksne og unge enkelt, og det
  gør moderationen overskuelig.

**Regler:**

- Ved skrivefeltet står én linje: "Del erfaringer om træningen, og hold
  rytternes navne ude af det."
- Indlæg kan anmeldes, og installationens ejer modererer: skjuler et
  indlæg eller låser en tråd.
- Der er ingen AI i Trænerrummet.
- Der sendes ingen mails, fordi Kadence ikke har mail. Ulæste tråde vises
  som et tal i menuen.

| Tabel               | Kolonner                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `community_threads` | `author_user_id`, `author_org_id`, `category`, `title`, `body`, `workout` (jsonb)?, `locked`, `hidden_at`, `hidden_by` |
| `community_posts`   | `thread_id`, `author_user_id`, `author_org_id`, `body`, `edited_at`, `hidden_at`, `hidden_by`                          |
| `community_reports` | `target_kind`, `target_id`, `reporter_user_id`, `reason`, `handled_at`, `handled_by`                                   |
| `community_reads`   | `user_id`, `thread_id`, `last_read_at`                                                                                 |

**Tabellerne har ingen `org_id`**, fordi de hører til installationen.
Det er en undtagelse fra tjeklisten i CONTRIBUTING.md og får sin egen ADR.
Tabellerne har stadig tvungen RLS og audit-triggere:

- Læse og skrive kræver `app_is_coach_somewhere()`, en ny SECURITY
  DEFINER-funktion, som kommer på listen i meta-testen.
- Man retter kun egne indlæg.
- Kun ejeren skjuler og låser.

**Testene beviser:**

- En rytter og en forælder læser intet.
- En træner fra klub A kan ikke rette i et indlæg fra klub B.
- Et skjult indlæg ses kun af forfatteren og ejeren.

**Eksport og sletning:**

- Klubbens eksport har dens træneres indlæg med.
- Sletter en træner sin konto, bliver indlæggene til "Tidligere træner"
  uden navn. Ellers giver svarene i tråden ingen mening.

**En selvhostet klub** får sit eget, tomme Trænerrum. Det står ærligt i
dokumentationen.

**ADR:** "Et rum for trænere på tværs af klubber".

---

## 6. Forældre: viden om sporten, udstyr og mad

Tre guides i samme form som trænerguiden (ADR 0021):

- Hvert afsnit har en id i et modul.
- Teksten ligger i `messages`, dansk først.
- Kilderne står under hvert afsnit, med Kadences egne ord og links til
  originalerne.

Guiderne ligger offentligt på `/viden/...`, uden login, og linkes fra
forældresiden og fra Hjælp. De må gerne kunne deles med en forælder, der
endnu ikke er med.

1. **Klasserne og vejen videre** (`/viden/klasserne`): forskellen på
   U15, U17, U19 og U23 i distancer, licens, udveksling, løb og udland,
   og det uskrevne. Det handler om, hvordan og hvornår man kommer på et
   juniorhold, hvad der bliver lagt mærke til, skole og sport, og hvornår
   man typisk skifter klub. Det dokumenterede og det, der er almindelig
   erfaring, står hver for sig.
2. **Udstyr: hvor der er mest at hente** (`/viden/udstyr`): en tabel over
   fart pr. krone med watt eller sekunder og kilde, fra position og tøj
   over dæk og kæde til hjul og stel. Det, der mest er kosmetik, står
   uden løftede pegefingre. Der er også et afsnit om at købe brugt.
3. **Mad og drikke** (`/viden/mad`): energi og kulhydrat efter
   træningsmængde, før, under og efter løb, og væske og salt. Der er
   opskrifter på hjemmelavede barer, riskager og energidrik med gram
   kulhydrat og pris pr. portion. Afsnittet om tænder handler om, hvorfor
   ryttere får huller og syreskader, og hvad der hjælper. Kosttilskud
   behandles efter Anti Doping Danmarks råd. Til sidst kommer tegnene på
   for lidt energi, sagt roligt og uden at tale om vægt.

ADR 0021 siger, at guiden aldrig regner energitilgængelighed ud. Det
gælder stadig. Mad-guiden og beregneren handler om brændstof til et løb
og aldrig om, hvor lidt en ung bør spise.

**Klasserne: det, guiden kan sige med kilde** (`klasser-og-gearing.md`):

- Klassen afgøres af det år, rytteren fylder, og ikke af fødselsdagen.
  Den skifter 1. januar.
- Der er ingen U23-klasse i almindelige danske løb. U23-ryttere kører i
  Herre A–D efter point.
- Ryttere i U17 og yngre må ikke køre for et hold.
- Ingen må kontakte en rytter under 18 om klubskifte til næste sæson før 15. juni. Aftaler kan tidligst underskrives 1. september.
- UCI's internationale løb åbner fra det år, rytteren fylder 17.
- Licensen er gratis til og med U15. Fra U17 koster den 1.080 kr. i
  Jylland og på Fyn og 1.215 kr. på Sjælland (2026).
- Ungdomsklasserne kører aldrig med radio. Forplejning er kun tilladt i
  løb over 100 km.
- Team Danmarks skoleordninger kræver en plads i DCU's landsholdstrup.
  Der kører et forsøg med treårigt gymnasium fra 2026 til 2029.

**Det, guiden ikke kan sige med kilde:** hvordan danske juniorhold
faktisk finder deres ryttere, og hvad det koster forældrene. Det står i
guiden som almindelig erfaring og er mærket sådan. Det er et godt
spørgsmål til DCU og til to–tre juniorholdledere, før guiden går live.

**Udstyr: det, guiden viser** (`udstyr.md`). Tallene gælder for en
rytter alene i vinden ved 40 km/t, og guiden siger det tydeligt:

- **Feltet sætter det i perspektiv.** Midt i et felt har en rytter kun
  5–10 % af luftmodstanden i forhold til at køre alene (Blocken 2018).
  Aero-udstyr betyder mest i enkeltstart, i udbrud og i vinden.
  Rullemodstanden er den samme i feltet.
- **Gratis eller billigt:**
  - en ren og smurt kæde: 6–12 W efter regn
  - en lavere position: 8–35 W
  - tøj, der ikke blafrer: ca. 10 W
  - latexslanger: ca. 5–6 W for ca. 200 kr.
  - hurtige dæk frem for billige: ca. 20 W for ca. 800–950 kr. pr. par
- **Lidt dyrere:**
  - aero-skoovertræk: ca. 6 W
  - aero-hjelm: ca. 4,5 W
  - skinsuit, hvis klubben har en godkendt: ca. 10 W
- **Dyrt:**
  - dybe kulfiberhjul: 4,6–6,6 W for 8.700–17.600 kr.
  - en ny aero-cykel i stedet for en ti år gammel aluminiumscykel:
    17–32 W for 70.000–110.000 kr.
- **Tæt på intet:**
  - 105 → Dura-Ace: ca. 550 g lettere og ingen kendt watt-gevinst for
    ca. 17.000 kr.
  - keramisk krankleje: 0,03 W
  - store pulleyhjul: producentens egen påstand, ikke målt af andre
- **DCU's udstyrsregler 2026 for de unge:**
  - U11–U17 må ikke bruge enkeltstartscykel, aerobøjle, skivehjul eller
    hjul med under 12 eger.
  - Fælgene må højst være 65 mm dybe, og styret skal være mindst 40 cm
    bredt.
  - Man kører i klubbens godkendte dragt.
- **Træningsværktøjer:** et pulsbælte til 356–699 kr. er den billigste
  start. To små studier på voksne fandt samme fremgang, uanset om
  intervallerne blev styret efter puls eller watt.

Næsten alle målinger er lavet på voksne, og guiden siger det.

**Mad og drikke: det, guiden viser** (`ernaering.md`):

- **Kulhydrat pr. dag:** 5–7 g/kg ved under 1,5 timers træning om dagen
  og 7–10 g/kg ved mere (Team Danmark 2026). Protein: 1,2–2,0 g/kg for
  unge i vækst.
- **Hjemmelavet** (opskrifterne kommer med gram og pris):
  - En hverdagsdunk med ca. 6 % kulhydrat koster 0,5–7 kr. pr. liter.
  - En brændstofdunk med 8 % koster 0,5–2,5 kr. for 60 g kulhydrat,
    mod 15–20 kr. for købt pulver.
  - Søde riskager koster 0,4–1,4 kr. for 32 g, mod 25–30 kr. for en gel.
  - Havrebarer koster 3–4 kr. stykket.
  - Almindeligt sukker er allerede glukose og fruktose 1:1, hvilket er
    inden for det bedste område. To dele sukker og én del druesukker
    giver 2:1.
- **Fødevaresikkerhed:** ris kan bære Bacillus cereus. Fødevarestyrelsens
  regel om nedkøling (fra 56 til 10 °C inden for 4 timer) står ved
  opskriften.
- **Tænder:** i en undersøgelse af atleter ved OL i London havde 55 %
  huller og 45 % syreskader (Needleman 2013).
  - Det, der hjælper, er vand efter geler og sportsdrik, fluortandpasta
    og at fortælle tandlægen, at man træner meget.
  - Den kommunale tandpleje er gratis til og med 21 år.
  - Højfluor-tandpasta (5000 ppm) er receptpligtig og først fra 16 år.
  - Rådet om at vente med at børste efter syrlige drikke er omstridt i
    nyere oversigter, så guiden giver det ikke som en regel.
- **Kosttilskud:** Anti Doping Danmark siger, at de fleste unge ikke har
  brug for dem. Risikoen for et forurenet produkt er 10–15 % og op mod
  50 % for tabletter (Team Danmark).
- **For lidt energi (REDs):** tegnene hos både piger og drenge, fx at
  væksten flader ud eller en hvilepuls under 50, og hvornår man skal til
  læge med det samme. Det skrives roligt og uden at tale om vægt.

Afsnittet om REDs bør læses igennem af en sportsdiætist fra Team Danmark
eller DIF, før guiden går live (se spørgsmål 10).

---

## 7. Beregnere for ryttere, åbne for alle

Begge beregnere ligger offentligt på `/beregner/...` og kører helt i
browseren. Intet bliver gemt, og der er ingen cookies ud over sproget.
De står også i menuen for ryttere og trænere, når man er logget ind.

### Energi til løbet (`/beregner/energi`)

**Input:**

- klasse
- løbets varighed
- temperatur
- intensitet: gennemsnitswatt (bedst), fart (kun til enkeltstart),
  puls eller løbstype
- om rytteren har øvet sig i at spise meget kulhydrat på træning
- dunkstørrelse og hvad der er i dunken
- gram kulhydrat pr. riskage, gel eller bar

**Vægten er valgfri** og bliver i browseren. Uden vægt viser beregneren
stadig gram kulhydrat pr. time og planen med dunke. Måltidet før og
efter løbet og grænsen for væsketab kræver vægten, fordi de regnes pr.
kg.

**Formlerne**, hver med kilde i koden og under beregneren:

| Trin                   | Formel                                                                                    | Kilde                                    |
| ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| Arbejde                | kJ = gennemsnitswatt × sekunder / 1000                                                    | fysik                                    |
| Energi                 | kcal = kJ / (bruttoeffektivitet × 4,184), med effektivitet 18–23 %, dvs. kJ × 1,04–1,33   | Hopker 2009                              |
| Fra fart (enkeltstart) | P = (½·ρ·CdA·v³ + Crr·m·g·v + m·g·H/t) / 0,976                                            | Martin 1998; CdA fra Defraeye 2010       |
| Fra puls               | Keytels ligninger for mænd og kvinder                                                     | Keytel 2005, kun gyldig fra 18 til 45 år |
| Kulhydrat pr. time     | under 45 min: ingen; 1–2,5 t: 30–60 g/t; over 2,5 t: op til 90 g/t af glukose og fruktose | Thomas 2016, Jeukendrup 2014             |
| Væske                  | højst 2 % vægttab (1 % over 30 °C), og aldrig mere end svedraten                          | ACSM / Thomas 2016                       |
| Natrium                | liter pr. time × 500–700 mg                                                               | Thomas 2016                              |
| Før løbet              | 1–4 g kulhydrat pr. kg, 1–4 timer før                                                     | Thomas 2016                              |
| Efter løbet            | 1–1,2 g kulhydrat pr. kg pr. time, 0,25–0,3 g protein pr. kg, 1,25–1,5 L pr. kg tabt      | Thomas 2016                              |

**Output:**

- energiforbruget som et interval og ikke som ét tal
- gram kulhydrat pr. time og i alt
- antal dunke og riskager eller geler
- prisen hjemmelavet mod købt
- væske og salt pr. time
- måltidet før og efter løbet

**Kadences egne valg, som kræver Martins ja** (spørgsmål 10). Ingen
kilde har et tal i gram pr. time for teenagere, så forslaget er:

- Loftet er 60 g/t for U17 og for alle, der ikke har øvet sig i at spise
  meget på træning.
- Op til 90 g/t gælder kun for løb over 2,5 timer, og kun hvis rytteren
  har øvet det.
- Fartmetoden tilbydes kun til enkeltstart, fordi der ikke findes en
  gennemsnitlig læfaktor for et helt feltløb.

Beregneren siger, at den ikke er medicinsk rådgivning. Den viser, hvad
der er usikkert, fx bruttoeffektivitet hos 15–18-årige og pulsmodellen
under 18 år.

### Gearing for de mindre klasser (`/beregner/gearing`)

**Formlen:** rollout (m) = klingens tænder ÷ tandhjulets tænder × hjulets
omkreds. **Grænserne** er DCU's Sportslige regler 2026, kap. 7. U17's
grænse ligger allerede i `src/modules/dcu/races.ts`:

| Klasse       | Landevej, højst | Kilde                                                |
| ------------ | --------------- | ---------------------------------------------------- |
| U11 og U13   | 6,18 m          | kap. 7 §1.18-4 og §1.17-4                            |
| U15          | 6,68 m          | kap. 7 §1.16-5                                       |
| U17          | 7,33 m          | kap. 7 §1.15-4                                       |
| U19 og ældre | fri gearing     | DCU gearinfo 2023; UCI art. 2.2.023 ophævet 1.1.2023 |

**Input:**

- klasse
- dæk (23, 25, 28, 30 eller 32 mm), eller en omkreds man selv har målt
- klinger
- kassette: vælg en almindelig, eller skriv tandhjulene ind

**Output:**

- rollout i hvert gear
- hvilke gear der går over grænsen
- den største lovlige klinge til det mindste tandhjul, og omvendt

**Advarsler:**

- Beregneren advarer, når cyklen ligger mindre end 5 cm under grænsen.
- Den siger, at et 28 mm dæk kan sende DCU's egne forslag over grænsen.
  Et eksempel er 44×14 i U15, som giver 6,71 m.
- Den siger, at kun en måling på cyklen er sikker, og viser, hvordan
  kommissæren måler: cyklen trilles baglæns én pedalomgang.

**Produkter** vises som en neutral liste over mulige løsninger, uden
affiliate-links:

- **Junior-kassetter, der starter på 14 eller 16 tænder:**
  - Miche Primato K12 (12-speed Shimano, fx 14-30, ca. 999 kr.)
  - Miche Primato Light (11-speed) og Primato (10-speed)
  - Recon 12s (14-28, passer også på SRAM XDR med adapter)
  - E.Dubied 12s (14-28 og 15-28, til Shimano, SRAM XDR og Campagnolo)
  - Shimano CS-R8000 14-28 (11-speed)
- **Alternativt** en mindre klinge og en almindelig 12-speed-kassette,
  efter DCU's forslag (U17 38/11 eller 34/10).

Det står tydeligt, at det ikke er tilladt at "låse" de største gear med
stopskruen. Priserne er fra oktober 2026 og dateres i beregneren.
**"Megane"** har vi ikke kunnet finde som mærke (se spørgsmål 8).

**Ren logik:** `src/modules/calc/energy.ts` og `src/modules/calc/gearing.ts`,
testet for sig. Hvert tal har sin kilde ved siden af i koden og under
beregneren.

**Proxyen:** `/beregner` og `/viden` holdes ude af `PROTECTED_PREFIXES`.

---

## 8. Rytterens egne pas

En rytter kan bygge sine egne pas. De er personlige, træneren kan se dem,
og træneren kan tage dem ind i holdets bibliotek.

**Skema:** `workout_templates` får to nye kolonner:

- `rider_id` (tom = holdets bibliotek; udfyldt = rytterens eget)
- `copied_from` (hvor et pas i biblioteket kom fra)

**RLS:**

| Handling | Holdets bibliotek (`rider_id` tom) | Rytterens eget (`rider_id` sat)                                                 |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| Læse     | alle på holdet, som i dag          | `app_can_read_rider(rider_id, 'training')`: træner, rytter, forælder med deling |
| Skrive   | trænere, som i dag                 | `app_can_write_rider(rider_id)`: rytteren selv og holdets trænere               |

**Service:** `training/templates.ts` lader en rytter oprette, rette og
arkivere sine egne pas. En ny funktion, `adoptTemplate`, findes kun for
trænere. Den kopierer passet ind i holdets bibliotek med "Lavet af
{rytter}" og `copied_from`.

**Brugerfladen:**

- Rytteren får "Mine pas" i biblioteket og bruger byggeren til dem. Passet
  kan lægges i rytterens egen kalender, som i dag.
- Træneren ser fanen "Rytternes egne" i biblioteket og på rytterens side,
  med knappen "Tag ind i holdets bibliotek".

**Testene beviser:**

- Rytter B ser ikke rytter A's pas.
- Træneren ser begge.
- En forælder ser kun pas fra et barn, der deler sin træning.
- En anden klub ser intet.
- En rytter kan ikke skrive i holdets bibliotek.

---

## 9. Hvor DCU-valget skal læses (kortlægning)

| Sted                                                                                 | Ændring                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `insight/rider.ts`, `load/guardrails.ts`                                             | korridor og længste tur bliver `null`, når der ingen model er |
| `season/plans.ts`, `season/page.tsx`, `season_plans.basis`                           | plan uden model; DCU-kolonnen kun med model                   |
| `season/volume.ts`, `season/volumes.ts`, `calendar/week-totals.tsx`                  | baren efter modellen eller trænerens egen plan                |
| `components/load/week-bars.ts`                                                       | rytterens I dag-side                                          |
| `coach/tips.ts`, `components/coach/team-tips.ts`                                     | DCU-rådene kun med DCU                                        |
| `assist/week-draft.ts`, `group-week.ts`, `build-workout-prompt.ts`, `coach-brief.ts` | prompten følger det valgte grundlag                           |
| `training/recurrence.ts`, `training/blocks.ts`, `training/goals.ts`                  | DCU-noter og forslag kun med DCU                              |
| `library/page.tsx` (installér DCU's programmer)                                      | står der stadig, men skubbes ikke frem uden DCU               |

---

## 10. Rækkefølge

Hver bølge er en vertikal skive på sin egen branch og med sin egen PR.

| Bølge | Indhold                                                                                                                                     | Skema                                                      | ADR                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------- |
| A     | Beregnerne (energi, gearing) og de tre forældreguides, offentlige                                                                           | intet                                                      | én om offentlige sider |
| B     | Mange klubber: kun ejeren opretter, grænser, senest brugte arbejdsrum, `/admin`, logo og billede                                            | `org_images`, kolonne på medlemskab                        | én                     |
| C     | DCU som valg og paradigme-formen; DCU 2025 som første udgave                                                                                | `team_settings.guidance`, `season_plans.basis` må være tom | ændrer 0014            |
| D     | Rytterens egne pas                                                                                                                          | to kolonner på `workout_templates`                         | én                     |
| E     | Klubmester                                                                                                                                  | fire tabeller                                              | ændrer 0013 og 0039    |
| F     | Trænerrummet                                                                                                                                | fire tabeller uden `org_id`                                | én                     |
| G     | "Lav intensitet først": ugens fordeling i tre zoner og profilen oven på enhver timemodel; derefter BDR 2009 og SCF 2025, når de har sagt ja | intet (ren logik)                                          | én                     |

A kommer først, fordi den ikke afhænger af noget og giver værdi med det
samme. B skal være på plads før F, fordi Trænerrummet kræver flere
klubber. C kommer før G.

---

## 11. Afgjort 3. oktober 2026

Martin sagde ja til planen og til alle buddene herunder. Hans eneste
rettelse var punkt 8.

1. **Klub eller hold:** én klub er ét arbejdsrum, og alle trænere ser
   alle ryttere. Begrænsning til en gruppe kommer først, når en rigtig
   klub beder om det.
2. **Hosting:** gratis for de første klubber gennem vinteren 2026–27, med
   en databehandleraftale fra dag ét. Databehandler er Martins firma,
   indtil Haij eventuelt bliver en juridisk enhed. Prisen fastsættes
   efter vinteren.
3. **Klubmester:** kun klubbens egne afdelinger. Point fra DCU's
   resultater kan komme senere som et tilvalg.
4. **DCU-valget:** for hele holdet. Alle holdets trænere kan ændre det,
   og den enkelte sæsonplan kan afvige.
5. **Paradigmer:** "Lav intensitet først" bygges først, derefter BDR 2009
   og så SCF 2025.
6. **Trænerrummet:** DCU's folk må være med som verificeret organisation
   med et DCU-hjørne. De får samme rettigheder som trænerne og ingen
   adgang til klubbernes data.
7. **Offentlige sider:** beregnere og guides ligger åbent på
   kadence.haij.dk. De vises ikke frem på haij.dk før efter vinteren.
8. **Produkter:** Martin mente **Magene** (magene.com). Magene laver
   billige wattmålere, pulsbælter, cykelcomputere, hometrainere og
   QED-klinger (50-34, 52-36 og 53-39, 110 BCD, til Magenes egne
   kranksæt). Den mindste klinge er 50 T, så Magene løser ikke grænsen
   alene, men sammen med en junior-kassette, fx 50 × 16 = 6,58 m i U15.
   Magene står i gearingberegnerens produktliste og i udstyrsguiden under
   træningsværktøjer.
9. **Spørgsmålene til DCU** tager Martin med til den første snak.
   Indtil da er beregneren forsigtig:
   - Den behandler det som forbudt at låse gear med stopskruen.
   - Den viser U17's grænse for U17-ryttere uanset løb.
   - Den forklarer målemetoden med en note om, at DCU ikke har beskrevet
     den.
10. **Energi og mad:** loftet på 60 g/t for U17 og for ryttere uden
    mavetræning er godkendt. Beregneren kan gå live med det samme.
    Mad-guiden går først live, når en sportsdiætist har læst afsnittet om
    REDs igennem. Derfor ligger den i sin egen PR.
11. **Rettigheder:** Claude skriver kladder til BDR og SCF på engelsk, som
    Martin sender. Indtil de svarer, linker Kadence kun til deres
    materiale.

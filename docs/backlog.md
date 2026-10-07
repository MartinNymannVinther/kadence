# Backlog efter fokus-bølgen

Det, der står tilbage, når `feat/fokus-vinter` (docs/plan-fokus-vinter.md)
er landet. Hver linje er en user story med acceptkriterier og en prompt,
der kan gives direkte til Claude Code. Oprettet 6. oktober 2026 ud fra
gennemgangen af `main` den 5. oktober og agenternes rapporter fra
fokus-bølgen.

## Sådan læses den

| Prioritet | Betyder                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------- |
| **P1**    | Før piloten: det første rigtige hold skal i gang i oktober, før DCU's distanceperiode 1. november |
| **P2**    | I løbet af vinteren, mens piloten kører                                                           |
| **P3**    | Efter vinteren, eller når pilotens tal eller trænere beder om det (dogme syv)                     |
| **A**     | Afklaringer uden kode, som Martin skal tage; Claude kan forberede dem                             |
| **R**     | Oprydning                                                                                         |

Størrelse: **S** er under en dag, **M** er et par dage, **L** er en uge
eller mere. Rækkefølgen inden for en prioritet er den anbefalede.

## Status

P1 er i gang på grenen `feat/p1-foer-piloten`, bygget på `main` a814c6c (efter #21 og #22). Hvert spor bygges i sit eget worktree med egen database og flettes ind på P1-grenen, når det er grønt. Statusloggen nyeste først:

- **7. okt.** PR #25 (øvelser og programmer) er merget. N-01 (navigation efter opgaver) er godkendt og i gang på `feat/navigation-efter-opgaver`.
- **7. okt.** Øvelser og programmer er færdig: Ø-01 til Ø-05 er flettet ind på `feat/ovelser-og-programmer`, hele suiten er grøn (2.431 tests, 1.329 enhedstests), build kompilerer, og PR #25 er klar til Martin. Samlet forbrug: ca. 1,9M tokens mod et skøn på 1,7–2,85M.
- **6. okt., nat.** Ø-02 og Ø-04 er færdige og flettet ind; hele suiten er grøn (2.430 tests, 1.329 enhedstests) og build kompilerer. Ø-05 (demo, hjælp og ADR) er sat i gang. Forbrug for Ø-01 til Ø-04: ca. 1,6M tokens mod et skøn på 1,6–2,7M.
- **6. okt., aften.** Ø-01 er færdig og flettet ind (23 øvelser, 4 programmer, tegnefunktionen og de fælles komponenter); hele suiten er grøn (2.340 tests). Ø-02 og Ø-04 er sat i gang parallelt.
- **6. okt., aften.** Ø-03 (holdets egne øvelser og programmer i databasen) er færdig og flettet ind; hele suiten er grøn (2.297 tests). Ø-01 arbejder stadig.
- **6. okt., aften.** Øvelser og programmer (Ø-01 til Ø-05) er godkendt og sat i gang på `feat/ovelser-og-programmer`: kontrakten i `src/modules/exercises/types.ts` er lagt, Ø-01 og Ø-03 kører parallelt.
- **6. okt., aften.** P1 er færdig: alle otte stories er flettet ind på `feat/p1-foer-piloten`, hele suiten er grøn (2.243 tests), build kompilerer, og PR #23 er klar til Martin. Samlet forbrug for P1: ca. 1,7M tokens mod et skøn på 1,4–2,2M. Næste skridt er Martins: læse PR'en, prøve påmindelser på en telefon (P1-05) og Rulle på en hometrainer (P1-06), og udfylde kontaktoplysningerne i pilotguiden.
- **6. okt., eftermiddag.** P1-01, P1-02+05, P1-04 og P1-06 er færdige og flettet ind; hele suiten er grøn (2.243 tests) og build kompilerer. Samlet forbrug for P1-01 til P1-07: ca. 1,4M tokens mod et skøn på 1,2–2,0M. P1-08 (pilotguiden) er sat i gang.
- **6. okt., eftermiddag.** P1-03 og P1-07 er færdige og flettet ind; hele suiten er grøn (2.143 tests).
- **6. okt., middag.** De fem parkerede dele er slået til som standard (PR #24, ADR 0057 tillæg), og den ændring er flettet ind i P1-grenen, så P1 bygger oven på den. P1-sporene blev stoppet ved en fejl, før de nåede at skrive noget, og er sat i gang igen fra den opdaterede gren.
- **6. okt.** P1 sat i gang. Migreringerne 0029 (påmindelser om trivsel), 0030 (invitationens rolle) og 0031 (pilotens tal) er lagt på P1-grenen først, så sporene ikke tager samme nummer. P1-01, P1-02+05, P1-03+07, P1-04 og P1-06 kører parallelt; P1-08 skrives til sidst.

## Tokens og model

Hver story har et skøn over, hvor mange tokens en Claude Code-session
bruger på den, og en anbefalet model. Skønnet tæller alt, sessionen
behandler: kontekst, der læses igen ved hvert skridt (det meste fra
cache), værktøjsresultater og svar. Det er kalibreret mod fokus-bølgen den 6. oktober 2026, hvor seks agenter byggede hver sit spor med tests og ADR
for 309.000–447.000 tokens på 27–42 minutter, og fire læsende
gennemgange brugte 143.000–163.000. Regn med ±50 %. En story, der beder
om plan først, bruger 40.000–80.000 tokens ekstra til planen og svaret.

| Model         | Model-id           | Kør med          | Pris pr. 1M tokens ind / ud | Vælges til                                                                                   |
| ------------- | ------------------ | ---------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| **Fable 5.1** | `claude-fable-5-1` | `--model fable`  | $10 / $50                   | Det sværeste: tværgående sikkerhed og framework-arbejde, hvor en fejl er dyr at finde senere |
| **Opus 5.5**  | `claude-opus-5-5`  | `--model opus`   | $4 / $20                    | Skema, RLS, definer-funktioner, audit, data om mindreårige, integrationer og afvejninger     |
| **Sonnet 5**  | `claude-sonnet-5`  | `--model sonnet` | $2 / $10                    | Afgrænsede funktioner uden nye politikker, brugerflade, tekst og dokumentation               |
| **Haiku 4.5** | `claude-haiku-4-5` | `--model haiku`  | $1 / $5                     | Mekaniske opgaver med en færdig liste                                                        |

Opus 5.5 tænker på mellemniveau som standard; sæt effort til høj for
stories med RLS, audit eller trivselsdata. Priserne er Anthropics
listepriser; i Claude Code er det meste input læst fra cache, som koster
omkring en tiendedel, så en sessions pris ligger langt under tokens gange
inputprisen. Alle fire modeller har 1M tokens kontekst undtagen Haiku 4.5,
der har 200.000, hvilket rækker til de to opgaver, den er valgt til.

Samlet skøn: **P1** ca. 1,4–2,2M · **P2** ca. 2,9–4,8M · **P3** ca.
2,6–4,3M · **A** ca. 0,4–0,75M · **R** ca. 0,15–0,26M · alt i alt ca.
7,4–12,3M tokens.

## 0. Rammen for alle prompts

Hver prompt nedenfor begynder med "Følg rammen i docs/backlog.md §0".
Rammen er:

1. Læs CLAUDE.md, AGENTS.md og de ADR'er, prompten nævner.
2. Byg i et worktree med egen database:
   `git worktree add .claude/worktrees/<navn> -b <gren> main`, kopiér
   `.env`, ret de tre database-URL'er til `kadence_<navn>`, kør
   `pnpm install`.
3. Plan først for alt, der er større end en rettelse: vis planen,
   skemaændringerne og API-fladen, og vent på Martins ja.
4. Ingen ny afhængighed og ingen slettet fil uden Martins ja.
5. Tekst kun i `messages/da.json` og `messages/en.json` med samme nøgler,
   redigeret uden at sende filerne gennem JSON.parse/stringify. Du-form,
   korte sætninger, ingen udråbstegn, trænere tiltales som en hjælpsom
   kollega.
6. En ny tabel har `org_id`, tvungen RLS, audit-trigger og isolationstest;
   handler den om en rytter, går den gennem `app_can_read_rider` og
   `app_can_write_rider`.
7. Demoen viser funktionen, når dens flag er slået til, med en test i
   `tests/demo`.
8. Grønt før hvert commit: `pnpm format`, `pnpm lint`, `pnpm typecheck`,
   `pnpm test`, og `pnpm build` ved routes eller konfiguration.
9. En væsentlig beslutning får en ADR; tjek næste ledige nummer lige før
   PR'en.
10. Push grenen og åbn en PR til Martin med `gh pr create`. Merge ikke
    selv.

## Oversigt

| ID    | Story                                                      | Prio | Str. | Tokens (ca.) | Model     | Afhænger af       | Status       |
| ----- | ---------------------------------------------------------- | ---- | ---- | ------------ | --------- | ----------------- | ------------ |
| P1-01 | Inviter hele holdet på én gang                             | P1   | M    | 300–450k     | Opus 5.5  |                   | Færdig       |
| P1-02 | Træneren får besked, når en rytter er i rød zone           | P1   | M    | 250–400k     | Opus 5.5  | ADR 0060 (push)   | Færdig       |
| P1-03 | Invitationen siger rytter eller forælder                   | P1   | S    | 120–200k     | Opus 5.5  |                   | Færdig       |
| P1-04 | Pilotens tre tal                                           | P1   | M    | 300–450k     | Opus 5.5  |                   | Færdig       |
| P1-05 | Prøv påmindelser på en rigtig telefon                      | P1   | S    | 100–180k     | Sonnet 5  | ADR 0060 (push)   | Færdig       |
| P1-06 | Rulle møder en rigtig hometrainer                          | P1   | S    | 120–200k     | Sonnet 5  |                   | Færdig       |
| P1-07 | Ryttere og forældre kan forlade holdet igen                | P1   | S    | 50–100k      | Sonnet 5  |                   | Færdig       |
| P1-08 | En pilotguide til træneren                                 | P1   | S    | 120–200k     | Sonnet 5  | A-05              | Færdig       |
| P2-01 | Garmin-ture ind af sig selv gennem Tredict                 | P2   | L    | 600k–1M      | Opus 5.5  | A-07 (Martins ja) | Ikke startet |
| P2-02 | Mine ture: en liste over rytterens ture                    | P2   | S    | 80–150k      | Sonnet 5  |                   | Ikke startet |
| P2-03 | Tid, sted og kørsel på løb og begivenheder                 | P2   | M    | 200–300k     | Sonnet 5  |                   | Ikke startet |
| P2-04 | Forældre lægger familiens begivenheder ind                 | P2   | M    | 250–400k     | Opus 5.5  | P2-03             | Ikke startet |
| P2-05 | En fælles kladde til ugeplanen for flere trænere           | P2   | M    | 250–400k     | Opus 5.5  |                   | Ikke startet |
| P2-06 | Tilgængelighed: kontrast, bevægelse og fokus               | P2   | S    | 120–200k     | Sonnet 5  |                   | Ikke startet |
| P2-07 | Medlemmer kan ikke læse hinandens e-mailadresser           | P2   | M    | 400–700k     | Fable 5.1 |                   | Ikke startet |
| P2-08 | Rate-limiteren stoler kun på egne proxyer                  | P2   | S    | 60–120k      | Sonnet 5  |                   | Ikke startet |
| P2-09 | Parkerede sider svarer 404                                 | P2   | S    | 100–200k     | Sonnet 5  |                   | Ikke startet |
| P2-10 | Enhedssiden nævner kun de udbydere, der er sat op          | P2   | S    | 60–100k      | Sonnet 5  |                   | Ikke startet |
| P2-11 | En kortere check-in                                        | P2   | M    | 250–400k     | Opus 5.5  | A-06 (faglig)     | Ikke startet |
| P2-12 | Planændringer kender deres afsender                        | P2   | M    | 300–450k     | Opus 5.5  |                   | Ikke startet |
| P2-13 | Påmindelser fylder ikke revisionssporet                    | P2   | S    | 100–180k     | Opus 5.5  | Martins valg      | Ikke startet |
| P2-14 | Demoen viser forløb med egne pas og påmindelser            | P2   | S    | 120–200k     | Sonnet 5  |                   | Ikke startet |
| P2-15 | Invitationslinks, der holder en uge                        | P2   | S    | 60–120k      | Sonnet 5  | P1-01             | Ikke startet |
| P2-16 | En forælder på holdet kobles til endnu et barn             | P2   | M    | 200–350k     | Opus 5.5  | P1-01             | Ikke startet |
| P2-17 | Trivselspåmindelsen ser en check-in, der bliver rød senere | P2   | S    | 150–250k     | Opus 5.5  | P1-02             | Ikke startet |
| P3-01 | Evaluér de parkerede dele ud fra pilotens tal              | P3   | S    | 60–120k      | Sonnet 5  | P1-04             | Ikke startet |
| P3-02 | Fremmøde på holdpas                                        | P3   | M    | 250–400k     | Opus 5.5  | pilotens ønske    | Ikke startet |
| P3-03 | Saml de gamle indgange til planlægning                     | P3   | S    | 120–200k     | Sonnet 5  | en måneds brug    | Ikke startet |
| P3-04 | Holdets uge for tidligere og kommende uger                 | P3   | M    | 250–400k     | Opus 5.5  |                   | Ikke startet |
| P3-05 | E-mail som valgfri kanal                                   | P3   | L    | 500–800k     | Opus 5.5  | Martins ja        | Ikke startet |
| P3-06 | Trænerrummet tilbage med moderation i klubberne            | P3   | L    | 600k–1M      | Opus 5.5  | P3-01, 3 klubber  | Ikke startet |
| P3-07 | Klubmesterskabet tilbage, sikkert for de unge              | P3   | M    | 300–450k     | Opus 5.5  | P3-01             | Ikke startet |
| P3-08 | Content-Security-Policy med nonce                          | P3   | L    | 500–900k     | Fable 5.1 |                   | Ikke startet |
| A-01  | En sportsdiætist læser madguiden                           | A    | S    | 60–120k      | Sonnet 5  |                   | Ikke startet |
| A-02  | Tilladelse til Rulles ruter og navne                       | A    | S    | 60–120k      | Sonnet 5  |                   | Ikke startet |
| A-03  | DCU inviteres til at følge vinteren                        | A    | S    | 40–80k       | Sonnet 5  |                   | Ikke startet |
| A-04  | Wahoo: produktionsadgang og puls under 16                  | A    | S    | 30–60k       | Haiku 4.5 |                   | Ikke startet |
| A-05  | Aftale med pilotholdet                                     | A    | S    | 80–150k      | Opus 5.5  |                   | Ikke startet |
| A-06  | Faglig vurdering af en kortere check-in                    | A    | S    | 60–100k      | Sonnet 5  |                   | Ikke startet |
| A-07  | Ja eller nej til Tredict og Connect IQ                     | A    | S    | 60–120k      | Opus 5.5  |                   | Ikke startet |
| R-01  | Slet de ubrugte filer                                      | R    | S    | 40–80k       | Haiku 4.5 | Martins ja        | Ikke startet |
| R-02  | Små rester fra fokus-bølgen                                | R    | S    | 100–180k     | Sonnet 5  |                   | Ikke startet |
| Ø-01  | Tegnefunktion og indbyggede øvelser og programmer          | Ø    | M    | 400–700k     | Opus 5.5  |                   | Færdig       |
| Ø-02  | Åben side, sammensæt og download                           | Ø    | M    | 300–500k     | Sonnet 5  | Ø-01              | Færdig       |
| Ø-03  | Holdets egne øvelser og programmer i databasen             | Ø    | M    | 300–450k     | Opus 5.5  |                   | Færdig       |
| Ø-04  | Appen: bibliotek, tegneværktøj, programbygger, kalender    | Ø    | L    | 600k–1M      | Opus 5.5  | Ø-01, Ø-03        | Færdig       |
| Ø-05  | Demo, hjælp og ADR                                         | Ø    | S    | 100–200k     | Sonnet 5  | Ø-02, Ø-04        | Færdig       |
| N-01  | Navigation efter opgaver                                   | N    | M    | 300–450k     | Opus 5.5  |                   | I gang       |

---

## P1 — før piloten

### P1-01 Inviter hele holdet på én gang

**Som** træner for et nyt hold **vil jeg** indsætte en liste med ryttere
(og eventuelt deres forældre) og få et invitationslink til hver, **så** jeg
kan få tolv ryttere i gang på ti minutter i stedet for en time.

- En liste med ét navn pr. linje, og eventuelt `; forælders navn` efter.
- Hver rytter oprettes med fødselsår (et felt pr. linje eller fælles
  årgang), og der laves et invitationslink til rytteren og forælderen.
- Resultatet er en tekst pr. person, der kan deles med ét tryk (SMS,
  chat), og en samlet oversigt over links, der stadig venter.
- Dubletter og tomme linjer afvises med en forklaring; intet halvt
  oprettet hold.

**Størrelse:** M

**Tokens:** ca. 300–450k · **Model:** Opus 5.5 (`claude-opus-5-5`), flere services i én transaktion, invitationer og roller; fejl her rammer adgangen til holdet.

**Status:** Færdig 6. oktober, flettet ind på `feat/p1-foer-piloten`. "Inviter hele holdet" på Ryttere: én rytter pr. linje med år, op til to forældre efter semikolon, forhåndsvisning og en forklaring pr. linje, der ikke kan læses; bagefter "Del" pr. person og et kort med de links, der venter. Alt eller intet: links laves først og trækkes tilbage, hvis rækkerne fejler (ADR 0064). Bemærk: et link kræver en e-mailadresse og gælder 48 timer (Better Auths standard); uden adresse oprettes personen uden link. Søskende kan dele en forælder. Faktisk forbrug: 310k tokens på 30 min (skøn 300–450k).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/inviter-holdet.
Byg "Inviter hele holdet" for trænere under Ryttere. I dag oprettes og
inviteres én rytter ad gangen (src/modules/team/actions.ts:
createRiderAction, inviteRiderAction, addGuardianAction; ADR 0004, 0010).
Lav en service i src/modules/team (fx bulk-invite.ts), der i én
transaktion opretter ryttere og guardian-rækker og laver
invitationslinks gennem de eksisterende funktioner, så RLS, audit og
roller er de samme. Input: tekst med én rytter pr. linje, valgfrit
"; forælders navn", og fødselsår (fælles eller pr. linje). Parseren er
ren og testet for sig. UI: en dialog på /riders med forhåndsvisning før
oprettelse, og bagefter en liste med "Del" (navigator.share, ellers
kopiér) pr. person og en tekst, der siger, hvad modtageren skal gøre.
Kadence sender ingen mails (ADR 0032); delingen sker fra trænerens
telefon. Tests: parseren, servicen (træner kan, rytter kan ikke, intet
oprettes ved fejl, et andet hold er urørt) og i18n. Demoen behøver ikke
vise det. Skriv en kort ADR.
```

### P1-02 Træneren får besked, når en rytter er i rød zone

**Som** træner **vil jeg** få en påmindelse samme dag, når en rytter
checker ind i rød zone eller med smerte på trin 3, **så** en samtale kan
ske, mens det betyder noget.

- Kun når træneren har slået påmindelser til (ADR 0060) og valgt den nye
  slags "Trivsel".
- Pushen bærer intet indhold; teksten hentes som træneren og siger "En
  rytter har brug for en snak" med link til holdets uge.
- Højst én om dagen pr. rytter; stille timer gælder ikke ved rød zone.
- Kun det, træneren i forvejen må se under RLS.

**Størrelse:** M · **Afhænger af:** påmindelserne på `feat/fokus-vinter`

**Tokens:** ca. 250–400k · **Model:** Opus 5.5 (`claude-opus-5-5`), migrering, trivselsdata om mindreårige og påmindelsernes logik.

**Status:** Færdig 6. oktober, flettet ind. Ny påmindelse "Trivsel" kun for trænere: en check-in i rød zone i dag (smerte 3, syg eller humør 1) giver én tom push, også om natten; teksten nævner hverken navn eller svar og fører til opmærksomhedspunkterne. Højst én pr. rytter pr. dag uden ny kolonne. Accepteret hul (i ADR 0060): en check-in, der først gemmes grøn og senere rettes til rød, kan blive overset, hvis træneren fik en anden påmindelse imellem; listen viser den stadig. Trænere, der allerede har påmindelser slået til, skal selv slå "Trivsel" til. Faktisk forbrug for P1-02 og P1-05 samlet: 307k tokens på 31 min (skøn 350–580k).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/trivsel-paamindelse.
Læs docs/adr/0060-reminders-without-content.md og src/modules/push
(due.ts, job.ts, latest.ts). Tilføj en slags "wellbeing" til
påmindelserne: en træner får én push, når en rytter på holdet har en
check-in i dag med zonen "help" (rød) eller smerte 3 (se
src/modules/load/wellbeing.ts og guardrails WELLBEING_KINDS). Det kræver
en migrering, der udvider push_subscriptions_kinds-check og
standardværdien (drizzle/0028), og PUSH_KINDS i
src/core/db/schema/push.ts. Afgørelsen sker som træneren under RLS
(withOrgContext), så kun det, træneren må se, tæller. Stille timer gælder
ikke for denne slags; højst én pr. rytter pr. dag (husk det på
abonnementet eller udled det af told_up_to). Teksten nævner ikke
rytterens navn eller svar: "En rytter har brug for en snak" og link til
/calendar#opmaerksomhed. Tests: due-logikken, job-testen med mocket
fetch, RLS (en træner på et andet hold får intet). Opdatér ADR 0060
eller skriv en kort ny.
```

### P1-03 Invitationen siger rytter eller forælder

**Som** ung rytter eller forælder, der åbner et invitationslink, **vil
jeg** kunne se, at jeg inviteres som rytter (eller forælder) på holdet X,
**så** jeg ved, at jeg er havnet det rigtige sted.

- Join-siden siger "som rytter" eller "som forælder til Emma" i stedet
  for kun holdets navn.
- Intet andet om rytteren eller holdet læses før login.

**Størrelse:** S

**Tokens:** ca. 120–200k · **Model:** Opus 5.5 (`claude-opus-5-5`), en SECURITY DEFINER-funktion, som auth-rollen kalder før login.

**Status:** Færdig 6. oktober, flettet ind på `feat/p1-foer-piloten` (PR #23). Join-siden siger "som rytter", "som forælder til Emma" eller "som træner" gennem `invitation_kind()` (migrering 0030), som kun auth-rollen må kalde, og som kun svarer for en gyldig invitation. ADR 0065. Valgt undervejs: rækker for arkiverede ryttere og allerede brugte rækker tæller ikke, så siden siger mindre frem for for meget. Faktisk forbrug for P1-03 og P1-07 samlet: 215k tokens på 18 min (skøn 170–300k).

```text
Følg rammen i docs/backlog.md §0. Gren: fix/invitation-rolle.
Join-siden (src/app/[locale]/(auth)/join/[id]/page.tsx) kan i dag kun
sige "som træner", fordi både rytter og forælder har rollen "member", og
auth-rollen ikke kan læse riders eller guardians. Lav en migrering med en
SECURITY DEFINER-funktion, fx invitation_kind(p_invitation_id text), som
kadence_auth må kalde, og som kun svarer 'rider', 'guardian' eller null
(og ved guardian rytterens fornavn, intet andet) for en invitation, der
stadig er gyldig. Følg mønstret i drizzle/0005 (device_link_owner): fast
search_path, REVOKE fra PUBLIC, GRANT til den ene rolle, og tilføj den
til CALLABLE_DEFINER_FUNCTIONS i tests/rls/tenant-isolation.test.ts med
en begrundelse. Brug den på join-siden. Tests: funktionen svarer rigtigt
for rytter, forælder, udløbet og ukendt id, og afslører intet andet.
```

### P1-04 Pilotens tre tal

**Som** Martin og som pilotholdets træner **vil jeg** se tre tal hver
uge, **så** vinteren kan afgøre, hvad Kadence skal være (dogme syv).

- Andelen af ryttere, der checker ind mindst fire dage om ugen.
- Andelen af pas med en kvittering (udført, RPE eller en tur).
- Trænerens minutter om ugen på at planlægge, anslået ud fra
  auditloggens planlægningshandlinger (sammenhængende aktivitet med
  under ti minutters pause).
- Træneren ser sit eget holds tal under Indstillinger → Holdet;
  installationens ejer ser kun tal pr. hold i installationsoversigten,
  ingen navne og intet om den enkelte rytter.

**Størrelse:** M

**Tokens:** ca. 300–450k · **Model:** Opus 5.5 (`claude-opus-5-5`), audit-loggen, udvidelse af platform_overview og privatlivsgrænsen for ejeren.

**Status:** Færdig 6. oktober, flettet ind. Træneren ser de seneste 8 uger under Indstillinger → Holdet: andel ryttere med check-in mindst 4 dage, andel pas med kvittering, og anslåede minutter på planlægning ud fra revisionssporet (strækninger med under 10 minutters pause, mindst 2 minutter hver). Ejeren ser tallene for sidste hele uge pr. klub på installationssiden, kun tal (migrering 0031, ADR 0066). Demoen har fået historik, så kortet ikke er tomt. Til Martin: læs de danske tekster, og vurder tærsklerne på 10 og 2 minutter. Faktisk forbrug: 283k tokens på 28 min (skøn 300–450k).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/pilotens-tal.
Byg "Pilotens tal" (docs/plan-fokus-vinter.md, "Efter vinteren").
1) En ren funktion i src/modules/insight (fx pilot-numbers.ts), der for
en uge regner: andelen af aktive ryttere med check-in på mindst 4 dage,
andelen af planlagte pas til og med i går med en kvittering (udført,
RPE eller en tilknyttet aktivitet), og trænerens anslåede
planlægningsminutter ud fra audit_log-rækker for planned_sessions,
training_blocks og season_plans lavet af trænere (sammenhængende
aktivitet med under 10 minutters pause; hver session tæller mindst 2
minutter). 2) Træneren ser de seneste 8 uger på
/settings/team i et lille kort. 3) Installationens ejer får tallene pr.
hold i platform_overview (drizzle/0019): udvid funktionen i en
migrering, så den kun returnerer tal, aldrig navne. Opdatér
tests/core/platform-overview.test.ts. Tests for den rene funktion med
kanter (ingen ryttere, uge i gang, arkiverede ryttere). ADR om hvad der
måles, og hvad der ikke gør.
```

### P1-05 Prøv påmindelser på en rigtig telefon

**Som** rytter **vil jeg** kunne sende mig selv en prøvepåmindelse og se,
om min telefon er sat rigtigt op, **så** jeg ved, at check-in-påmindelsen
kommer.

- "Send en prøve" under Indstillinger → Mig → Påmindelser.
- En linje om tilstanden: tilladelse, service worker, hvornår
  abonnementet blev lavet, og på iPhone om Kadence er lagt på
  hjemmeskærmen.

**Størrelse:** S · **Afhænger af:** påmindelserne

**Tokens:** ca. 100–180k · **Model:** Sonnet 5 (`claude-sonnet-5`), afgrænset brugerflade og en action med rate-limit.

**Status:** Færdig 6. oktober sammen med P1-02. "Send en prøve" under Indstillinger → Mig → Påmindelser (højst 3 i timen) og en statuslinje: tilladelse, service worker, abonnement siden hvornår, og på iPhone om Kadence er åbnet fra hjemmeskærmen. `docs/deploy.md` §6d forklarer prøven på iPhone og Android. Kan kun bekræftes på en rigtig telefon; det er næste skridt for Martin.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/proevepaamindelse.
Læs ADR 0060 og src/modules/push. Tilføj under Indstillinger → Mig →
Påmindelser en knap "Send en prøve", der gennem en server action (som
personen selv, runAction, zod, rate-limit 3 i timen) sender én push uden
indhold til personens egne abonnementer i dette hold; latest.ts svarer
da "Sådan ser en påmindelse fra Kadence ud". Vis en diagnoselinje i
browseren: Notification.permission, om /sw.js er registreret, om der er
et abonnement, og på iOS om appen kører standalone. Ingen data om andre
personer. Tests: action (kun egne abonnementer), rate-limit, latest-
svaret. Skriv i docs/deploy.md, hvordan Martin tester på en iPhone med
appen på hjemmeskærmen og på en Android.
```

### P1-06 Rulle møder en rigtig hometrainer

**Som** rytter med en smart trainer **vil jeg** kunne køre dagens pas i
Rulle uden fejl, **så** indendørsdagene tæller med.

- En diagnosevisning, Martin kan slå til med `?ble=log`, der viser hver
  FTMS-, Cycling Power- og pulsmåling og hvert svar fra trainerens
  control point med tid.
- Loggen kan kopieres og gives tilbage til Claude.
- TECH-DEBT.md får resultatet af den første rigtige tur.

**Størrelse:** S

**Tokens:** ca. 120–200k · **Model:** Sonnet 5 (`claude-sonnet-5`), logning omkring de eksisterende parsere, ingen ændring i deres logik.

**Status:** Færdig 6. oktober, flettet ind. `/rulle?ble=log` viser en log over de seneste 500 Bluetooth-hændelser med rå bytes, de tal parserne læser og trainerens svar med FTMS-navne, og "Kopiér log". Intet gemmes eller sendes. `docs/rulle-proevetur.md` er tjeklisten til den første tur på en rigtig hometrainer. Faktisk forbrug: 288k tokens på 31 min (skøn 120–200k; mere end ventet, fordi kontrolpunktets kø blev trukket ud af trainer-link.ts for at holde 300-linjersgrænsen).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/rulle-ble-log.
Rulle har aldrig mødt en rigtig hometrainer (TECH-DEBT.md). Byg en
diagnoselog til Web Bluetooth i src/components/rulle/bluetooth: når URL'en
har ?ble=log, gemmes de seneste 500 hændelser i hukommelsen (forbindelse,
services fundet, hver måling fra FTMS Indoor Bike Data, Cycling Power
Measurement og Heart Rate med rå bytes i hex og de fortolkede tal fra
src/modules/rulle/ble, hver skrivning til Fitness Machine Control Point
og trainerens svar med resultatkode) og vises i et panel med "Kopiér
log". Ingen data sendes nogen steder. Parserne må ikke ændres uden tests.
Tilføj en tjekliste i docs/ (fx docs/rulle-proevetur.md) til Martins
første tur: hvilken browser, hvilken trainer, hvad der skal ses efter
(ERG holder watt, blokskift, optagelse, FIT lander på passet). Tests for
log-bufferen.
```

### P1-07 Ryttere og forældre kan forlade holdet igen

**Som** rytter eller forælder **vil jeg** kunne forlade holdet fra mine
egne indstillinger, **så** jeg ikke skal kende en adresse for at gøre det.

- "Forlad holdet" står nederst under Indstillinger → Mig for den, der
  ikke er træner.
- Samme bekræftelse og samme service som i dag.

**Størrelse:** S

**Tokens:** ca. 50–100k · **Model:** Sonnet 5 (`claude-sonnet-5`), en komponent flyttes, guards er uændrede.

**Status:** Færdig 6. oktober, flettet ind på `feat/p1-foer-piloten`. "Forlad holdet" står nederst på Mig for alle, der ikke er trænere, med samme action og bekræftelse som før; trænere har den stadig under Arbejdsrum. Bemærkning: trænerens tekst siger stadig "Forlad arbejdsrummet … dine samtaler" (arvet fra Haij) og kan rettes i en senere oprydning.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/forlad-holdet.
Efter ADR 0061 ser ryttere og forældre ikke fanen Arbejdsrum, hvor
"Forlad holdet" står, så de kan kun nå den med adressen. Flyt eller
genbrug komponenten, så den står nederst på /settings/me for medlemmer,
der ikke er trænere, med den eksisterende action og bekræftelse.
Træneren beholder den, hvor den er. Ingen ændring i guards. Test, at
siden viser den for rytter og forælder og ikke for træneren.
```

### P1-08 En pilotguide til træneren

**Som** pilotholdets træner **vil jeg** have én side, der fører mig
gennem de første to uger, **så** holdet kommer i gang uden at Martin skal
sidde ved siden af.

- Dag 1: hold, ryttere og forældre inviteret; sæsonplaner for alle.
- Uge 1: første uge lagt ind med Planlæg; påmindelser slået til.
- Hvad træneren kan forvente af rytterne, og hvem man spørger.

**Størrelse:** S · **Afhænger af:** A-05

**Tokens:** ca. 120–200k · **Model:** Sonnet 5 (`claude-sonnet-5`), dansk tekst og skærmbilleder mod demoen.

**Status:** Færdig 6. oktober, flettet ind. `docs/pilot.md` fører træneren gennem de første to uger med otte skærmbilleder fra demoen i `docs/pilot/`, og Hjælp har fået et afsnit om guiden. Martins kontaktoplysninger står som en pladsholder, der skal udfyldes. Undervejs fandt guiden, at tabellen med holdets tre tal blev skåret af på en telefon; det er rettet. Faktisk forbrug: 285k tokens på 31 min (skøn 120–200k; mere end ventet, fordi hvert trin blev klikket igennem på en rigtig demo).

```text
Følg rammen i docs/backlog.md §0. Gren: docs/pilotguide.
Skriv docs/pilot.md på dansk til pilotholdets træner, og tilføj et
afsnit i hjælpen (help.howTo.pilot i messages) med et link til den. Brug
det, der faktisk findes på main: inviter rytterne (eller P1-01, hvis den
er landet), "Opret sæsonplaner for alle uden en plan" på /season,
Planlæg ugen med "Start fra", Del ugen, påmindelser (ADR 0060), Holdets
uge med opmærksomhedspunkterne (ADR 0062), rytterens kom-i-gang (ADR
0063). Kort, i du-form, med skærmbilleder taget med Playwright mod demoen
(DEMO=on) gemt i docs/pilot/. Ingen nye funktioner.
```

---

## P2 — i løbet af vinteren

### P2-01 Garmin-ture ind af sig selv gennem Tredict

**Som** rytter med en Garmin **vil jeg** have mine ture ind i Kadence
uden kabel og upload, **så** træneren ser dem samme dag.

- Rytteren indsætter sit eget personlige Tredict-token (BYOK), krypteret
  med secret-box.
- Kadence henter nye ture hvert 15. minut, højst 2 filer i sekundet.
- Et sovende token (401) vises som "Log ind på Tredict igen".
- Uden fuld adgang bruges turens tal fra listen, hvis Tredict bekræfter,
  at det virker.

**Størrelse:** L · **Afhænger af:** A-07

**Tokens:** ca. 600k–1M · **Model:** Opus 5.5 (`claude-opus-5-5`), ekstern integration, krypterede tokens, definer-funktion og en poller; kør med høj effort.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/tredict.
Læs docs/research/garmin-without-partner-access.md, ADR 0027, 0029 og
src/modules/devices. Martin har sagt ja (A-07) til en Tredict-forbindelse
med rytterens eget Personal API-token. Plan først: skema (en
device_links-udbyder "tredict" med forseglet token, eller en ny tabel med
org_id, rider_id, tvungen RLS gennem app_can_write_rider, audit med
tokenet redigeret væk), en SECURITY DEFINER til at liste forfaldne links
til polleren (tilføjes allow-listen i tests/rls/tenant-isolation.test.ts),
en poller i processen hvert 15. minut med højst 2 filer i sekundet (start
den fra instrumentation-node.ts som påmindelserne), 401 vist som et
sovende link, og ture gennem importFit. Ture uden fil (extendedSummary)
kun hvis Felix har bekræftet det. Tjek Tredicts vilkår igen før du
bygger. Ingen uofficiel Garmin-login i nogen form. Tests med mocket
fetch; ingen netværk i testene. ADR og en række i docs/subprocessors.md.
```

### P2-02 Mine ture: en liste over rytterens ture

**Som** 16-årig rytter **vil jeg** se mine seneste ture i en liste, **så**
jeg kan finde en tur uden at bladre i kalenderen.

- På Mig: de seneste 20 ture med dato, titel, tid, distance og farve for,
  hvor tæt de kom på planen; link til turen.
- "Vis flere" henter de næste 20.

**Størrelse:** S

**Tokens:** ca. 80–150k · **Model:** Sonnet 5 (`claude-sonnet-5`), en liste og en service under eksisterende RLS.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/mine-ture.
Tilføj sektionen "Dine ture" på /me (src/app/[locale]/(app)/(narrow)/me,
ADR 0063): de seneste 20 aktiviteter for rytteren selv, læst under RLS
gennem en service i src/modules/training eller today (genbrug
recent-rides.ts, hvis den passer), med dato, titel, varighed, distance,
compliance-farve og link til /activities/[id]. "Vis flere" henter de
næste 20 med en cursor på dato og id. Tests: servicen (kun egne ture, en
holdkammerat ser intet), cursoren og i18n.
```

### P2-03 Tid, sted og kørsel på løb og begivenheder

**Som** forælder **vil jeg** se, hvor og hvornår løbet starter, og hvem
der kører, **så** weekenden kan planlægges.

- Begivenheder får starttid, sted og en kort note om kørsel, ligesom pas
  har fået (ADR 0058).
- Vises i kalenderen, på forældresiden og i Del ugen.

**Størrelse:** M

**Tokens:** ca. 200–300k · **Model:** Sonnet 5 (`claude-sonnet-5`), enkle kolonner ført gennem formularer, visninger og eksport.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/begivenhed-tid-sted.
Læs ADR 0058 og drizzle/0026. Giv calendar_events start_time (time) og
meeting_place (text, højst 120) samt transport_note (text, højst 200) i
en migrering med check-constraints, og før dem gennem
src/modules/training/events.ts (zod), dialogen til begivenheder,
kalenderens visning, forældresiden (src/components/parents) og Del
ugen-formateringen. RLS er uændret. Tests: service-roundtrip, eksporten
(tests/export) og formateringen.
```

### P2-04 Forældre lægger familiens begivenheder ind

**Som** forælder **vil jeg** kunne lægge ferie, eksamen eller
familiebegivenheder ind for mit barn, **så** træneren planlægger uden om
dem.

- Kun for eget barn med bekræftet link, og kun slagene ferie, eksamen
  og andet.
- Træneren ser dem i kalenderen; rytteren ser dem og kan slette dem.

**Størrelse:** M · **Afhænger af:** P2-03

**Tokens:** ca. 250–400k · **Model:** Opus 5.5 (`claude-opus-5-5`), en ny skrivepolicy for værger; rytteradskillelsen skal bevises.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/familiens-begivenheder.
I dag kan kun træner og rytter skrive begivenheder
(src/modules/training/events.ts og RLS i drizzle/0003). Plan først:
udvid write-policyen på calendar_events, så en værge med bekræftet link
(app_is_guardian_of(rider_id, 'training')) må oprette og rette
begivenheder med kind i ('holiday','exam','other') for netop det barn,
og ingen holdbegivenheder (rider_id null). Rider-isolationstesten
(tests/rls/rider-isolation.test.ts) skal bevise, at en forælder ikke kan
skrive for et andet barn eller for holdet. UI på /parents: "Tilføj til
kalenderen". ADR om tillidsgrænsen.
```

### P2-05 En fælles kladde til ugeplanen for flere trænere

**Som** hjælpetræner **vil jeg** se og rette den uge, hovedtræneren er
ved at planlægge, **så** vi ikke laver den samme uge to gange.

- Kladden gemmes på serveren pr. hold og uge, ikke kun i browseren
  (ADR 0043).
- Den sidste, der gemte, står ved kladden; ingen samtidig redigering.

**Størrelse:** M

**Tokens:** ca. 250–400k · **Model:** Opus 5.5 (`claude-opus-5-5`), ny tabel med RLS og samtidig redigering.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/faelles-kladde.
Læs ADR 0043 og 0059 og src/components/week-plan/use-plan-draft.ts. Plan
først: en tabel week_plan_drafts (org_id, week_monday, payload jsonb,
updated_by, timestamps; unik pr. hold og uge) med tvungen RLS (kun
trænere læser og skriver), audit og isolationstest. Planlæggeren gemmer
kladden med debounce og viser "Sidst gemt af X kl. 14.32". Ved konflikt
vinder den seneste, med en besked til den anden. localStorage beholdes
som offline-mellemlager. ADR, der ændrer 0043.
```

### P2-06 Tilgængelighed: kontrast, bevægelse og fokus

**Som** bruger med nedsat syn eller med reduceret bevægelse slået til
**vil jeg** kunne se felternes kanter og slippe for animationer, **så**
Kadence kan bruges af alle.

- Inputfelters kant mindst 3:1 mod kortet.
- Zone 1 og 4 kan skelnes, også uden farve.
- `prefers-reduced-motion` slår animate-in på dialoger og ark og
  forsidens pulserende prik fra.
- Alle links har synlig fokus.

**Størrelse:** S

**Tokens:** ca. 120–200k · **Model:** Sonnet 5 (`claude-sonnet-5`), tokens, klasser og en kontrasttest.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/tilgaengelighed.
Rettelser fra designgennemgangen den 5. oktober: --input mod --card har
kontrast 1,45 (skal være mindst 3:1 for ikke-tekst, WCAG 1.4.11); ret
tokenet i src/app/theme.css i lys og mørk og tjek med en lille test, der
regner kontrasten ud fra oklch-værdierne. Zone 1 og 4 har 1,84 mod
kortet: giv zonerne et mønster eller tal i visningerne, hvor de kun er
farve. Tilføj motion-reduce:animate-none til dialog, sheet og forsidens
animate-pulse. Find links med className og uden fokusstil (grep efter
<Link med className uden focus-ring) og giv dem .focus-ring. Ingen
ændring af layout.
```

### P2-07 Medlemmer kan ikke læse hinandens e-mailadresser

**Som** forælder til en mindreårig **vil jeg** være sikker på, at andre
medlemmer ikke kan læse min eller mit barns e-mailadresse i databasen,
**så** adskillelsen også gælder der.

- Holdets medlemmer kan læse navne, ikke adresser.
- Træneren kan stadig se adresser, hvor det er nødvendigt.

**Størrelse:** M

**Tokens:** ca. 400–700k · **Model:** Fable 5.1 (`claude-fable-5-1`), mindreåriges adresser, RLS på familiens grundtabel og mange kaldesteder; den sværeste sikkerhedsopgave i backloggen.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/adresser-i-users.
TECH-DEBT.md, "Members can read each other's addresses in the database":
policyen app_select_org_members (drizzle/0001) lader ethvert medlem læse
navn og e-mail på hele holdet. Plan først: enten et view med kun id og
navn til kommentarforfattere osv., eller kolonne-privilegier på users
for kadence_app kombineret med en SECURITY DEFINER til trænerens
adresseliste. Find alle steder, appen læser users (grep users.email),
og flyt dem til den nye vej. Tests i tests/rls: en rytter og en forælder
kan ikke læse en andens adresse; træneren kan, hvor det er meningen.
Flyt punktet i TECH-DEBT.md til Paid. Familiens kode: skriv i PR'en, at
søskendeprojekterne har samme gæld.
```

### P2-08 Rate-limiteren stoler kun på egne proxyer

**Som** driftsansvarlig **vil jeg** have, at en installation uden proxy
ikke tror på en X-Forwarded-For, som kalderen selv har sendt, **så**
rate-limiten på upload-nøglen virker.

**Størrelse:** S

**Tokens:** ca. 60–120k · **Model:** Sonnet 5 (`claude-sonnet-5`), én fil med klare tests.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/rate-limit-hops.
TECH-DEBT.md, "The limiter trusts a forwarded address when nothing is in
front": i src/core/rate-limit.ts behandles TRUSTED_PROXY_HOPS=0 som 1.
Ved 0 skal ingen forwarded-header læses (brug forbindelsens adresse,
hvis Next giver den, ellers en fast nøgle), og en indgang bruges kun,
hvis den parser som en IP-adresse. Tests i tests/core/rate-limit.test.ts
for 0, 1 og 2 hops og for skrald i headeren. Flyt punktet til Paid.
```

### P2-09 Parkerede sider svarer 404

**Som** driftsansvarlig **vil jeg** have, at en side bag et slukket flag
svarer HTTP 404 og ikke 200 med en not-found-side, **så** søgemaskiner og
overvågning ser det rigtige.

**Størrelse:** S

**Tokens:** ca. 100–200k · **Model:** Sonnet 5 (`claude-sonnet-5`), kræver læsning af Nexts streaming og notFound, men er lille.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/parkerede-404.
Under src/app/[locale]/(app)/(narrow) starter loading.tsx streamen, før
notFound() i en side bliver kaldt, så /coaches og /club svarer 200 med en
not-found-side, når flaget er slået fra (ADR 0057). Læs Nexts
dokumentation i node_modules/next/dist/docs om notFound og streaming.
Løs det i src/proxy.ts (svar 404 for de parkerede stier ud fra
src/core/features.ts) eller med et layout-segment pr. parkeret rute, der
kalder notFound før loading-grænsen. Test med en request mod den
byggede app eller en enhedstest af proxyens beslutning.
```

### P2-10 Enhedssiden nævner kun de udbydere, der er sat op

**Som** rytter **vil jeg** kun læse om de udbydere, jeg kan forbinde,
**så** siden ikke taler om amerikanske firmaer, når kun Polar er sat op.

**Størrelse:** S

**Tokens:** ca. 60–100k · **Model:** Sonnet 5 (`claude-sonnet-5`), tekstvalg ud fra en eksisterende funktion.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/enheder-tekst.
På /settings/devices vises kortet "Wahoo og Garmin er amerikanske
firmaer, Polar er finsk", når blot én udbyder er sat op, og en
forbundet Garmin-rytter læser stadig, at pas kan sendes til Garmin
(canPush-noten). Byg teksten ud fra configuredProviders()
(src/modules/devices/providers.ts), så kun de konfigurerede nævnes, og
vis kun canPush-noten, når udbyderen faktisk kan modtage pas på denne
installation. Tests for tekstvalget.
```

### P2-11 En kortere check-in

**Som** rytter **vil jeg** kunne checke ind på 20 sekunder, **så** jeg
bliver ved hele vinteren.

- Tre spørgsmål som standard: søvn, overskud og smerte.
- Resten (humør, ømhed, stress, note) under "Mere".
- Trivselszonerne skal stadig give samme svar, når kun de tre er
  udfyldt, eller også siger zonen tydeligt, at den bygger på færre svar.

**Størrelse:** M · **Afhænger af:** A-06

**Tokens:** ca. 250–400k · **Model:** Opus 5.5 (`claude-opus-5-5`), trivselszonerne er sikkerhedsrådgivning; planen skal holde fagligt.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/kort-checkin.
Læs ADR 0021 og src/modules/load/wellbeing.ts (zonerne efter Kolding
Talents model) og src/components/wellbeing. Plan først, og vis Martin,
hvordan zonen regnes, når kun søvn, energi og smerte er udfyldt. A-06
skal have givet en faglig vurdering. Byg check-in-formularen med tre
felter først og resten bag "Mere", gem det sidste valg pr. rytter, og
lad schemaet tillade de andre felter tomme, hvis zonen kan regnes
forsvarligt. Ellers stop og beskriv hvorfor. Tests for zone-logikken med
tre og alle svar.
```

---

### P2-12 Planændringer kender deres afsender

**Som** rytter **vil jeg** få at vide, når træneren ændrer eller sletter et
af mine kommende pas, **så** jeg ikke møder op til noget, der er aflyst.

- Et pas husker, hvem der sidst ændrede det.
- Påmindelsen "Planen er ændret" kommer kun for andres ændringer, også
  når et pas er slettet.

**Størrelse:** M

**Tokens:** ca. 300–450k · **Model:** Opus 5.5 (`claude-opus-5-5`), ny kolonne eller trigger, en tombstone-tabel med RLS og påmindelsernes logik.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/plan-afsender.
Læs docs/adr/0060-reminders-without-content.md (afsnittet om "by someone
else") og src/modules/push/facts.ts. I dag ved påmindelsen kun, hvem der
lagde et pas, ikke hvem der sidst ændrede det, og et slettet pas giver
ingen besked. Plan først: en kolonne updated_by på planned_sessions sat
af services i src/modules/training (eller en trigger, der læser
app.user_id), og en lille tabel eller tombstone for slettede pas i de
næste 7 dage, så rytteren kan få besked (org_id, rider_id, tvungen RLS
gennem app_can_read_rider, audit, isolationstest). Opdatér facts.ts og
due.ts og testene i tests/push. Opdatér ADR 0060.
```

### P2-13 Påmindelser fylder ikke revisionssporet

**Som** træner, der læser revisionssporet, **vil jeg** se ændringer i
træningen og ikke en række for hver påmindelse, **så** sporet kan læses.

**Størrelse:** S · **Afhænger af:** Martins valg af løsning

**Tokens:** ca. 100–180k · **Model:** Opus 5.5 (`claude-opus-5-5`), ændrer audit-triggere, som dogme seks hviler på.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/audit-paamindelser.
Hver påmindelse opdaterer told_up_to, checkin_reminded_on eller
week_told_on på push_subscriptions og skriver dermed en række i
audit_log (drizzle/0028). Plan først og lad Martin vælge: (a) en
audit-trigger på tabellen, der springer en UPDATE over, når kun de tre
kolonner og updated_at ændres, eller (b) flyt de tre kolonner til en
tabel uden audit, med begrundelse i ADR'en, da det er tekniske tidsstempler
og ingen persondata. Tests i tests/push/isolation.test.ts: tilmelding og
afmelding auditeres stadig, en påmindelse gør ikke.
```

### P2-14 Demoen viser forløb med egne pas og påmindelser

**Som** Martin, der viser Kadence frem, **vil jeg** se et forløb med pas
bygget i planlæggeren og et kort om påmindelser i demoen, **så** alle dele
af produktet kan ses.

**Størrelse:** S

**Tokens:** ca. 120–200k · **Model:** Sonnet 5 (`claude-sonnet-5`), opdeling af demo-seed og en test.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/demo-forloeb.
src/modules/demo/seed.ts er tæt på 300 linjer. Del den (fx
seed-weeks.ts til ugerne og forløbet), og lad demoens forløb "Vinterblok,
4 uger" indeholde mindst ét pas bygget i forløbet selv med tid og sted
(ADR 0059, drizzle/0027). Vis i demoen, at påmindelser findes: når
installationen har PUSH-nøgler, står kortet under Indstillinger → Mig; når
den ikke har, skriver demobanneret intet om det. Giv demoen check-ins for
flere end 14 dage, så pilotens tal (P1-04) har mere end to uger at vise.
Udvid tests/demo/demo.test.ts.
```

### P2-15 Invitationslinks, der holder en uge

**Som** træner, der sender links ud over en weekend, **vil jeg** have, at et
invitationslink holder en uge, **så** jeg ikke skal lave nye links, fordi en
rytter først åbner sit på tredjedagen.

- Links gælder 7 dage i stedet for Better Auths standard på 48 timer.
- Teksten i "Del" og på kortet med links, der venter, siger den rigtige dato.

**Størrelse:** S · **Afhænger af:** P1-01

**Tokens:** ca. 60–120k · **Model:** Sonnet 5 (`claude-sonnet-5`), én indstilling og teksterne omkring den.

**Status:** Ikke startet. Fundet under P1-01 (6. oktober).

```text
Følg rammen i docs/backlog.md §0. Gren: fix/links-en-uge.
Læs ADR 0004 og 0064 og src/core/auth/auth.ts. Sæt Better Auths
organization-plugin til at lade invitationer gælde 7 dage
(invitationExpiresIn), som en navngiven konstant ved siden af
TEAM_INVITATION_LIMIT. Tjek, at "Del"-teksten fra "Inviter hele holdet",
kortet "Links, der venter" og invitationerne under Arbejdsrum viser den
rigtige udløbsdato. Tests: en ny invitation udløber om 7 dage. Ret ADR
0064's afsnit om de 48 timer.
```

### P2-16 En forælder på holdet kobles til endnu et barn

**Som** forælder med to børn på holdet **vil jeg** kunne kobles til det
andet barn uden en ny konto, **så** jeg ser begge børns uger samme sted.

- En træner kan koble et eksisterende medlem som forælder til en rytter.
- Rytteren bekræfter stadig forbindelsen, som i dag (ADR 0010).

**Størrelse:** M · **Afhænger af:** P1-01

**Tokens:** ca. 200–350k · **Model:** Opus 5.5 (`claude-opus-5-5`), forældrelinks går gennem rytteradskillelsen og RLS.

**Status:** Ikke startet. Fundet under P1-01: en forælder, der allerede er medlem, må i dag skrives uden adresse og får ingen konto koblet på.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/foraelder-til-flere.
Læs ADR 0010, 0011 og 0064 og src/modules/team/guardians.ts. Plan
først: lad en træner vælge et eksisterende medlem af holdet som forælder
til en rytter (en guardian-række med user_id sat og bekræftelse fra
rytteren som i dag), både fra rytterens side og i "Inviter hele holdet",
hvor en adresse, der allerede er medlem, så kobles i stedet for at blive
afvist. Rider-isolationstesten skal bevise, at forælderen kun ser det
barn, der har bekræftet. Opdatér ADR 0064.
```

### P2-17 Trivselspåmindelsen ser en check-in, der bliver rød senere

**Som** træner **vil jeg** også få besked, når en rytter retter sin
check-in til rød zone senere på dagen, **så** ingen falder ud mellem to
påmindelser.

**Størrelse:** S · **Afhænger af:** P1-02

**Tokens:** ca. 150–250k · **Model:** Opus 5.5 (`claude-opus-5-5`), en migrering på trivselsdata og påmindelsernes logik.

**Status:** Ikke startet. Det accepterede hul fra P1-02 (ADR 0060).

```text
Følg rammen i docs/backlog.md §0. Gren: fix/trivsel-roed-senere.
Læs ADR 0060 (afsnittet om trivsel) og src/modules/push/wellbeing.ts.
Tilføj en kolonne på checkins, fx red_since (timestamptz, null), som
service-laget sætter, når en check-in første gang bliver rød, og
nulstiller, hvis den rettes væk fra rød. Lad trivselspåmindelsen tælle
fra red_since i stedet for created_at. RLS er uændret (kolonnen følger
rækken). Tests i tests/push/job-wellbeing.test.ts for en check-in, der
gemmes grøn og senere rettes til rød, med en anden påmindelse imellem.
Opdatér ADR 0060.
```

## P3 — efter vinteren

### P3-01 Evaluér de parkerede dele ud fra pilotens tal

**Som** Martin **vil jeg** have en kort rapport, der lægger pilotens tal
ved siden af de parkerede dele, **så** beslutningen om, hvad der kommer
tilbage, bygger på vinteren.

**Størrelse:** S · **Afhænger af:** P1-04 og en vinter

**Tokens:** ca. 60–120k · **Model:** Sonnet 5 (`claude-sonnet-5`), en rapport ud fra tal og noter.

```text
Følg rammen i docs/backlog.md §0. Gren: docs/evaluering-vinter.
Skriv docs/research/vinter-2026-27.md: pilotens tre tal uge for uge
(fra P1-04), hvad trænere og ryttere har sagt (Martin giver noterne),
og for hver parkeret del i ADR 0057 (Rulles verden, Trænerrummet,
klubmester, energiberegneren, madguiden) en anbefaling: slå til, vent
eller fjern, med begrundelse. Ingen kodeændringer; foreslå de
backlog-punkter, der følger.
```

### P3-02 Fremmøde på holdpas

**Som** træner **vil jeg** sætte flueben ved, hvem der kom til
fællestræningen, **så** pas uden fil også tæller som kørt.

**Størrelse:** M · **Afhænger af:** pilotens ønske

**Tokens:** ca. 250–400k · **Model:** Opus 5.5 (`claude-opus-5-5`), skrivning på rytterens pas med RLS og samspil med load.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/fremmoede.
Kun hvis piloten har bedt om det. Plan først: et holdpas har group_key
(planned_sessions). Lad træneren markere fremmøde pr. rytter på et
holdpas (en ny kolonne attended_at på planned_sessions eller en tabel med
org_id og rider_id, tvungen RLS gennem app_can_write_rider for træneren),
og lad markeringen tælle som udført med passets minutter og en RPE, som
rytteren kan rette. UI på holdpasset i kalenderen. Tests, RLS og ADR.
```

### P3-03 Saml de gamle indgange til planlægning

**Som** træner **vil jeg** have én vej til at lægge en uge ind, **så**
der er færre ord og knapper at lære.

**Størrelse:** S · **Afhænger af:** en måneds brug af Planlæg (ADR 0059)

**Tokens:** ca. 120–200k · **Model:** Sonnet 5 (`claude-sonnet-5`), omdirigering af knapper til planlæggeren.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/en-vej-at-planlaegge.
Læs ADR 0059. Når Planlæg ugen har kørt en måned: lad "Kopiér ugen før"
i kalenderen og "Læg ind" på et forløb i biblioteket åbne planlæggeren
med det rigtige "Start fra" valgt i stedet for deres egne dialoger.
Behold "Tilføj pas" til enkeltpas og "Planlæg" på en skabelon. Slet
ingen filer uden Martins ja; list dem, der bliver ubrugte. Opdatér
hjælpen (help.howTo.calendar).
```

### P3-04 Holdets uge for tidligere og kommende uger

**Som** træner **vil jeg** se opmærksomhedspunkterne for en tidligere
eller kommende uge, **så** jeg kan forberede næste uge med det samme
overblik.

**Størrelse:** M

**Tokens:** ca. 250–400k · **Model:** Opus 5.5 (`claude-opus-5-5`), guardrail-logikken udvides til andre uger.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/holdets-uge-alle-uger.
I dag gælder punkterne kun den igangværende uge (ADR 0026, 0062).
Plan først: hvilke slags giver mening for en kommende uge (timer mod
rammen, rampen, styrke for tæt, mellemzonen ud fra planen) og for en
tidligere uge (alt undtagen afklaret). Udvid getInsights med en uge-
parameter for træningsslagene; trivselsslagene forbliver dagens. Vis
mærkerne i gitteret og på telefonens kort for den valgte uge. Tests.
```

### P3-05 E-mail som valgfri kanal

**Som** forælder **vil jeg** kunne nulstille min adgangskode selv og få
ugens overblik på mail, **så** jeg ikke skal bede træneren om et link.

**Størrelse:** L · **Afhænger af:** Martins ja til afhængighed og
udbyder

**Tokens:** ca. 500–800k · **Model:** Opus 5.5 (`claude-opus-5-5`), ny afhængighed, selvbetjent nulstilling af adgangskode og en ny kanal.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/e-mail.
Kun efter Martins ja til en SMTP-afhængighed (fx nodemailer) og en
EU-udbyder. Plan først: SMTP_* i env.ts og docker-compose.yml, en
mailer i src/core (uden indhold om rytterens helbred), selvbetjent
nulstilling af adgangskode, der supplerer trænerens link (ADR 0032), og
forældrenes ugeoverblik som valg ved siden af push (ADR 0060). Række i
docs/subprocessors.md, ADR, tests med en fake transport.
```

### P3-06 Trænerrummet tilbage med moderation i klubberne

**Som** træner i en af flere klubber **vil jeg** kunne dele råd og pas
med andre trænere, **så** vi lærer af hinanden, med moderation, der ikke
kun hviler på installationens ejer.

**Størrelse:** L · **Afhænger af:** P3-01 og mindst tre aktive klubber

**Tokens:** ca. 600k–1M · **Model:** Opus 5.5 (`claude-opus-5-5`), moderation på tværs af hold, RLS og indhold fra trænere om mindreårige.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/traenerrummet-moderation.
Kun hvis P3-01 anbefaler det. Læs ADR 0052, 0054 og 0057. Plan først:
lad hver klubs admins moderere deres egne trænere, en rapport-kø med
tidsfrist, og en tydelig regel om ingen rytternavne (en kontrol, der
advarer ved navne fra holdets rytterliste, før indlægget sendes). Slå
COACHES_ROOM til i demoen igen. Tests, RLS og ADR.
```

### P3-07 Klubmesterskabet tilbage, sikkert for de unge

**Som** klubtræner **vil jeg** kunne bruge klubmesterskabet, **så**
klubbens tradition bor samme sted som træningen, uden ranglister for de
yngste.

**Størrelse:** M · **Afhænger af:** P3-01

**Tokens:** ca. 300–450k · **Model:** Opus 5.5 (`claude-opus-5-5`), RLS-ændringer og aldersregler for placeringer.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/klubmester-unge.
Kun hvis P3-01 anbefaler det. Læs ADR 0013, 0051 og 0057. Plan først: vis
placeringer kun for U19 og op, og for U17 kun "kørt" og egen fremgang;
læsning af entries for holdkammerater og forældre kun når rytteren har
delt det. Opdatér RLS i en migrering og tests i tests/club og
tests/rls. Slå CLUB_CHAMPIONSHIP til i demoen igen.
```

### P3-08 Content-Security-Policy med nonce

**Som** driftsansvarlig **vil jeg** have en CSP uden `'unsafe-inline'` for
scripts, **så** et indsprøjtet script ikke kan køre.

**Størrelse:** L

**Tokens:** ca. 500–900k · **Model:** Fable 5.1 (`claude-fable-5-1`), Nexts bootstrap, next-intl og next-themes skal spille sammen med en nonce; dybt framework-arbejde.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/csp-nonce.
TECH-DEBT.md, "The content policy still allows inline scripts". Plan
først: en nonce pr. request sat på request-headerne i src/proxy.ts og
sammensat med next-intls middleware, next-themes' script med nonce, og
konsekvensen at siderne renderes dynamisk. Mål build- og svartider før
og efter. Tests i tests/meta/security-headers.test.ts. ADR med
afvejningen.
```

---

## Ø — øvelser og programmer

Martin bad den 6. oktober om at kunne sammensætte et træningsprogram og
hente det med instrukser og tegninger, bygget dynamisk, så flere øvelser og
programmer kan komme til. Planen er godkendt og står i
`docs/plan-ovelser-og-programmer.md`; sporene bygges på
`feat/ovelser-og-programmer`.

### Ø-01 Tegnefunktion og indbyggede øvelser og programmer

**Som** rytter **vil jeg** se, hvordan en øvelse udføres, på en tydelig
tegning med instruks, **så** jeg laver den rigtigt uden en træner ved siden
af.

**Tokens:** ca. 400–700k · **Model:** Opus 5.5 (`claude-opus-5-5`), tegninger, der skal være rigtige, og råd til unge med kilder.

**Status:** Færdig 6. oktober, flettet ind. Én tegnefunktion med to tynde lag (SVG-tekst til download og en React-komponent) i Kadences farver: figuren i forgrundsfarven, pil og dosis i `--warning` (6,0:1 lys, 7,9:1 mørk), gulvet bevidst stille. 23 indbyggede øvelser (mobilitet, core, ben, overkrop) og 4 programmer: mobilitetsdag (morgen/middag/aften), efter turen, core uden udstyr og styrke uden maskiner, med kilder fra DCU og Team Danmark først, derefter ACSM, NSCA, Lloyd og McGill. Hver tegning er tjekket visuelt i lys og mørk tilstand. Øvelseskortet med Færdig-knap og programvisningen med faner er fælles for den åbne side og appen. Faktisk forbrug: 404k tokens på 38 min (skøn 400–700k).

### Ø-02 Åben side, sammensæt og download

**Som** rytter eller forælder **vil jeg** vælge eller sammensætte et
program uden login og hente det til telefonen, **så** det kan bruges uden
net.

**Tokens:** ca. 300–500k · **Model:** Sonnet 5 (`claude-sonnet-5`), en side og en filbygger på det, Ø-01 har lagt.

**Status:** Færdig 6. oktober, flettet ind. Åben side `/guides/programs` i "Viden og beregnere": Kadences fire programmer og "Sammensæt dit eget" med filtre, dosis pr. øvelse og rækkefølge; valget ligger kun i adressen. `GET /api/programs/download` giver én HTML-fil, der virker uden net på telefonen, følger lys og mørk tilstand og husker Færdig-markeringer; holdets programmer kræver login og svarer 404 for andre. PDF via browserens print med alle dele og to kort pr. række. Undervejs rettet: programvisningen kunne ikke vise alle dele ved print. Faktisk forbrug: 425k tokens på 52 min (skøn 300–500k).

### Ø-03 Holdets egne øvelser og programmer i databasen

**Som** træner **vil jeg** kunne gemme holdets egne øvelser og programmer,
**så** holdet har dem samme sted som resten af træningen.

**Tokens:** ca. 300–450k · **Model:** Opus 5.5 (`claude-opus-5-5`), nye tabeller med RLS, audit og eksport.

**Status:** Færdig 6. oktober, flettet ind på `feat/ovelser-og-programmer` (PR #25). Migrering 0032 med `team_exercises` og `team_programs`: tvungen RLS, hvor kun holdets medlemmer læser og kun trænere skriver, audit, isolationstest og eksport ("Øvelser" og "Øvelsesprogrammer"). Der slettes ikke; en øvelse arkiveres, fordi programmer peger på den i JSON uden fremmednøgle, og arkiverede øvelser virker stadig i de programmer, der har dem. Faktisk forbrug: 234k tokens på 18 min (skøn 300–450k).

### Ø-04 Appen: bibliotek, tegneværktøj, programbygger, kalender

**Som** træner **vil jeg** tegne en ny øvelse, bygge et program og lægge
det i rytternes kalender, **så** mobilitet og styrke bliver en del af
planen.

**Tokens:** ca. 600k–1M · **Model:** Opus 5.5 (`claude-opus-5-5`), tegneværktøj, kalenderen og rettigheder.

**Status:** Færdig 6. oktober, flettet ind. Biblioteket har fanen "Øvelser og programmer" med Kadences og holdets egne; programsiden har Hent, Udskriv og for trænere Læg i kalenderen, Ret, Kopiér og tilpas og Arkivér. Tegneværktøjet: seks grundstillinger, træk led med finger eller mus, flyt med piletaster, pile, rekvisitter, spejl og fortryd, altid inden for rammen. Programbyggeren blander begge slags øvelser. Et program lagt i kalenderen bliver et styrkepas, hvis øvelser viser tegning og instruks. Bemærk: et rent mobilitetsprogram tæller som styrke i belastning og opmærksomhedspunkter, og minutterne er anslået (4 sek pr. gentagelse, 30 sek pause mellem sæt). Faktisk forbrug: 525k tokens på 51 min (skøn 600k–1M).

### Ø-05 Demo, hjælp og ADR

**Tokens:** ca. 100–200k · **Model:** Sonnet 5 (`claude-sonnet-5`).

**Status:** Færdig 7. oktober, flettet ind. Demoen har holdets egen øvelse "Rygstræk på bænk" med egen tegning, programmet "Holdets mobilitet efter fællestræning", der blander Kadences og holdets øvelser, og det program lagt i alle demorytteres kalender i dag, så Emma ser passet med tegninger. Hjælp har et afsnit om øvelser og programmer, pilotguiden og README nævner dem, og ADR 0067 samler beslutningerne. Undervejs rettet: en test fra P1-04, der af og til fejlede efter rækkefølgen af testfilerne. Faktisk forbrug: 311k tokens på 32 min (skøn 100–200k; mere end ventet, fordi demoen blev klikket igennem som træner og rytter).

## N — navigation

### N-01 Navigation efter opgaver

**Som** træner, rytter eller forælder **vil jeg** finde det, jeg skal bruge,
uden at lede i en lang flad liste, **så** Kadence føles enkel fra første dag.

- Samme struktur for alle roller med små grupper og ikoner: I dag, så
  Planlægning eller Træning, Holdet, Værktøjer og Viden; punkterne følger
  rollen.
- "Viden og beregnere" er tilbage i menuen sammen med Trænerguide,
  Forældreguide og Hjælp.
- Bundbjælken: træner I dag · Kalender · Ryttere · Bibliotek · Mere;
  rytter I dag · Kalender · Bibliotek · Mig · Mere; forælder Barnet ·
  Kalender · Viden · Mere.
- Holdskifteren sidder i holdnavnet øverst og hedder "Skift hold".
- Indstillinger er grupperet i Dig, Holdet og Installationen.
- De åbne sider viser "Tilbage til Kadence" for den, der er logget ind.
- Ingen adresser ændres.

**Tokens:** ca. 300–450k · **Model:** Opus 5.5 (`claude-opus-5-5`), struktur og design på tværs af alle roller.

**Status:** I gang siden 7. oktober. Godkendt af Martin samme dag ("merge først og derefter lave rettelserne").

## A — afklaringer uden kode

### A-01 En sportsdiætist læser madguiden

**Som** Martin **vil jeg** have en sportsdiætist til at læse madguidens
afsnit om lav energitilgængelighed, **så** `GUIDE_FOOD` kan slås til med
god samvittighed.

**Tokens:** ca. 60–120k · **Model:** Sonnet 5 (`claude-sonnet-5`), læsesæt og et dansk følgebrev.

```text
Læs src/modules/guides/guides.ts (FOOD_GUIDE), messages/da.json under
guides.food og docs/research/ernaering.md. Lav et læsesæt til en
sportsdiætist som docs/review/madguide-til-diaetist.md: hver tekst, som
forældre og ryttere ser den, med kilderne under og et felt til
bemærkninger. Skriv et kort følgebrev på dansk som udkast i Martins
Gmail (aldrig send; brug htmlBody og del adresser i spans, se memory om
Gmail-udkast). Ingen kodeændringer.
```

### A-02 Tilladelse til Rulles ruter og navne

**Som** Martin **vil jeg** have skriftlig tilladelse fra de klubber, hvis
ruter Rulle bruger, **så** `RULLE_WORLD` kan slås til uden tvivl.

**Tokens:** ca. 60–120k · **Model:** Sonnet 5 (`claude-sonnet-5`), udkast til klubberne og en ADR-tilføjelse.

```text
Find i messages/da.json under rulle.credits og i public/rulle, hvilke
ruter der kommer fra hvem (Vejle CK, Odder CK, DCU Distrikt Sjælland og
VM-ruten i Montréal). Skriv et kort udkast pr. klub i Martins Gmail, der
beskriver brugen og beder om skriftligt ja (aldrig send; htmlBody,
adresser delt i spans). Foreslå i docs/adr/0057 et neutralt navn til
VM-ruten, hvis UCI's navn bør undgås, og skriv OpenStreetMaps
ODbL-kreditering ind, hvor landet vises.
```

### A-03 DCU inviteres til at følge vinteren

**Tokens:** ca. 40–80k · **Model:** Sonnet 5 (`claude-sonnet-5`), et kort dansk udkast med den rigtige tone.

```text
Læs memory om DCU-kontakter og docs/plan-fokus-vinter.md. Tjek navne og
titler på cyklingdanmark.dk/om-dcu/administrationen. Skriv et udkast i
Martins Gmail til elitechefen med cc til udviklingskonsulenten for børn
og unge: en invitation til at følge pilotens vinter, de tre tal, der
måles, og spørgsmålet om DCU_RESULTS. Aldrig send.
```

### A-04 Wahoo: produktionsadgang og puls under 16

**Tokens:** ca. 30–60k · **Model:** Haiku 4.5 (`claude-haiku-4-5`), et kort, faktuelt udkast på engelsk.

```text
Læs docs/devices-setup.md og TECH-DEBT.md (Wahoo). Skriv et udkast i
Martins Gmail til Wahoos developer-support: ansøgning om
produktionsadgang til Cloud API for Kadence og spørgsmålet, om puls
sendes videre for ryttere under 16. Aldrig send.
```

### A-05 Aftale med pilotholdet

**Tokens:** ca. 80–150k · **Model:** Opus 5.5 (`claude-opus-5-5`), aftale og databehandleraftale kræver juridisk omhu.

```text
Skriv docs/pilot-aftale.md: hvad pilotholdet får (gratis drift vinteren
2026–27, Martins firma som databehandler), hvad Kadence beder om
(ugentlige tal, en samtale hver fjerde uge), og hvordan holdet kan
forlade Kadence med sine data (dogme tre). Lav en
databehandleraftale-skabelon som udkast, så Martin kan få den læst.
Ingen kode.
```

### A-06 Faglig vurdering af en kortere check-in

**Tokens:** ca. 60–100k · **Model:** Sonnet 5 (`claude-sonnet-5`), en side til en fagperson.

```text
Læs src/modules/load/wellbeing.ts, ADR 0021 og
docs/research/foraeldre-og-talentudvikling.md. Skriv en side til en
fagperson (fx fra Team Danmarks eller Kolding Talents miljø), der viser
den nuværende check-in, forslaget i P2-11 og spørgsmålet: kan zonerne
regnes forsvarligt på søvn, overskud og smerte alene? Udkast i Martins
Gmail; aldrig send.
```

### A-07 Ja eller nej til Tredict og Connect IQ

**Tokens:** ca. 60–120k · **Model:** Opus 5.5 (`claude-opus-5-5`), en afvejning af pris, risiko og vilkår, hvor anbefalingen betyder noget.

```text
Læs memory om Garmin-research og
docs/research/garmin-without-partner-access.md. Skriv på én side, hvad
Martin skal tage stilling til: Tredict med rytterens eget token (pris,
hvem betaler fuld adgang, hvad der sker med et sovende token) og
Connect IQ-appen (developer-konto i hans navn, SDK, en Edge 530 eller
nyere, licens). Anbefal én vej til vinteren. Ingen kode.
```

---

## R — oprydning

### R-01 Slet de ubrugte filer

**Tokens:** ca. 40–80k · **Model:** Haiku 4.5 (`claude-haiku-4-5`), grep og sletning efter en godkendt liste.

```text
Følg rammen i docs/backlog.md §0. Gren: chore/ubrugte-filer.
Kun efter Martins ja til listen. Bekræft med grep, at disse ikke
importeres nogen steder, og slet dem: src/components/ui/add-affordance,
alert, avatar, chip-input (og --radius-xs, som kun den bruger),
detail-surfaces, linked-row, property-row, select;
src/components/today/attention-section.tsx; route-gruppen (wide) med sit
layout, hvis den stadig er uden sider; src/components/assist/week-draft-
dialog.tsx med acceptDraftSessionsAction i src/modules/assist/actions.ts
og ruten /api/ai/week-draft, som kun dialogen brugte (ADR 0059 lod
planlæggeren overtage); loadRiderWeek i week-plan-load.ts, hvis kun
testene bruger den. Kør hele suiten og build.
```

### R-02 Små rester fra fokus-bølgen

**Tokens:** ca. 100–180k · **Model:** Sonnet 5 (`claude-sonnet-5`), fire små, uafhængige rettelser.

```text
Følg rammen i docs/backlog.md §0. Gren: chore/rester.
1) Giv --dialog-shadow en navngiven utility som shadow-surface og brug
den. 2) Tilføj de rene tests i tests/insight, tests/calendar og
tests/today til vitest.unit.config.mts. 3) Ret kommentaren i
src/modules/assist/coach-brief.ts, der stadig siger
"Mandagsoverblikket". 4) Trænerens knap under Arbejdsrum siger stadig "Forlad arbejdsrummet …
dine samtaler" (arvet fra Haij); sig "Forlad holdet" som på Mig. 5) Gør
tests/rulle/side-roads.test.ts robust over for en travl maskine (den
rammer 5 sekunders timeout i pnpm test:unit under belastning). 6) Når en træner fjerner et medlem, bliver
medlemmets rækker i push_subscriptions liggende uden at blive brugt;
fjern dem i samme transaktion (en SECURITY DEFINER eller en trigger på
memberships), med en test.
```

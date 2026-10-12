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

- **12. okt., aften.** Pas, programmer og uger til Motionist og Supermotionist er bygget på `feat/motionist-pas-og-uger` (ADR 0092, migrering 0055) på Martins ønske om, at der skal ligge programmer og ugeplanlægning til voksne: 12 pas, to styrkeprogrammer og fire færdige uger pr. profil fra kilderne i docs/research/motionist-pas-og-programmer.md, hentet med "Hent motionistpas" som `source = 'kadence'` og kun tilbudt, hvor der er en voksen; Rulle, gruppens AI-uge, ugeplanlæggerens knapper, "Byg med AI", gentagne styrkepas og "Opret sæsonplaner for alle" læser nu profilen. Et tegnet program "Motionist styrke hjemme" med en ny øvelse, squathop. Intet ændret for U17–U23; en test holder de unges prompts og Rulle-valg byte for byte som før.
- **12. okt., nat.** Motionist og Supermotionist er bygget på `feat/motionist` (ADR 0091, migrering 0054) på Martins ønske om, at en voksen, fx en forælder, kan træne i Kadence: en senior vælger en træningsprofil (Motionist som standard), og Kadences egne tal med kilder (docs/research/senior-motionister.md) giver sæsonplan, ugens ramme, længste tur og styrkerytme gennem paradigmet. Intet ændret for U17–U23. Demo: `/demo?alene=voksen`.
- **12. okt., aften.** S-12b er bygget oven på S-12a på `feat/konto-og-priser` (ADR 0090 og 0088 med tillæg, migrering 0053): den åbne prisside `/priser` (`/en/prices`) læst fra `price_plans` og kun med `BILLING=on` (ellers 404 fra proxyen); Installation → Priser, hvor ejeren retter planerne, og en ændring er en ny række fra sin dag, så den gamle pris står som historik; en plans AI-budget og filplads gælder nu for dens arbejdsrum (rummets eget tal, så planens, så installationens); forsiden efter `SIGNUP` og `BILLING` ("Opret konto" først, "Er I et hold? Så ansøger I først", og "Gratis i 30 dage, derefter fra 24 kr. om måneden"); og dør 2 bruges med det samme, med en stribe om at bekræfte adressen inden 7 dage, lås derefter og sletning efter 30 dage. Hele suiten grøn (364 filer, 3.393 tests), build ren.
- **12. okt., eftermiddag.** S-12a er bygget på `feat/konto-og-priser` (ADR 0090, migrering 0052): `BILLING` (off som standard) og `TRIAL_DAYS`, fire tilstande på arbejdsrummet, prøveperiode for personer, første sæson gratis for klubber, unge alene gratis til og med U19, udløb som læs og hent ud i `runAction`, filernes døre og AI'en, et dagligt job `billing.expire` med fire mails til ejerne, Installation → Betaling og Indstillinger → Abonnement. Intet kontonummer i Kadence. Hele suiten grøn (359 filer, 3.350 tests), build ren. S-12b (prisside, pristabel, forside, brug med det samme) bygges oven på.
- **12. okt., formiddag.** S-08 og S-09 er samlet på `feat/doer-2-og-filer` (PR #48 med trin 1 som base): `SIGNUP=individuals` med bekræftet mail først og samtykke til helbredsoplysninger gemt med version (ADR 0088, migrering 0050), og filer i databasen eller i et EU-objektlager bag én adapter med egen SigV4, gravsten, flyttejob og kvoter 20/2 GB (ADR 0087, 0051). Hele suiten grøn (346 filer, 3.232 tests), build og audit rene. Tilbage af planen: S-11 (trin 2, når tallene beder om det), S-12 (gebyret, Martins beslutning om form) og S-13 (det vilkårene lover; venter på Martins ja). Kæden af PR'er: #44, #45, #46, #47, #48; uafhængige: #42 (plan) og #43 (jura). Forbrug: ca. 0,4–0,48M tokens pr. spor.
- **12. okt., morgen.** Trin 1 er samlet på `feat/trin-1` (PR #47 med S-02 som base): S-06 jobtabel og worker af samme image (ADR 0085, migrering 0047), S-07 mail via Scaleway TEM (ADR 0086, 0048; nodemailer 10.1.0, MIT-0), S-10 pgBackRest-overlay med WAL hvert minut og AI med tokens, pris og månedligt budget pr. arbejdsrum (ADR 0089, 0049). Hele suiten grøn (334 filer, 3.154 tests), build og `pnpm audit --prod` rene. Et valg til Martin i PR'en: turens navn i enhedsjobbets payload. S-08 (selvoprettelse) og S-09 (filer i objektlager, kvoter) er sat i gang oven på trin 1. Forbrug: ca. 0,38M tokens pr. spor og ca. 0,25M i hovedsessionen til fletning.
- **12. okt., nat.** S-02 er bygget og flettet med trin 0 (PR #46 med trin 0 som base, ADR 0081, migrering 0046): én definer-funktion flytter rytterens historik, spørgsmålet stilles ved ind- og udtræden, ét personligt rum pr. person ad serverens egen vej (Better Auth 1.7.1 tillod ikke planens nonce-header; afvigelsen står i ADR'en). S-07 (mail via Scaleway TEM, nodemailer 10.1.0, MIT-0) er bygget på `feat/mail` og venter på at blive samlet med S-06 og S-10 i trin 1-bølgen. Forbrug: ca. 0,37M tokens pr. spor.
- **11. okt., nat.** S-01 er bygget (PR #44, ADR 0080, migrering 0041): personligt arbejdsrum, ansøgning som mig selv eller mit barn, 15 år, menuer, Slet min konto, demo alene. S-03, S-04 og S-05 er bygget hver i sit spor og samlet på `feat/trin-0` (PR #45 med S-01 som base, ADR 0083 og 0084, migreringer 0042–0045); hele suiten grøn (315 filer, 2.947 tests), build kompilerer. S-02 er i gang oven på S-01. Forbrug: ca. 0,4M tokens pr. spor og ca. 0,3M i hovedsessionen til fletning og gennemgang.
- **11. okt., aften.** A-08 er skrevet som udkast i docs/jura (gren docs/jura): databehandleraftale med bilag, vilkår og privatlivspolitik på dansk og engelsk, DPIA (påkrævet, ikke forudgående høring) og fortegnelse. Fundet undervejs: aldersgrænsen for et barns eget samtykke er 15, ikke 13, siden 1. januar 2024; planen, S-01 og S-08 er rettet. Ni steder hvor koden ikke holder vilkårene; de tre med kode er S-13. Forbrug: ca. 240k tokens.
- **11. okt., senere.** Martin svarede ja på alle otte spørgsmål i planens afsnit 9 (mail: Claude vælger udbyder, valget er Scaleway Transactional Email; egen jobtabel; egen S3-signering og Hetzner Object Storage; kvoter og 24 måneders opbevaring som foreslået; et enkelt gebyr for drift og vedligehold, S-12 skrives senere; S-01 først og trin 0 parallelt). S-01, S-03, S-04 og S-05 er sat i gang, hver i eget worktree med egen database.
- **11. okt.** Alene, og som en tjeneste: plan til godkendelse i docs/plan-alene-og-som-tjeneste.md, efter Martins input om at Kadence skal kunne bruges af én person (barn eller voksen) med mulighed for at komme på et hold senere, og at klubberne vil bruge kadence.haij.dk som tjeneste frem for egen installation. To agenter kortlagde konti/roller og driften: modellen bærer allerede en person alene (ADR 0010), men intet opretter ejerens rytterrække, menuen behandler ejeren som træner, og intet flytter historik mellem arbejdsrum; driften regner fem steder med én proces, filerne ligger som bytea i databasen, demoens revisionsrækker bliver liggende, og eksporten læser alt i hukommelsen. Planen: personligt arbejdsrum (`organizations.kind`), historikken følger rytteren (`move_rider_history`), tre driftstrin uden at bryde dogme to, og jura før døren åbnes. Stories S-01 til S-11 og A-08 nedenfor. Ingen kode. Forbrug: ca. 0,5M tokens inkl. agenterne.
- **10. okt.** Ture ind: en samlet undersøgelse af, om rytterne har de bedste muligheder for let upload og synkronisering fra deres enheder, kørt som én workflow med 67 agenter (seks spor, to uafhængige efterprøvere pr. påstand, tre dommere, en kritiker og en anden runde). Resultatet ligger i docs/research/rides-in-options.md: de nøglefri veje er de bedste en webapp kan have, men intet er automatisk endnu, intet er prøvet på en rigtig enhed, og flertallet (Edge + iPhone) har en omvej på otte tryk, som appen ikke forklarer. Tredict er stadig den eneste automatiske vej for mindreårige, nu i to varianter (eget token eller OAuth-klient) med fire skriftlige svar udestående; ugens visninger behøver kun turens tal, så et indtag af tal uden fil er det billigste automatiske skridt. A-07 er skrevet om til tre akser. Ingen kode. Forbrug: ca. 0,7M tokens i den sidste kørsel af workflowet; to tidligere kørsler stoppede på sessionens grænse og blev genoptaget fra cachen.
- **9. okt.** Efter N-02 fire små rettelser og en brugervejledning, på Martins ja: bibliotekets "Blokke" hedder forløb som i planlæggeren (også i eksportens ark); kortet for Øvelser og programmer under Viden og hjælp siger, at de samme programmer ligger i biblioteket, og biblioteket fører til den åbne side med "Del som åben side"; en rytter kan lægge et program i sin egen kalender (ADR 0078); Hjælp åbner med ordene pas, forløb, program og sæsonplan. Brugervejledningen ligger som én side med billeder under public/brugervejledning og som PDF gengivet med scripts/manual-pdf.ts, med et kort øverst på Viden og hjælp (ADR 0079). Forbrug: ca. 0,6M tokens i hovedsessionen.
- **9. okt.** N-02, navigation i to niveauer, er bygget på `feat/ny-navigation` og klar som PR til Martin (ADR 0077). Martin godkendte HTML-mock-up'en (docs/mockups/navigation) og svarede på dens seks spørgsmål: Overblik som trænerens forside, Nyt fra rytterne med, Søg nu, mørk mos som standard med valg under Indstillinger, check-in på forsiden, og Trænerrummet og Klubmester under Mere. Fire spor: skal og menu (hovedsessionen), Overblik og Viden og hjælp (agent), Søg og check-in (agent), og småting i bibliotek, rytterliste og sidens dele (hovedsessionen). Hele suiten er grøn (295 filer, 2.842 tests), build kompilerer. Forbrug: ca. 0,5M tokens pr. agentspor og ca. 1M i hovedsessionen inklusive mock-up'en.
- **8. okt.** Produktionen svarede 500 på holdsiden: volumet `/data/teams` ejes af root, og appen kunne ikke skrive sit øjebliksbillede. Siden holder nu øjebliksbilledet i hukommelsen, når disken nægter, og svarer aldrig 500 for en cache; Dockerfilen gør mappen til appens egen, og deploy.md siger, hvordan et gammelt volume rettes én gang. Samtidig alle danske holds trøjefarver fra DCU's PDF med godkendte tøjdesign 2026, som Martin pegede på. Forbrug: ca. 80k tokens.
- **8. okt.** Tre rettelser på Martins bud (Ø-10): AI'en viser nu, at den tænker — tre prikker og en gnist, stille ved nedsat bevægelse — i alle fem AI-paneler; print er lagt om til ren bloklayout med ét kort pr. række, så Safari også holder kortene hele; holdsiden har fået trøjefarver og mønstre for elleve hold, syv læst fra fotos på Wikimedia Commons, og selve fotografierne kopieret til installationen med kreditering. Forbrug: ca. 180k tokens.
- **8. okt.** Ø-09 holdsiden er bygget: `/guides/teams` læser UCI's U23-verdensrangliste og Nations' Cup fra DataRide og Cykling Danmarks holdliste og pointlister én gang i døgnet til et øjebliksbillede på disk, tegner trøjer ud fra registret, og viser kontakt som DCU selv offentliggør den. Fundet undervejs: UCI har ingen individuel juniorrangliste på landevej, så juniorernes point er DCU's. Forbrug: ca. 420k tokens.
- **8. okt.** Ø-08 "Byg med AI" for et program er færdig: en samtale i programbyggeren, hvor hvert svar lægges direkte i byggeren, med Fortryd. Prøvet mod en lokal Ollama-model (qwen2.5-coder:14b) i to ture plus fortryd. Plan B (holdsiden, Ø-09) er godkendt med DCU-læser bag flag og point for U19/U23. Forbrug: ca. 250k tokens.
- **8. okt.** Tre rettelser til øvelser og programmer på Martins bud (Ø-07): stangen tegnes set fra siden på figurer i profil (en skive med stangens stump i), programmet "Styrke i rummet" hedder nu "Træning med udstyr", og print til PDF giver sammenhængende sider på den åbne side, i appen og i den hentede fil — et kort deles aldrig, en dels navn står ved sine kort, og der er ikke længere tvungne sideskift mellem delene. Desuden en lille tegning af hver øvelse i "sammensæt dit eget". Forbrug: ca. 160k tokens.
- **8. okt.** P2 er færdig (alle 16 stories undtagen P2-01, som venter) sammen med Ø-06: alt er flettet ind på `feat/p2-vinteren`, hele suiten er grøn (2.695 tests, 1.417 enhedstests), build kompilerer, og PR'en er klar til Martin. Samlet forbrug for sporene: ca. 2,4M tokens mod et skøn på 2,5–4,3M for de samme stories. Rester er skrevet ind som P2-18.
- **7. okt., nat.** P2-02/03/04/16 og P2-12/13/15/17 er flettet ind; migreringerne er nummereret 0033–0040 i rækkefølge og snapshot-kæden bygget op igen; hele suiten er grøn (2.666 tests, 1.417 enhedstests). Kun P2-06/10/14 mangler.
- **7. okt., aften.** Ø-06, P2-05, P2-07, P2-08, P2-09 og P2-11 er færdige og flettet ind på `feat/p2-vinteren` med migreringerne 0033–0035; hele suiten er grøn (2.593 tests). P2-02/03/04/16, P2-12/13/15/17 og P2-06/10/14 er tæt på.
- **7. okt.** Energigels i løbseksemplet fra U17 (PR #28). Ø-06 (øvelser med udstyr) og hele P2 undtagen P2-01 er sat i gang på Martins bud. P2-11 og P2-13 bygges uden at svække trivselszonerne eller revisionssporet; valgene står i ADR'erne.
- **7. okt.** P1-09 er færdig: en demo kan aldrig blive installationens ejer; hele suiten er grøn (2.456 tests).
- **7. okt.** PR #26 (navigation efter opgaver) er merget. P1-09 er sat i gang.
- **7. okt.** N-01 (navigation efter opgaver) er færdig; hele suiten er grøn (2.450 tests, 1.365 enhedstests) og build kompilerer. Ny P1-09: en demo må aldrig blive installationens ejer (fundet under N-01). Den ustabile Rulle-test er rettet.
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

| ID    | Story                                                                            | Prio | Str. | Tokens (ca.) | Model     | Afhænger af          | Status        |
| ----- | -------------------------------------------------------------------------------- | ---- | ---- | ------------ | --------- | -------------------- | ------------- |
| P1-01 | Inviter hele holdet på én gang                                                   | P1   | M    | 300–450k     | Opus 5.5  |                      | Færdig        |
| P1-02 | Træneren får besked, når en rytter er i rød zone                                 | P1   | M    | 250–400k     | Opus 5.5  | ADR 0060 (push)      | Færdig        |
| P1-03 | Invitationen siger rytter eller forælder                                         | P1   | S    | 120–200k     | Opus 5.5  |                      | Færdig        |
| P1-04 | Pilotens tre tal                                                                 | P1   | M    | 300–450k     | Opus 5.5  |                      | Færdig        |
| P1-05 | Prøv påmindelser på en rigtig telefon                                            | P1   | S    | 100–180k     | Sonnet 5  | ADR 0060 (push)      | Færdig        |
| P1-06 | Rulle møder en rigtig hometrainer                                                | P1   | S    | 120–200k     | Sonnet 5  |                      | Færdig        |
| P1-07 | Ryttere og forældre kan forlade holdet igen                                      | P1   | S    | 50–100k      | Sonnet 5  |                      | Færdig        |
| P1-08 | En pilotguide til træneren                                                       | P1   | S    | 120–200k     | Sonnet 5  | A-05                 | Færdig        |
| P1-09 | En demo kan aldrig blive installationens ejer                                    | P1   | S    | 100–180k     | Opus 5.5  |                      | Færdig        |
| P2-01 | Garmin-ture ind af sig selv gennem Tredict                                       | P2   | L    | 600k–1M      | Opus 5.5  | A-07 (Martins ja)    | Ikke startet  |
| P2-02 | Mine ture: en liste over rytterens ture                                          | P2   | S    | 80–150k      | Sonnet 5  |                      | Færdig        |
| P2-03 | Tid, sted og kørsel på løb og begivenheder                                       | P2   | M    | 200–300k     | Sonnet 5  |                      | Færdig        |
| P2-04 | Forældre lægger familiens begivenheder ind                                       | P2   | M    | 250–400k     | Opus 5.5  | P2-03                | Færdig        |
| P2-05 | En fælles kladde til ugeplanen for flere trænere                                 | P2   | M    | 250–400k     | Opus 5.5  |                      | Færdig        |
| P2-06 | Tilgængelighed: kontrast, bevægelse og fokus                                     | P2   | S    | 120–200k     | Sonnet 5  |                      | Færdig        |
| P2-07 | Medlemmer kan ikke læse hinandens e-mailadresser                                 | P2   | M    | 400–700k     | Fable 5.1 |                      | Færdig        |
| P2-08 | Rate-limiteren stoler kun på egne proxyer                                        | P2   | S    | 60–120k      | Sonnet 5  |                      | Færdig        |
| P2-09 | Parkerede sider svarer 404                                                       | P2   | S    | 100–200k     | Sonnet 5  |                      | Færdig        |
| P2-10 | Enhedssiden nævner kun de udbydere, der er sat op                                | P2   | S    | 60–100k      | Sonnet 5  |                      | Færdig        |
| P2-11 | En kortere check-in                                                              | P2   | M    | 250–400k     | Opus 5.5  | A-06 (faglig)        | Færdig        |
| P2-12 | Planændringer kender deres afsender                                              | P2   | M    | 300–450k     | Opus 5.5  |                      | Færdig        |
| P2-13 | Påmindelser fylder ikke revisionssporet                                          | P2   | S    | 100–180k     | Opus 5.5  | Martins valg         | Færdig        |
| P2-14 | Demoen viser forløb med egne pas og påmindelser                                  | P2   | S    | 120–200k     | Sonnet 5  |                      | Færdig        |
| P2-15 | Invitationslinks, der holder en uge                                              | P2   | S    | 60–120k      | Sonnet 5  | P1-01                | Færdig        |
| P2-16 | En forælder på holdet kobles til endnu et barn                                   | P2   | M    | 200–350k     | Opus 5.5  | P1-01                | Færdig        |
| P2-17 | Trivselspåmindelsen ser en check-in, der bliver rød senere                       | P2   | S    | 150–250k     | Opus 5.5  | P1-02                | Færdig        |
| P2-18 | Tid og sted på trænerens I dag, og en forælder på holdet i "Tilføj forælder"     | P2   | S    | 60–120k      | Sonnet 5  | P2-03, P2-16         | Ikke startet  |
| P3-01 | Evaluér de parkerede dele ud fra pilotens tal                                    | P3   | S    | 60–120k      | Sonnet 5  | P1-04                | Ikke startet  |
| P3-02 | Fremmøde på holdpas                                                              | P3   | M    | 250–400k     | Opus 5.5  | pilotens ønske       | Ikke startet  |
| P3-03 | Saml de gamle indgange til planlægning                                           | P3   | S    | 120–200k     | Sonnet 5  | en måneds brug       | Ikke startet  |
| P3-04 | Holdets uge for tidligere og kommende uger                                       | P3   | M    | 250–400k     | Opus 5.5  |                      | Ikke startet  |
| P3-05 | E-mail som valgfri kanal                                                         | P3   | L    | 500–800k     | Opus 5.5  | Martins ja           | Færdig (S-07) |
| P3-06 | Trænerrummet tilbage med moderation i klubberne                                  | P3   | L    | 600k–1M      | Opus 5.5  | P3-01, 3 klubber     | Ikke startet  |
| P3-07 | Klubmesterskabet tilbage, sikkert for de unge                                    | P3   | M    | 300–450k     | Opus 5.5  | P3-01                | Ikke startet  |
| P3-08 | Content-Security-Policy med nonce                                                | P3   | L    | 500–900k     | Fable 5.1 |                      | Ikke startet  |
| A-01  | En sportsdiætist læser madguiden                                                 | A    | S    | 60–120k      | Sonnet 5  |                      | Ikke startet  |
| A-02  | Tilladelse til Rulles ruter og navne                                             | A    | S    | 60–120k      | Sonnet 5  |                      | Ikke startet  |
| A-03  | DCU inviteres til at følge vinteren                                              | A    | S    | 40–80k       | Sonnet 5  |                      | Ikke startet  |
| A-04  | Wahoo: produktionsadgang og puls under 16                                        | A    | S    | 30–60k       | Haiku 4.5 |                      | Ikke startet  |
| A-05  | Aftale med pilotholdet                                                           | A    | S    | 80–150k      | Opus 5.5  |                      | Ikke startet  |
| A-06  | Faglig vurdering af en kortere check-in                                          | A    | S    | 60–100k      | Sonnet 5  |                      | Ikke startet  |
| A-07  | Ja eller nej til Tredict og Connect IQ                                           | A    | S    | 60–120k      | Opus 5.5  |                      | Ikke startet  |
| R-01  | Slet de ubrugte filer                                                            | R    | S    | 40–80k       | Haiku 4.5 | Martins ja           | Ikke startet  |
| R-02  | Små rester fra fokus-bølgen                                                      | R    | S    | 100–180k     | Sonnet 5  |                      | Ikke startet  |
| Ø-01  | Tegnefunktion og indbyggede øvelser og programmer                                | Ø    | M    | 400–700k     | Opus 5.5  |                      | Færdig        |
| Ø-02  | Åben side, sammensæt og download                                                 | Ø    | M    | 300–500k     | Sonnet 5  | Ø-01                 | Færdig        |
| Ø-03  | Holdets egne øvelser og programmer i databasen                                   | Ø    | M    | 300–450k     | Opus 5.5  |                      | Færdig        |
| Ø-04  | Appen: bibliotek, tegneværktøj, programbygger, kalender                          | Ø    | L    | 600k–1M      | Opus 5.5  | Ø-01, Ø-03           | Færdig        |
| Ø-05  | Demo, hjælp og ADR                                                               | Ø    | S    | 100–200k     | Sonnet 5  | Ø-02, Ø-04           | Færdig        |
| Ø-06  | Øvelser og programmer med udstyr                                                 | Ø    | M    | 400–600k     | Opus 5.5  |                      | Færdig        |
| Ø-07  | Stangen fra siden, nyt programnavn og pæne sideskift ved print                   | Ø    | S    | 100–200k     | Opus 5.5  | Ø-06                 | Færdig        |
| Ø-08  | Byg et program med AI, i samtale                                                 | Ø    | M    | 400–600k     | Opus 5.5  | Ø-04                 | Færdig        |
| Ø-09  | Holdsiden: Junior- og U23-hold i Danmark, med trøjer, kontakt og point           | Ø    | L    | 500–800k     | Opus 5.5  |                      | Færdig        |
| Ø-10  | AI'en viser at den tænker, print der holder i Safari, trøjer og fotos            | Ø    | S    | 150–250k     | Opus 5.5  | Ø-07, Ø-09           | Færdig        |
| N-01  | Navigation efter opgaver                                                         | N    | M    | 300–450k     | Opus 5.5  |                      | Færdig        |
| N-02  | Navigation i to niveauer: Overblik, Viden og hjælp, Søg og mørk mos              | N    | L    | 1,5–2,5M     | Fable 5.1 | N-01                 | Færdig        |
| S-01  | Personligt arbejdsrum: mig selv eller mit barn, rytterens menu med planlægning   | S    | L    | 600k–1M      | Opus 5.5  | Martins ja (plan §2) | Færdig        |
| S-02  | Historikken følger rytteren ind på og ud af et hold                              | S    | M    | 400–700k     | Fable 5.1 | S-01                 | Færdig        |
| S-03  | Trin 0: tællere i databasen, timeouts, Postgres-indstillinger, indekser          | S    | M    | 400–700k     | Opus 5.5  |                      | Færdig        |
| S-04  | Trin 0: revisionssporet uden filer, demoens rækker, eksport med filer            | S    | M    | 300–500k     | Opus 5.5  |                      | Færdig        |
| S-05  | Trin 0: logs, health live/ready, overvågning, vilkår og subprocessors rettet     | S    | S    | 150–250k     | Sonnet 5  |                      | Færdig        |
| S-06  | Trin 1: jobtabel og worker af samme image                                        | S    | L    | 600k–1M      | Opus 5.5  | S-03, Martins valg   | Færdig        |
| S-07  | Trin 1: mail gennem en EU-udbyder (P3-05 rykket frem)                            | S    | L    | 500–800k     | Opus 5.5  | Martins ja           | Færdig        |
| S-08  | Dør 2: selvoprettelse for den enkelte med bekræftet adresse                      | S    | M    | 300–500k     | Opus 5.5  | S-01, S-07, A-08     | Færdig        |
| S-09  | Trin 1: filer i databasen eller i et EU-objektlager, med kvoter                  | S    | L    | 600k–1M      | Fable 5.1 | S-06, Martins valg   | Færdig        |
| S-10  | Trin 1: pgbackrest, restore-skript, AI med tokens og pris                        | S    | M    | 300–500k     | Opus 5.5  |                      | Færdig        |
| S-11  | Trin 2: pgbouncer, flere instanser, partitioneret revisionsspor                  | S    | L    | 800k–1,2M    | Fable 5.1 | S-06, planens tal    | Ikke startet  |
| S-13  | Det, vilkårene lover: egen konto slettes, IP ud af trænerens spor, egen sletning | S    | M    | 300–500k     | Opus 5.5  | A-08                 | Ikke startet  |
| A-08  | Databehandleraftale, privatlivspolitik, DPIA og fortegnelse som udkast           | A    | S    | 150–250k     | Opus 5.5  |                      | Færdig        |

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

### P1-09 En demo kan aldrig blive installationens ejer

**Som** den, der driver installationen, **vil jeg** være sikker på, at en
besøgende i demoen aldrig bliver installationens ejer, **så** en installation,
der slår demoen til før den første rigtige konto, ikke kan overtages.

- Fundet under N-01 (7. oktober): på en tom installation med `DEMO=on` blev
  den første demobesøgendes trænerkonto installationens ejer.
- `docs/launch.md` beskytter i dag kun ved rækkefølgen (egen konto først,
  demoen bagefter); koden skal beskytte uanset rækkefølgen.

**Tokens:** ca. 100–180k · **Model:** Opus 5.5 (`claude-opus-5-5`), adgang og ejerskab af installationen.

**Status:** Færdig 7. oktober på `fix/demo-aldrig-ejer`. Demoens konti ligger på det reserverede domæne `@demo.invalid`; de tæller ikke med, når Kadence ser, om installationen er tom, og en demokonto får aldrig ejerens rolle. `/demo` svarer 404, og forsiden viser ingen demo, før installationen har en ejer. ADR 0005 har fået et tillæg, og `docs/launch.md` siger det. Bygget af hovedsessionen selv i stedet for en agent, da rettelsen var lille; omkring 120k tokens (skøn 100–180k).

```text
Følg rammen i docs/backlog.md §0. Gren: fix/demo-aldrig-ejer.
Læs ADR 0004, 0005, 0048 og 0054, src/core/auth/signup.ts (den første
konto på en tom installation bliver ejer og lukker døren),
src/modules/demo/service.ts og roles.ts. Sørg for, at en konto, demoen
opretter, aldrig får platform_role = 'owner' og aldrig tæller som "den
første konto": demoens konti oprettes uden om den regel, og reglen ser
bort fra dem. Afvis også at slå demoen til (DEMO=on) uden en ejer: start
med en klar besked eller lad /demo svare 404, indtil der findes en ejer.
Tests: en tom installation med DEMO=on, hvor /demo åbnes først, har
bagefter ingen ejer, og den første rigtige registrering bliver ejer.
Opdatér docs/launch.md.
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

**Status:** Færdig 7. oktober. "Dine ture" på Mig: de seneste 20 ture med dato, titel, tid, distance og farve for, hvor tæt de kom på planen, og "Vis flere". Læses under RLS ud fra den indloggede, aldrig fra et id fra browseren. Andel af sporets forbrug: ca. 70k tokens (skøn 80–150k).

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

**Status:** Færdig 7. oktober. Begivenheder har fået starttid, mødested og en note om kørsel (migrering 0039), vist på kalenderens chips, på Mig, på forældresiden og i "Del ugen", hvor løb og lejre blandes ind efter tid; eksamen, skole, ferie og sygdom deles aldrig. Ikke gjort: trænerens liste over begivenheder på I dag viser endnu ikke tid og sted. Andel: ca. 135k tokens (skøn 200–300k).

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

**Status:** Færdig 7. oktober (ADR 0069). En forælder med bekræftet link kan lægge ferie, eksamen og andet ind for sit eget barn (migrering 0040), aldrig løb eller holdets begivenheder, og kan kun rette og slette sine egne rækker; rytteren og træneren kan rette alt. Rytteradskillelsen er bevist med en ny testblok. Træneren ser i kalenderen, at en forælder har lagt den ind. Andel: ca. 135k tokens (skøn 250–400k).

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

**Status:** Færdig 7. oktober. Inputfelters kant har nu mindst 3:1 mod kortet i lys og mørk (`--input` fra 1,45 til 3,3), pinnet af en test, der regner kontrasten ud fra tokens. Zone 1 og 4 har et tal og navn, hvor farven stod alene. Animationer slås fra under `prefers-reduced-motion`; det kræver `motion-reduce:!animate-none`, da Tailwind v4's egen animation ellers vinder, og en test holder det. 20 links uden fokusstil har fået `.focus-ring`. Andel af sporets forbrug: ca. 285k tokens (skøn 120–200k; kontrastberegningen og animationerne tog tid).

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

**Status:** Færdig 7. oktober. Kortet om udbydernes hjemland bygges ud fra de udbydere, installationen har sat op ("Polar er et finsk firma", "Garmin er et amerikansk firma, Polar er et finsk firma"), og sætningen om at sende pas kommer kun med, når en udbyder kan modtage dem. Andel: ca. 130k tokens (skøn 60–100k).

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

**Status:** Færdig 7. oktober. `planned_sessions.updated_by` sættes af en trigger ud fra den, der skriver (migrering 0037), og slettede pas i de næste 7 dage gemmes i `planned_session_deletions` med tvungen RLS gennem rytteradskillelsen, audit og en fejning efter 7 dage. Påmindelsen "Planen er ændret" dækker nu også sletninger og pas flyttet ud af ugen, og kun andres ændringer. ADR 0060 har fået et tillæg. Andel: ca. 150k tokens (skøn 300–450k).

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

**Status:** Færdig 7. oktober. Påmindelsernes tidsstempler ligger nu i `push_runs` (migrering 0038) uden audit-trigger, med begrundelsen i SQL og en dokumenteret undtagelse i meta-testen; tilmelding og afmelding auditeres stadig. Valgt løsning (b), så audit-triggerne forbliver urørte; ADR 0060 siger hvorfor (a) blev fravalgt. Andel: ca. 95k tokens (skøn 100–180k).

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

**Status:** Færdig 7. oktober. `seed.ts` er delt op; demoens forløb "Vinterblok, 4 uger" rummer et pas bygget i planlæggeren ("Teknik og sving", fredag 16.00 med mødested), og demoen har 6 ugers check-ins, så holdets tre tal har historik. Påmindelseskortet vises allerede, når installationen har nøgler. Andel: ca. 100k tokens (skøn 120–200k).

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

**Status:** Færdig 7. oktober. Invitationslinks gælder 7 dage (`TEAM_INVITATION_DAYS`); teksterne, der sagde 48 timer, er rettet, og ADR 0064 opdateret. Andel: ca. 40k tokens (skøn 60–120k).

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

**Status:** Færdig 7. oktober. En træner kan koble et medlem af holdet som forælder til en rytter, både fra rytterens side ("Hvem er forælderen?") og i "Inviter hele holdet", hvor en adresse, der allerede er medlem, kobles i stedet for at blive afvist. Rytteren bekræfter stadig. ADR 0064 har fået et tillæg. Andel: ca. 110k tokens (skøn 200–350k).

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

**Status:** Færdig 7. oktober. `checkins.red_since` (migrering 0036) sættes, når en check-in bliver rød, og nulstilles, når den rettes; trivselspåmindelsen tæller fra den. Én fælles regel for "rød" deles af check-in og påmindelse. Bemærk: en check-in, der bliver rød, grøn og rød igen samme dag, giver nu to beskeder. Andel: ca. 95k tokens (skøn 150–250k).

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

### P2-18 Tid og sted på trænerens I dag, og en forælder på holdet i "Tilføj forælder"

To små rester fra P2-03 og P2-16.

**Tokens:** ca. 60–120k · **Model:** Sonnet 5 (`claude-sonnet-5`).

**Status:** Ikke startet. Fundet 7. oktober.

```text
Følg rammen i docs/backlog.md §0. Gren: fix/smaa-rester-p2.
1) Trænerens liste over holdets begivenheder på I dag (coach-today.tsx)
viser ikke tid og sted; vis dem som på kalenderens chips. 2) "Tilføj
forælder" på rytterens side med en indtastet adresse, der allerede er
medlem, opretter rækken og fejler bagefter med alreadyMember; afvis før
oprettelsen, og peg på valget "Nogen, der allerede er på holdet". 3)
Danske ejefald skrives "{name}s" også ved navne på s (Magnus); brug
"{name}'" der. Tests for alle tre.
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

**Status:** Færdig 7. oktober (ADR 0068). Menuen er grupperet med ikoner for alle roller, Viden og beregnere, Trænerguide, Forældreguide og Hjælp står under Viden, bundbjælken følger rollen, holdnavnet er holdskifteren (kun som knap ved flere hold eller for ejeren), indstillinger står i Dig, Holdet og Installationen, og de åbne sider har "Tilbage til Kadence". Valgt undervejs: menupunktet hedder "Barnet" som før; forældre beholder Klubmester, når den er slået til; punkterne i sidemenuen er 34 px høje på computer, så trænerens længste liste står uden at rulle, og mindst 44 px på telefonen. Faktisk forbrug: 306k tokens på 30 min (skøn 300–450k).

### N-02 Navigation i to niveauer: Overblik, Viden og hjælp, Søg og mørk mos

**Som** træner, rytter eller forælder **vil jeg** have de fire steder, jeg
bruger hver dag, lige ved hånden og resten ét tryk væk, **så** jeg finder
rundt uden at lede, og træneren ser med det samme, hvad der skal ske nu.

- Højst fire primære steder pr. rolle, de samme i sidebjælken og i
  telefonens bundbjælke; resten under Mere med Indstillinger sidst.
- Trænerens forside hedder Overblik: næste uge-kortet, de tre vigtigste
  opmærksomhedspunkter, Nyt fra rytterne, holdet i dag og ugens begivenheder.
- Viden og hjælp er én dør: begge guider, de åbne sider og hjælpen;
  Forældreguiden ligger under /help/parents, barnets side er barnets.
- Søg med ⌘K, feltet i sidebjælken og luppen på telefonen: ryttere, pas,
  sider og hjælp, læst under RLS.
- Sidebjælken i mørk mos som standard, papir som valg under Indstillinger →
  Profil; fanen Mig hedder Profil.
- Rytterens I dag åbner med check-in, tre svar og Gem på én telefonskærm.
- Biblioteket med én knap "Nyt pas", rytterlisten med søgning, årgang og
  ugens mærker, og en række med sidens dele på Mig og rytterens side.

**Tokens:** ca. 1,5–2,5M · **Model:** Fable 5.1 (`claude-fable-5-1`) i hovedsessionen, Opus 5.5 i de to agentspor.

**Status:** Færdig 9. oktober (ADR 0077), PR til Martin. Valgt undervejs: en træner, der også kører eller er forælder, får Mig og barnet under Mere; Sæson og Rulle ligger under Mere og nås fra kalenderens timetal og fra passet; en forælders søgning har ingen pas; indekset hentes, første gang paletten åbner, og holder siden ud; check-in'en står før dagens pas som i mock-up'en. Ikke længere i brug: `src/components/today/attention-count.tsx` og `today.attention.*` (R-01).

### Ø-06 Øvelser og programmer med udstyr

**Som** træner med et styrkerum **vil jeg** have øvelser og programmer,
der bruger det udstyr, klubben har, **så** rytterne kan træne styrke med
rack og vægtstang, håndvægte, kettlebells, måtter, TRX, en bar til
kropshævninger og elastikker.

- Nyt udstyr i kontrakten: vægtstang (rack), håndvægte, TRX og bar til
  kropshævninger; kettlebell, måtte og elastik findes.
- Omkring 15 nye indbyggede øvelser med tegninger og kilder: squat og
  dødløft med stang, bænkpres eller skulderpres, udfald og step-up med
  håndvægte, kettlebell-sving, goblet squat, roning med stang eller TRX,
  TRX-rækker og -udfald, kropshævninger (også med elastik), elastik-
  øvelser til hofte og skulder.
- Tre programmer: "Træning med udstyr" (helkrop med stang og håndvægte),
  "TRX og kropsvægt" og "Elastikker og kettlebell".
- Doser efter DCU's styrkeprogrammer og ATK: teknik før vægt, belastning
  som "let", "moderat" eller "tung" frem for kilo, og aldrig til udmattelse
  for U17.
- Tegnefunktionen får rekvisitter til stang, håndvægte, TRX-stropper og
  bar, så holdets egne øvelser også kan bruge dem.

**Tokens:** ca. 400–600k · **Model:** Opus 5.5 (`claude-opus-5-5`), styrketræning for unge med kilder, nye rekvisitter i tegningerne.

**Status:** Færdig 7. oktober. Kontrakten har fået vægtstang, håndvægte, TRX og bar til kropshævninger med egne rekvisitter i tegnefunktionen og i tegneværktøjet; en dosis kan nu bære belastningen som ord (let, moderat, tung). 15 øvelser: squat med stang, dødløft, rumænsk dødløft, skulderpres, bænkpres, udfald og step-up med håndvægte, roning med håndvægt, kettlebell-sving, TRX-roning, TRX-udfald, kropshævning med og uden elastik, monstergang og udadrotation med elastik, alle med kilder (ATK 2.0, DCU's styrkeprogrammer, Lloyd 2014) og en sikkerhedsreplik. Tre programmer: Træning med udstyr (hed først Styrke i rummet), TRX og kropsvægt, Elastikker og kettlebell. Migrering 0033 udvider udstyrstjekket. Alle tegninger tjekket visuelt; to elastik-tegninger blev tegnet om. Faktisk forbrug: 395k tokens på 43 min (skøn 400–600k).

### Ø-07 Stangen fra siden, nyt programnavn og pæne sideskift ved print

**Som** træner **vil jeg** have tegninger, der viser stangen som den
ses, et programnavn, der siger hvad programmet er, og et print, der
holder sammen på kortene, **så** et udskrevet program kan hænge i
styrkerummet uden at et kort er delt over to sider.

**Prompt:**

> Tre rettelser til øvelser og programmer. (1) Vægtstangen tegnes i
> dag på tværs af figuren, også når figuren står i profil; tegn den set
> fra siden som standard (den nærmeste skives disk med stangens stump
> i), og behold tegningen forfra, hvor figuren vender mod læseren
> (skulderpres). Tegneværktøjet skal kunne vende stangen. (2) Kald
> programmet "Styrke i rummet" for "Træning med udstyr". (3) Print som
> PDF skal give sammenhængende sider: et kort deles aldrig, en dels navn
> står ved sine første kort, ingen tvungne sideskift mellem delene, og
> den hentede HTML-fil printer alle dele, ikke kun den der er på
> skærmen. Tjek med rigtige PDF'er fra Chromium. Opdater ADR 0067.

**Tokens:** ca. 100–200k · **Model:** Opus 5.5 (`claude-opus-5-5`), sideskift skal ses, ikke gættes.

**Status:** Færdig 8. oktober. Stangen har fået `view` (side som standard, front for skulderpres) og en knap på sin chip i tegneværktøjet; "Træning med udstyr" i begge sprog; én fælles printvisning (`program-print.tsx`) for den åbne side, appen og sammensæt, og den hentede fil har fået sin egen `@media print`. Hver af de seks PDF'er gik fra fire til tre sider uden delte kort. Oveni en lille tegning af øvelsen i "sammensæt dit eget" og i "Dit program". Forbrug: ca. 160k tokens.

### Ø-08 Byg et program med AI, i samtale

**Som** træner **vil jeg** kunne tale med en AI om, hvordan et program
skal sættes sammen, og se byggeren ændre sig undervejs, **så** jeg kan
komme fra en idé til et færdigt program på et par minutter og stadig
bestemme alt selv.

**Prompt:**

> Læg et panel "Byg med AI" i programbyggeren (`/library/programs/new`
> og `…/edit`), for trænere. En samtale: træneren skriver, hvad
> programmet skal kunne, eller hvad der skal ændres; AI'en svarer med et
> par sætninger og hele programmet, som det nu skal stå, og svaret
> lægges direkte i byggeren (navn, beskrivelse, dele, øvelser, doser) med
> "Fortryd sidste ændring". Intet gemmes, før træneren trykker Gem.
> Modellen får kun biblioteket (Kadences og holdets egne øvelser som
> linjer med reference, navn, gruppe, udstyr og dosis), udkastet, de
> sidste ture og trænerens ord — alt indhegnet som data — og ingen
> rytterdata. Svaret læses felt for felt: ukendte øvelser droppes, doser
> uden for kontrakten udelades, dele uden øvelser droppes. Gå gennem
> `askForJson` i `src/modules/ai` på en egen rute `/api/ai/build-program`
> som "Byg med AI" på et pas (ADR 0038). Uden model siger panelet det.
> Skriv ADR 0071 og tests af katalog, prompt og læsning.

**Tokens:** ca. 400–600k · **Model:** Opus 5.5 (`claude-opus-5-5`), prompt og sanering skal være rigtige første gang.

**Status:** Færdig 8. oktober. `src/modules/exercises/ai/` (katalog, prompt, læsning, forslag), ruten `/api/ai/build-program`, panelet `builder/ai-dialog.tsx` med udskrift, `AiKind` "build_program". Prøvet i browseren mod en lokal Ollama-model: første tur lagde navn, beskrivelse og 13 øvelser i byggeren, anden tur byttede planken ud med sideplanke, Fortryd satte planken tilbage. Læsningen tager også en øvelse ved dens bare id eller navn, fordi små modeller skriver `plank` for `builtin:plank`. Forbrug: ca. 250k tokens.

### Ø-09 Holdsiden: Junior- og U23-hold i Danmark

**Som** forælder eller rytter, der er ny i sporten, **vil jeg** kunne se,
hvilke U19- og U23-hold der findes i Danmark, og hvilke udenlandske hold
danske juniorer kører på, med trøje, officiel kontakt og hvem der kører
der, **så** vejen videre er til at få øje på.

**Prompt:**

> En åben side `/guides/teams` under Viden, linket fra "Klasserne og
> vejen videre" afsnit 6. Danske U19- og U23-hold (DCU-teams og UCI
> Continental) og udenlandske hold med danske juniorer i denne og seneste
> sæson: navn, klasse, hjemby, trøje tegnet i Kadences streg ud fra
> holdets farver (ingen fotos eller logoer), hjemmeside og de
> kontaktoplysninger holdet selv offentliggør, rytterne som holdet lister
> dem, og UCI-/DCU-point og placering for U19 og U23 (Martins beslutning 8. oktober; ADR 0013 gælder stadig for rytterens egne resultater i
> appen). Kilder: UCI dataride (holdregister og ranglister pr.
> nationalitet) dagligt, DCU's holdliste og rangliste bag flaget
> `TEAMS_DCU` (slået til, så Martin kan vise det for DCU i uge 42;
> DCU's ja er stadig udestående), holdenes egne hjemmesider ugentligt.
> Kadence har ingen planlagt job (ADR 0039): hent, når siden åbnes og
> øjebliksbilledet er over et døgn gammelt, én ad gangen med lås, og
> skriv til `./data/teams/` — ingen ny tabel. Det kuraterede register
> ligger i `src/modules/teams/registry/*.json` med "sidst tjekket".
> Skriv ADR 0072 og `docs/research/teams.md` med kilder og vilkår.

**Tokens:** ca. 500–800k · **Model:** Opus 5.5 (`claude-opus-5-5`), kildearbejdet skal være rigtigt.

**Status:** Færdig 8. oktober. `src/modules/teams/` med UCI-læser (`uci/`), DCU-læser (`dcu/`, bag `TEAMS_DCU`), registret `registry/teams.json`, øjebliksbillede i `TEAMS_DIR`, opfriskning efter alder med lås, og visningen `view.ts`; siden `/guides/teams` med tegnet trøje, kort pr. hold og kildenote. 25 tests mod anonymiserede fixtures fra 8. oktober. Fundet: UCI har ingen individuel juniorrangliste på landevej — juniorernes point er DCU's; udenlandske hold findes i data (UCI's U23-liste og DCU's holdkolonne), ikke i hukommelsen. Rester til en Ø-10: trøjefarver for de øvrige hold (fem er sat efter sponsorernes kendte dragter), Wikidata som daglig kilde til hjemmesider, og Commons-fotos kopieret til installationen med kreditering. Forbrug: ca. 420k tokens.

### Ø-10 AI'en viser at den tænker, print der holder i Safari, trøjer og fotos

**Som** træner **vil jeg** kunne se, at AI'en arbejder, få et print, der ikke deler et kort, og se holdenes trøjer og et foto af dem, **så** siderne føles færdige.

**Prompt:**

> (1) Én fælles "tænker"-markør (gnist og tre prikker, stille ved
> `prefers-reduced-motion`) i alle AI-paneler: Byg med AI for pas og
> program, ugeforslag, holdets uge og resuméet. (2) Print af programmer
> deler kort i Safari, fordi `break-inside: avoid` ignoreres i grid og
> flex; læg print om til ren bloklayout med ét kort pr. række og de gamle
> `page-break-*`-navne, både i appen og i den hentede fil. (3) Flere
> trøjer på holdsiden: farver og mønstre (bånd, striber, bryst, halve)
> læst fra fotos på Wikimedia Commons, og fotografierne kopieret til
> installationen ved opfriskning med kreditering som licensen kræver;
> afvis licenser uden for CC0/PD/CC BY(-SA). Intet hentes fra Commons i
> læserens browser.

**Tokens:** ca. 150–250k · **Model:** Opus 5.5 (`claude-opus-5-5`).

**Status:** Færdig 8. oktober. `components/assist/thinking.tsx` i fem paneler; `program-print.tsx` og den hentede fils print-CSS i bloklayout; `teams/photos.ts`, ruten `/api/teams/photo/[id]`, mønstre i `jersey.tsx`, syv hold med foto. Samme dag fik alle 21 danske hold farver fra DCU's PDF med godkendte tøjdesign 2026. Rester: farver for fem udenlandske hold, Wikidata som daglig kilde til hjemmesider. Forbrug: ca. 180k + 80k tokens.

## S — alene, og som en tjeneste

Planen er `docs/plan-alene-og-som-tjeneste.md` (11. oktober 2026); dens
afsnit 9 er spørgsmålene, stories her venter på svarene. Hver story
bygges i eget worktree med egen database og følger rammen i §0.

### S-01 Personligt arbejdsrum: mig selv eller mit barn

**Som** rytter uden hold, voksen eller ung, eller forælder til et barn
under 13 **vil jeg** kunne bruge Kadence alene med rytterens menu og
trænerens planlægning på min egen kalender, **så** jeg ikke skal have et
hold for at planlægge og følge min træning.

- `organizations.kind` ('club' | 'personal'), sat kun af serverkoden;
  `platform_overview()` viser enkeltpersoner som ét tal.
- Ansøgningen på `/register` får valget "En klub eller et hold" / "Mig
  selv", fødselsår og for et barn under 15 forælderens oprettelse med
  barnet som inviteret rytter; kilden til 15 år står ved tallet.
- Den godkendte registrering opretter rum, rytterrække (`createRiderIn`
  med `userId`) og klasse efter året; "senior" og "youth" får ingen
  DCU-tal, og sæsonplanen siger det.
- Menu og indstillinger for `personal`: I dag, Kalender, Mig, Bibliotek;
  Mere: Sæson, Rulle, Indstillinger, Viden. Ingen Overblik, Ryttere,
  Holdets uge, Trænerrum, Klubmester. "Slet min konto og alt om mig".
- Demo: `/demo?alene=1` med test i `tests/demo`.

**Størrelse:** L · **Afhænger af:** Martins ja til planens afsnit 2

**Tokens:** ca. 600k–1M · **Model:** Opus 5.5 (`claude-opus-5-5`), ny
kolonne på Better Auths tabel, registrering og alder på mindreårige.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/alene.
Læs docs/plan-alene-og-som-tjeneste.md §2–3 og ADR 0010, 0048, 0061,
0077. Migrering 0041: organizations.kind med check og indeks, sat kun
fra src/core/auth/register-personal.ts og access-godkendelsen; en
before-hook på /organization/create afviser feltet fra en request body.
Ansøgning med kind og birth_year (to kolonner på access_requests, uden
org_id som ADR 0004). registerPersonal: zod med forWhom 'me'|'child';
under 15 afvises for 'me' med en plain besked og kilden
(databeskyttelsesloven § 6, stk. 2 og 3, 15 år siden 1. januar 2024). Rytterrække via createRiderIn med
userId. menuFor(role, flags, kind) og settingsItems(me, kind). Demo
alene. Tests: tests/access/register-personal, tests/nav, tests/demo,
tests/i18n. ADR 0080. Ingen ny afhængighed.
```

### S-02 Historikken følger rytteren

**Som** rytter **vil jeg** kunne tage min træning med, når jeg kommer på
et hold eller forlader det, **så** min form og mine ture ikke bliver
efterladt i et arbejdsrum, jeg ikke bruger mere.

- `move_rider_history(from, to)`: definer, kun når `app.user_id` ejer
  begge rytterrækker, alt eller intet, én revisionshændelse pr. tabel
  på begge rum, aldrig rækkerne.
- Meta-test: en tabel med `rider_id`, som funktionen ikke nævner, fejler.
- `/join/[id]` spørger "Tag din træning med over på holdet?"; "Forlad
  holdet" spørger "Tag din træning med?" og opretter et personligt rum
  først (`canCreateWorkspace`: ét personligt rum, kun via serverkoden,
  nonce som demoens).

**Størrelse:** M · **Afhænger af:** S-01

**Tokens:** ca. 400–700k · **Model:** Fable 5.1 (`claude-fable-5-1`),
den første funktion, der skriver på tværs af to arbejdsrum.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/historik-foelger-rytteren.
Læs docs/plan-alene-og-som-tjeneste.md §2.4 og §3.2, ADR 0011, 0064.
Migrering 0042: move_rider_history som beskrevet, REVOKE FROM PUBLIC,
GRANT til kadence_app, i CALLABLE_DEFINER_FUNCTIONS med sin grund.
Actions moveHistoryIntoTeamAction og leaveWithHistoryAction, to trin
som ADR 0064 (fejler flytningen, slettes det nye rum). RLS-test
tests/rls/history-move.test.ts: rytteren kan, træner og fremmed kan
ikke, alt eller intet, revisionssporet. Udvid meta-testen. ADR 0081.
```

### S-03 Trin 0: ud af hukommelsen, ind i databasen

**Som** den, der driver kadence.haij.dk, **vil jeg** at tællere, limits
og timeouts holder ved en genstart og med mere end én instans, **så**
installationen kan vokse uden at skifte kode senere.

**Størrelse:** M · **Tokens:** ca. 400–700k · **Model:** Opus 5.5
(`claude-opus-5-5`), politikker og Postgres-indstillinger.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/trin-0-taellere.
Læs docs/plan-alene-og-som-tjeneste.md §5.0 og TECH-DEBT.md "Rate
limiting is per process". src/core/rate-limit.ts beholder sin
signatur og tæller i en unlogged tabel app_rate_limits med upsert og
sweep, som også rydder Better Auths rate_limits; in-flight, DCU-kø,
ownReads og test-push følger med eller dokumenteres som pr. instans.
Demoens nonce bliver HMAC over BETTER_AUTH_SECRET og dagen. Puljer med
connectionTimeoutMillis og idleTimeoutMillis; statement_timeout og
idle_in_transaction_session_timeout pr. rolle i migreringen. Postgres
command: i docker-compose.yml sat til 4 GB med kommentar. Migrering
0043 med indekserne fra planen. Politikker kalder hjælperne som
(select …). Better Auth session.cookieCache 5 min. app_shell() definer
til layoutet. Tests: eksisterende RLS-suite grøn, tests/core/rate-limit
mod databasen, en test der viser at cookie-cachen ikke overlever
fjernelse fra holdet. ADR 0083. Ingen ny afhængighed.
```

### S-04 Trin 0: revisionssporet uden filer, og en eksport der holder

**Størrelse:** M · **Tokens:** ca. 300–500k · **Model:** Opus 5.5
(`claude-opus-5-5`), audit og eksport.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/trin-0-revisionsspor.
Læs docs/plan-alene-og-som-tjeneste.md §5.0, ADR 0003. audit_row_change
fjerner bytes og streams før to_jsonb; delete_workspace slår
triggerne fra under kaskaden og skriver én hændelse; demoens oprydning
sletter demoens revisionsrækker. Eksport: faste kolonner uden streams,
revisionssporet sidevis, rate limit 3/time pr. arbejdsrum, og "Hent
dine filer" som zip af activity_files under samme RLS. Tests:
tests/audit, tests/export, tests/demo. Dogme tre står i ADR'en.
```

### S-05 Trin 0: logs, health, overvågning og rettede tekster

**Størrelse:** S · **Tokens:** ca. 150–250k · **Model:** Sonnet 5
(`claude-sonnet-5`).

```text
Følg rammen i docs/backlog.md §0. Gren: fix/trin-0-drift.
docker-compose.yml: logging json-file max-size 20m max-file 5.
/api/health skelner live fra ready med timeout på puljen. Et request-id
i loglinjer gennem den eksisterende console-brug. docs/deploy.md: et
afsnit om overvågning (Uptime Kuma på samme VPS, push-monitor fra
backup-scriptet), og deploy-guiden nævner trin 0's indstillinger.
Rettelser: /terms siger ikke længere "vi skriver til dig", Mistral-rækken
i docs/subprocessors.md beskriver Kadences prompts, backup-lageret og
UCI DataRide får rækker. Ingen ny afhængighed.
```

### S-06 Trin 1: en jobtabel og en worker

**Størrelse:** L · **Afhænger af:** S-03, Martins valg (plan spm. 3)

**Tokens:** ca. 600k–1M · **Model:** Opus 5.5 (`claude-opus-5-5`).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/worker.
Læs docs/plan-alene-og-som-tjeneste.md §5.1. Tabel jobs med for update
skip locked, gentagelser med voksende ventetid, og en worker-service af
samme image i docker-compose.yml (WORKER=on; uden den kører appen
jobbene i sin egen timer som i dag). Flyt påmindelser (push/timer),
enhedernes webhooks (after()), DCU-læsninger (results/queue),
holdsidens opfriskning, demoens oprydning og refreshStaleRaces over.
Tests mod databasen: to workere tager ikke samme job, et fejlet job
prøves igen, et deploy midt i et job mister det ikke. ADR 0084.
```

### S-07 Trin 1: mail gennem en EU-udbyder

Erstatter P3-05 og rykker den frem. **Afhænger af:** Martins ja til
`nodemailer` og en udbyder (plan spm. 2).

**Størrelse:** L · **Tokens:** ca. 500–800k · **Model:** Opus 5.5
(`claude-opus-5-5`).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/mail.
Kun efter Martins ja. SMTP_* i env.ts og docker-compose.yml, en mailer
i src/core/mail med fake transport i tests, aldrig indhold om træning
eller helbred. Bekræft adresse, nulstil adgangskode (ved siden af
trænerens link, ADR 0032), invitation sendt når adressen er kendt, og
forældrenes ugeoverblik som valg ved siden af push (ADR 0060). Række i
docs/subprocessors.md. ADR 0085.
```

### S-08 Dør 2: selvoprettelse for den enkelte

**Afhænger af:** S-01, S-07, A-08 på plads.

**Størrelse:** M · **Tokens:** ca. 300–500k · **Model:** Opus 5.5
(`claude-opus-5-5`).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/signup-individuals.
SIGNUP får stillingen individuals: en person kan oprette et personligt
arbejdsrum selv med bekræftet e-mail før alt andet; klubber søger
stadig. Samtykke til helbredsoplysninger som afkrydsning, der kan
trækkes tilbage under Indstillinger → Data (slår check-in og målinger
fra, resten virker). Ubekræftede konti slettes efter 7 dage af
oprydningen. Honeypot og rate limit som ADR 0004. Tests i tests/access.
```

### S-09 Trin 1: filer i databasen eller i et EU-objektlager

**Afhænger af:** S-06, Martins valg (plan spm. 4 og 5).

**Størrelse:** L · **Tokens:** ca. 600k–1M · **Model:** Fable 5.1
(`claude-fable-5-1`), lagring af rytternes filer under RLS.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/filer-objektlager.
Læs docs/plan-alene-og-som-tjeneste.md §5.1. Adapter src/core/files med
bagenderne db (standard) og s3 (FILES_STORAGE, S3_* i env og compose),
activity_files.storage_key, bytes null når filen ligger ude; RLS på
rækken afgør adgang, og appen henter altid gennem sin egen route.
Kvoter pr. arbejdsrum (file_quota_bytes på team_settings, standard 20
GB klub / 2 GB person) vist under Data og i Installation. Flytning af
gamle filer som job. Eksport og sletning tager filerne med. Tests med
en fake S3 i tests/files. Række i docs/subprocessors.md. ADR 0086.
```

### S-10 Trin 1: backup til minuttet, og AI med pris

**Størrelse:** M · **Tokens:** ca. 300–500k · **Model:** Opus 5.5
(`claude-opus-5-5`).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/pgbackrest-og-ai-pris.
pgbackrest som sidecar bag en compose-profil med fuld backup om natten
og WAL hvert minut til et S3-kompatibelt EU-lager, krypteret; dumpen
beholdes; scripts/restore-drill.sh. ai_calls får tokens_in, tokens_out
og cost_micro fra udbyderens svar; AI_DAILY_CALL_CAP bliver et loft pr.
arbejdsrum pr. måned med en samlet linje i Installation. docs/deploy.md
§7 skrives om. Tests i tests/ai.
```

### S-11 Trin 2: databasen for sig og flere instanser

**Afhænger af:** S-06 og planens tal (§5.5).

**Størrelse:** L · **Tokens:** ca. 800k–1,2M · **Model:** Fable 5.1
(`claude-fable-5-1`).

```text
Følg rammen i docs/backlog.md §0. Gren: feat/trin-2.
pgbouncer i transaction mode bag en compose-profil; app med replicas og
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY; holdsidens øjebliksbillede i
databasen; audit_log partitioneret pr. måned med opbevaring efter
Martins svar (spm. 6); kortets fliser gennem proxyens cache; FIT-
dekodning i workeren. Hele suiten grøn mod pgbouncer. ADR'er som
planen siger.
```

### S-13 Det, vilkårene lover

**Som** rytter eller forælder **vil jeg** at det, `/terms` lover, også er
det, koden gør, **så** jeg kan slette mig selv, og min IP-adresse ikke
ligger i trænerens spor.

Fundet af A-08's DPIA (docs/jura/dpia.md, R9 m.fl.):

- `delete_workspace` sletter ikke medlemmernes konti, og ingen kan
  slette sin egen konto; "Slet min konto" under Indstillinger → Mig
  sletter kontoen, når den ikke er på andre hold (og først forlader
  holdet, hvor den er).
- Logins skrives i revisionssporet med IP-adresse og browser under
  holdets `org_id`; trænere læser dem i sporet og i eksporten. Flyt
  `auth.*`-hændelser til installationens eget spor uden `org_id`, eller
  fjern IP og browser fra dem; eksporten følger med.
- En rytter kan selv slette sin historik (`erase_rider` for egen række),
  med bekræftelse og eksport først.

**Størrelse:** M · **Afhænger af:** A-08

**Tokens:** ca. 300–500k · **Model:** Opus 5.5 (`claude-opus-5-5`), audit og sletning.

```text
Følg rammen i docs/backlog.md §0. Gren: feat/det-vilkaarene-lover.
Læs docs/jura/dpia.md og vilkaar-og-privatliv-forslag.md (listen
"hvor koden ikke holder"), ADR 0003, 0006. Byg de tre punkter ovenfor
med RLS- og audit-tests; ret /terms' sætninger, der stadig ikke holder,
eller lad dem sige det, koden gør. ADR.
```

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
Læs memory om Garmin-research, docs/research/garmin-without-partner-access.md
og docs/research/rides-in-options.md (§1.2, §4 punkt 6 og 9). Skriv på én
side, hvad Martin skal tage stilling til, på tre akser: (a) tal først
(gratis og automatisk fra Tredicts liste, filen betalt eller med kabel)
eller fil først, med kodens liste over hvad tursiden mister uden fil;
(b) rytterens eget token (ingen nøgler, sover efter 14 dage, filen
kræver fuld adgang, Tredicts egen anbefaling) eller en OAuth-klient pr.
installation (ingen søvn på papiret, ikke tildelt, filens krav
ubekræftet); (c) hvad Tredict dækker indendørs (Zwift og Rouvy, ikke
MyWhoosh og TPV). Dertil Connect IQ-appen (developer-konto i hans navn,
SDK, en Edge 530 eller nyere, licens). Anbefal én vej til vinteren.
Ingen kode. P2-01's prompt forudsætter et ja her; ret den, hvis svaret
bliver nej eller en anden variant.
```

---

### A-08 Databehandleraftale, privatlivspolitik, DPIA og fortegnelse

**Tokens:** ca. 150–250k · **Model:** Opus 5.5 (`claude-opus-5-5`), jura om helbredsoplysninger og mindreårige.

```text
Læs docs/plan-alene-og-som-tjeneste.md §6. Skriv som udkast til
Martins rådgiver: docs/databehandleraftale.md ud fra Datatilsynets
standardkontraktsbestemmelser med Kadences bilag (hvad, hvor, hvordan
klubben henter og sletter); et forslag til at dele /terms i vilkår og
privatlivspolitik, der navngiver den dataansvarlige for klubber og for
personer alene og hjemlen for helbredsoplysninger; docs/dpia.md og
docs/fortegnelse.md. Alderen 15 med kilde (hævet fra 13 den 1. januar 2024). Ingen kode. Supplerer A-05.
```

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
dine samtaler" (arvet fra Haij); sig "Forlad holdet" som på Mig. 5) (Gjort 7. oktober: tests/rulle/side-roads.test.ts har fået 30 sekunder.) 6) Når en træner fjerner et medlem, bliver
medlemmets rækker i push_subscriptions liggende uden at blive brugt;
fjern dem i samme transaktion (en SECURITY DEFINER eller en trigger på
memberships), med en test.
```

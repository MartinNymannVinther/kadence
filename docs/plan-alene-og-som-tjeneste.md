# Kadence — plan til godkendelse: alene, og som en tjeneste for mange

Oktober 2026. Planen svarer på Martins input af 11. oktober 2026: at
Kadence skal kunne bruges af én person, barn eller voksen, med mulighed
for at knytte kontoen til et hold senere; og at de fleste klubber ikke
vil drive deres egen installation, men bruge kadence.haij.dk som en
tjeneste, så den udgave vi driver skal kunne skalere, når det bliver
nødvendigt.

Den følger arbejdsgangen i CLAUDE.md: planen, skemaet og API-fladen
godkendes først, og derefter bygges der bølge for bølge, hver på sin egen
branch og med sin egen PR. Afsnit 9 samler spørgsmålene til Martin.
Ingen kode er skrevet endnu.

Fokus er stadig danske ungdomsryttere og deres trænere. Det, planen
tilføjer, er en vej ind for den enkelte og en drift, der holder til
mange. Dogmerne ændres ikke: alt her kører også på én server med Docker
Compose, og koden er den samme som på kadence.haij.dk.

---

## 1. Hvor vi står

Modellen bærer allerede en person alene. ADR 0010 siger det direkte: "A
rider who trains alone is the owner of their own team and has a rider
row: coach and rider in one person." Et arbejdsrum er et hold, trænerne
er dets ejere og administratorer, og en rytter er en række i `riders`
med sit `user_id`. Klasserne kender allerede "youth" og "senior" uden om
U17–U23 (`src/modules/dcu/classes.ts`), og sæsonplanen kan vælge
"senior" uden DCU-tal (`src/modules/season/class.ts`).

Koden ved det også hist og her: I dag kender `soloRider` (en træner,
hvis eneste rytter er dem selv) og springer trænerens overblik over,
kalenderen viser en sådan træner deres egen kalender, og
`createRiderIn` tager allerede et `userId`. Men ingen formular eller
handling opretter ejerens egen rytterrække, så en person, der opretter
sig i dag, står som træner uden rytter: uden Mig, uden enheder og
upload-nøgler (dem må kun rytteren selv skrive, `app_is_rider_self`),
uden check-in og uden navn i Rulle.

Det, der mangler, er vejen ind og det, man møder, når man er kommet ind:

- **Døren er lukket for den enkelte.** Registrering sker ved ansøgning
  og ejerens godkendelse (ADR 0004), og den godkendte registrering
  opretter et arbejdsrum med navnet fra ansøgningen
  (`src/core/auth/register.ts`). Der er ingen "mig selv" i formularen,
  ingen fødselsår, og ingen rytterrække bliver oprettet. Kun
  installationens ejer opretter arbejdsrum (ADR 0048).
- **Menuen går efter rollen med mest at gøre** (ADR 0061, 0077). En
  person, der både er træner og rytter i sit eget arbejdsrum, får
  trænerens Overblik, holdets uge og rytterlisten med én rytter: sig
  selv. Det er det forkerte værktøj til den, der blot vil se sin dag,
  lægge sin uge og køre Rulle.
- **Historikken sidder i arbejdsrummet.** Alle rækker om en rytter har
  `org_id` og `rider_id`. Den, der har trænet alene et halvt år og så
  kommer på et hold, bliver inviteret til holdets arbejdsrum og får en
  ny rytterrække der; pas, ture, check-ins og form bliver tilbage i det
  gamle. Det samme, bare omvendt, når en rytter forlader et hold
  (P1-07): `leaveWorkspace` fjerner medlemskabet, og rækkerne bliver på
  holdet.
- **Ét hold pr. rytter** er en accepteret grænse (TECH-DEBT.md), og den
  bliver ikke bedre af et personligt arbejdsrum ved siden af holdets.
- **Kadence sender ingen mail** (ADR 0001, 0032). Hver adgang går gennem
  et link, et menneske sender ved hånden. Det skalerer til tyve klubber
  med en træner i hver, ikke til enkeltpersoner, der finder siden selv.
- **Vilkårene er skrevet til hold.** `/terms` siger "jer og jeres hold",
  og deploy-guiden siger, at klubben er dataansvarlig og Haij
  databehandler. For en person alene er Haij dataansvarlig, og det er
  en anden aftale.

Driften er i dag én container bag Coolifys proxy, én Postgres i samme
compose-fil på samme VPS, og natlige krypterede dumps. Hvad der i koden
forudsætter netop den form, står i afsnit 5.

---

## 2. Beslutninger for brug alene

### 2.1 Et personligt arbejdsrum, ikke en ny model

En person alene får et arbejdsrum af slagsen **personlig**. Det er det
samme arbejdsrum som et hold har, med samme RLS, samme audit og samme
eksport, og personen er dets ejer og eneste rytter. Ingen tabel får en
ny ejer-type, og ingen politik skrives om. Det, der ændrer sig, er en
kolonne, `organizations.kind` ('club' | 'personal'), og hvad
grænsefladen gør med den.

Hvorfor ikke en rytter uden arbejdsrum: hver tabel har `org_id`, og
tenancy sættes pr. transaktion (`src/core/db/tenant.ts`). En rytter uden
`org_id` ville kræve en anden politik på hver tabel og en anden test for
hver politik, for at spare en række i `organizations`.

Hvorfor en kolonne på `organizations` og ikke `team_settings.team_kind`:
`team_settings` har først en række, når nogen har ændret noget, og
`team_kind` siger, hvilken klasse holdet er (U17, U19, U23, mixed), ikke
hvad arbejdsrummet er for noget. Better Auths `organizations` har en ubrugt
`metadata`-kolonne, men en fri tekst er ikke en type. ADR 0048 satte
allerede `last_active_at` på Better Auths `memberships`; `kind` på
`organizations` er samme greb, med samme forbehold: hooken, der sætter
den, skal overleve et løft af pinden.

### 2.2 Det, den enkelte møder

I et personligt arbejdsrum er menuen rytterens (I dag, Kalender,
Check-in, Rulle, Mere) med trænerens planlægningsværktøjer slået til på
egen kalender: læg pas, kopiér en uge, forløb, biblioteket, sæsonplanen
og "Byg med AI". Overblik, Holdets uge, Ryttere, Inviter hele holdet,
Trænerrummet, Klubmesterskab, Forældrenes side og pilotens tal vises
ikke; de handler om et hold. Rækkefølgen og ordene følger ADR 0077, kun
udvalget er anderledes.

Belastning, form, zoner, opmærksomhedspunkter og AI'ens forslag virker
som i dag, for de kører på rytterens egne rækker. Sammenligningen mod
DCU vises for U17, U19 og U23; for "senior" og "youth" siger
sæsonplanen, at DCU ikke har et tal for klassen, og personen sætter
sine egne timer, som en træner kan i dag. Ingen ny beregning: intet
voksen-korridor opfindes, og TrainingPeaks' mål kommer ikke ind ad
bagdøren.

### 2.3 Barn eller voksen

Formularen spørger om fødselsår, som rytterformularen gør i dag
(`src/modules/team/birth-year.ts`), og klassen følger af det.

Et barn under 15 år kan ikke selv oprette en konto. Databeskyttelsesloven
§ 6, stk. 2 og 3 sætter grænsen for et barns eget samtykke til
informationssamfundstjenester til 15 år i Danmark, hævet fra 13 den 1.
januar 2024 (lov nr. 1783 af 28. december 2023; GDPR art. 8 lader
medlemsstaterne vælge mellem 13 og 16). Kadence behandler desuden
helbredsoplysninger (GDPR art. 9) om barnet: søvn, smerte, puls. Så for
et barn under 15 er det forælderen, der opretter det personlige
arbejdsrum som ejer og tilføjer barnet som rytter med en invitation,
præcis som en træner gør i dag; forælderen er "træner" for sit eget
barn, og barnet ser rytterens menu. Fra 15 år og op kan den unge selv
oprette, og kan invitere en forælder som i et hold (ADR 0011: forælderen
ser det, rytteren deler). Kilderne står ved tallet i koden. Planens
første udkast sagde 13; A-08's gennemgang af loven rettede det samme dag.

### 2.4 Ind på et hold, og ud igen: historikken følger rytteren

Når en træner inviterer en person, der allerede har et personligt
arbejdsrum, og personen siger ja, spørger tilslutningssiden: "Tag din
træning med over på holdet?" Ja flytter rytterens rækker fra det
personlige arbejdsrum til holdets og lægger dem på den rytterrække,
træneren har forberedt; det personlige arbejdsrum slettes bagefter, når
det er tomt. Nej lader historikken blive, og personen har to arbejdsrum
med vælgeren som i dag.

Når en rytter forlader et hold (P1-07) spørger den samme bekræftelse:
"Tag din træning med?" Ja opretter et personligt arbejdsrum og flytter
rækkerne derhen, og først derefter forlades holdet. Nej er som i dag.
Træneren får en linje i revisionssporet om, at rækkerne forlod holdet,
ikke en kopi af dem.

Hvad der flyttes: det, der er rytterens efter ADR 0011, dvs. alt med
`rider_id`: planlagte pas og deres udførelse, ture og filer, check-ins
og målinger, sæsonplanen, rytterens egne pas (ADR 0050), enhedsforbindelser
og upload-nøgler, påmindelser, kommentarer på egne pas. Hvad der ikke
flyttes: holdets bibliotek, holdets kalender, forløb lagt af træneren
som skabeloner, trænerens noter om rytteren (de er holdets), og
revisionssporet (det er append-only; den gamle sides rækker står der,
som de blev skrevet, og slettes med arbejdsrummet).

Flytningen er én definer-funktion i databasen,
`move_rider_history(p_from_rider uuid, p_to_rider uuid)`, der kun
flytter, når kalderens `app.user_id` er `user_id` på begge rytterrækker
— det er rytterens egne data, og kun rytteren kan flytte dem — og som
skriver én hændelse pr. tabel i revisionssporet på begge arbejdsrum.
Trænere kan ikke trække en historik til sig, og ingen kan flytte andres.
Fremmednøgler fra `org_id` holder: funktionen opdaterer `org_id` og
`rider_id` på hver række i én transaktion, i rækkefølge efter
afhængighed, og meta-testen får en søster, der fejler, hvis en tabel med
`rider_id` ikke er nævnt i funktionen.

Hvorfor flytte og ikke dele på tværs: at lade en træner læse ind i et
andet arbejdsrum ville være den første politik, der krydser `org_id`, og
den ville skulle bevises for hver tabel for altid. En flytning er én
funktion, én test, og ryttere forstår den: min træning er hos mit hold,
eller den er min egen.

### 2.5 Vejen ind

Tre døre, afhængigt af hvor langt vi er med mail (afsnit 5.4):

1. **Nu, uden mail:** ansøgningen på `/register` får et valg: "En klub
   eller et hold" eller "Mig selv". Den anden kan udfyldes af forælder
   eller rytter, spørger om fødselsår, og ejerens godkendelse laver et
   personligt arbejdsrum med rytterrække og klasse. Ejeren ser i
   Adgang, hvad der søges om. Det giver Martin en konto at teste med i
   dag, uden at ændre døren.
2. **Med mail:** `SIGNUP` får en tredje stilling, `individuals`: den
   enkelte kan oprette sig selv med en e-mailadresse, der bekræftes, før
   noget andet må ske; klubber søger stadig, og ejeren godkender dem.
   Honeypot og rate limit som i dag, og en konto uden bekræftet adresse
   slettes efter 7 dage af oprydningen.
3. **Åbent for alle** (`SIGNUP=open`) forbliver demoens indstilling og
   ikke tjenestens.

En ny person, der kommer ind via et holds invitation, får ingen
personligt arbejdsrum; det er ADR 0010 som i dag.

### 2.6 Demoen og eksporten

Demoen får en "prøv alene"-variant ved siden af holdet (ADR 0054: hver
funktion i demoen), og eksporten af et personligt arbejdsrum er den
samme eksport, med ét ark pr. ting og én rytter i dem. Sletning er
"slet arbejdsrummet", som i dag; for en person er det "slet min konto og
alt om mig" med de samme ord på knappen.

---

## 3. Skema og API-flade for brug alene

### 3.1 Migrering 0041: `organizations.kind`

```sql
alter table organizations
  add column kind text not null default 'club'
  check (kind in ('club', 'personal'));
create index organizations_kind_idx on organizations (kind);
```

Sættes af vores egen serverkode ved oprettelsen (aldrig fra en request
body: Better Auths `organization.create` tager ikke feltet, og en
before-hook på `/organization/create` afviser et forsøg på at sende det).
`platform_overview()` får kolonnen `kind` med, så ejerens Installation
viser klubber og enkeltpersoner hver for sig, og tæller enkeltpersoner
som ét tal: hvor mange, hvor mange set i ugen, filplads og AI-kald.
Ingen navne.

### 3.2 Migrering 0042: `move_rider_history`

```sql
create function move_rider_history(p_from_rider uuid, p_to_rider uuid)
returns table (table_name text, rows_moved integer)
language plpgsql security definer set search_path = public, pg_temp as $$
-- Refuses unless app.user_id is riders.user_id on BOTH rows, the two rows
-- sit in different organizations, and the target row has no history yet
-- (no planned session, activity or check-in). Moves every row carrying
-- rider_id, table by table in dependency order, setting org_id and
-- rider_id; refuses when a file would take the target over its
-- workspace's file ceiling. Writes one audit event per table on both
-- organizations: 'rider.history_moved_out' / 'rider.history_moved_in'
-- with the counts, never the rows. Copies thresholds, sharing choices
-- and category_override from the source rider row onto the target.
$$;
revoke all on function move_rider_history(uuid, uuid) from public;
grant execute on function move_rider_history(uuid, uuid) to kadence_app;
```

Tabellerne med `rider_id` i dag (`grep rider_id src/core/db/schema`):
planned_sessions, activities, activity_files, comments, checkins,
rider_measurements, rider_goals, flag_resolutions, season_plans,
workout_templates med rider (ADR 0050), calendar_events, device_links,
upload_keys, race_results, planned_session_deletions, week_plan_drafts
og klubmesterskabets entries og champions. De sidste tre er holdets og
bliver: en kladde til ugeplanen, et pas en træner slettede, og et
resultat i klubbens mesterskab giver ingen mening i et personligt rum.
Listen fastlægges i byggefasen af en test, der læser
`information_schema` og fejler, hvis en tabel med `rider_id` hverken
står i funktionens flyt-liste eller i dens bliv-liste — søster til
meta-testen for tvungen RLS. Guardians flyttes ikke: en forælders
kobling er til holdets rytterrække og bekræftes igen af rytteren på det
nye sted (ADR 0011).

### 3.3 Ingen migrering: ejerens egen rytterrække

Indsættelse i `riders` er trænerens, og politikken tjekker ikke
`user_id`; `createRiderIn` tager allerede `userId`. Den personlige
registrering kalder den med `userId = ctx.userId`, navn og fødselsår fra
formularen, og `category_override` tomt, så klassen følger året.

### 3.4 Hvem må oprette et arbejdsrum

`canCreateWorkspace` (ADR 0048) udvides med én regel: en person, der
allerede er på et hold, må oprette **ét** personligt arbejdsrum, og kun
gennem vores egen serverkode (flytningen ud af et hold, afsnit 2.4).
Mekanikken er demoens: en nonce trukket ved opstart, sat som header af
serverkoden og læst i before-hooken på `/organization/create`, så en
browser ikke kan opnå det ved at sende headeren selv. Når driften får
flere instanser (afsnit 5), bliver noncen en HMAC over `BETTER_AUTH_SECRET`
i stedet, så alle instanser kender den.

### 3.5 Handlinger og services

| Flade                                     | Hvor                                              | Hvad                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registerPersonal(headers, input)`        | `src/core/auth/register-personal.ts`              | Zod: navn, e-mail, adgangskode, fødselsår, `forWhom: 'me' \| 'child'`, barnets navn og fødselsår når 'child'. Opretter konto, personligt arbejdsrum, rytterrække, og for 'child' en invitation til barnet. Samme dør (`signupAllowed`) som i dag.                                  |
| `submitAccessRequest` med `kind`          | `src/core/access/service.ts`                      | Ansøgningen får `kind: 'club' \| 'personal'` og `birth_year` (kun 'personal'); godkendelsen laver det rigtige arbejdsrum. Migrering: to kolonner på `access_requests`, uden `org_id` som i dag (ADR 0004).                                                                         |
| `moveHistoryIntoTeamAction(invitationId)` | `src/modules/team/actions.ts` → `history-move.ts` | Rytteren, lige efter accept af en invitation: finder egen rytterrække i det personlige rum og den forberedte på holdet, kalder `move_rider_history`, sletter det tomme personlige rum (Better Auths sletning er slået fra; vi sletter som ejeren gør i dag, gennem samme service). |
| `leaveWithHistoryAction()`                | `src/core/team/actions.ts`                        | Rytteren: opretter personligt rum (3.4), rytterrække, flytter, forlader. Alt-eller-intet i to trin som ADR 0064: fejler flytningen, slettes det nye rum igen.                                                                                                                      |
| `menuFor(role, flags, kind)`              | `src/app/[locale]/(app)/nav-items.ts`             | `kind === 'personal'` giver rytterens menu med planlægning: I dag, Kalender, Mig, Bibliotek; Mere: Sæson, Rulle, Indstillinger, Viden. Ingen Overblik, Ryttere, Holdets uge, Trænerrum, Klubmester.                                                                                |
| `settingsItems(me, kind)`                 | `settings/settings-items.ts`                      | "Holdet" hedder ikke noget; AI og Data står under "Dig"; "Slet min konto" i stedet for "Slet arbejdsrummet". Ingen Arbejdsrum-fane (ingen at invitere, undtagen en forælder fra Mig).                                                                                              |
| `/join/[id]`                              | `src/app/[locale]/(auth)/join/[id]/`              | Ét spørgsmål mere for den, der har et personligt rum: "Tag din træning med over på holdet?" med hvad der flyttes, i to sætninger.                                                                                                                                                  |
| Demo                                      | `src/modules/demo/`                               | `/demo?alene=1` (ADR 0054): en U19-rytter alene med seks ugers træning. Test i `tests/demo`.                                                                                                                                                                                       |

Tekster i `messages/da.json` og `en.json`, i du-form; ordene er
**personligt arbejdsrum** i indstillingerne og ellers bare "din træning".

### 3.6 Tests

- `tests/rls/history-move.test.ts`: kun rytteren selv kan flytte; en
  træner i begge rum kan ikke; en fremmed kan ikke; alt flyttes eller
  intet; revisionssporet har én hændelse pr. tabel på begge rum; en
  tabel med `rider_id` uden for funktionen fejler meta-testen.
- `tests/access/register-personal.test.ts`: under 13 afvises med en
  plain besked; 13–17 får eget rum; en forælder får rum med barnet som
  inviteret rytter; `kind` kan ikke sættes fra en request body;
  `canCreateWorkspace` giver ét personligt rum og ikke to.
- `tests/nav`: menuen for `personal` og for en træner, der også kører.
- `tests/i18n` som altid.

---

## 4. Hvad "som en tjeneste" betyder, og hvad der ikke ændrer sig

Klubberne vil ikke drive Kadence selv; de vil logge ind på
kadence.haij.dk som på TrainingPeaks eller Strava. Det ændrer ikke
dogmerne, det gør dem skarpere:

- **Dogme ét og to holder.** Alt i afsnit 5 kører stadig på én server med
  `docker compose up`. Det, der kommer til, er valgfrit og slået fra som
  standard: en worker-container af samme image, et objektlager, en
  mailudbyder, en connection pooler. En klub, der alligevel vil køre
  selv, får samme kode og behøver intet af det.
- **Dogme fire holder.** Hver ny leverandør er EU-ejet på EU-jord og står
  i `docs/subprocessors.md`, før den tages i brug: Hetzner Object
  Storage (Falkenstein/Nürnberg) til filer og backups, en EU-mailudbyder
  (afsnit 5.4), og intet andet.
- **Dogme tre bliver vigtigere.** Når Haij holder tusind rytteres filer,
  skal eksporten også have filerne med, og sletning skal være lige så
  hurtig som i dag, selv for en stor klub.
- **Dogme seks bliver dyrere.** Revisionssporet og RLS koster pr. række;
  det skal de blive ved med, men ikke mere end nødvendigt (afsnit 5.2).

Og én ting, der ændrer sig juridisk: for klubber er klubben dataansvarlig
og Haij databehandler; for en person alene er Haij dataansvarlig. Afsnit
6 tager det.

---

## 5. Drift, der holder til mange: tre trin

Hvert trin har sin egen PR og ADR, og hvert trin er nyttigt alene. Tallene
i afsnit 5.5 siger, hvornår næste trin bliver nødvendigt. Alt i trin 0 er
uden ny afhængighed.

### 5.0 Trin 0: ret det, der er skrevet til én proces, før flere klubber kommer på

Koden siger fem steder, at den regner med én proces, og det er
rigtigt i dag. Det skal væk, før en anden instans eller en genstart
bliver et problem, og det meste er små ændringer:

| Hvad                                                                            | Hvor                                                                                                           | Ændring                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limits i hukommelsen (ca. 30 kaldesteder)                                  | `src/core/rate-limit.ts`                                                                                       | Samme funktioner, tællerne i en `unlogged` tabel `app_rate_limits (key, count, reset_at)` med upsert; Better Auths egen `rate_limits` får en oprydning i samme sweep. Filen er skrevet til at være den eneste, der skiftes.                                                                                                                                                   |
| Upload-loft i flugt (2 pr. person), DCU-kø og `inFlight`, `ownReads`, test-push | `src/modules/devices/in-flight.ts`, `src/modules/results/{queue,read,own}.ts`, `src/modules/push/test-push.ts` | Samme tabel eller en række i `jobs` (trin 1); indtil da dokumenteret som pr. instans.                                                                                                                                                                                                                                                                                         |
| Demoens nonce og den personlige nonce (3.4)                                     | `src/core/auth/signup.ts`                                                                                      | HMAC over `BETTER_AUTH_SECRET` og dagens dato, så alle instanser kender den.                                                                                                                                                                                                                                                                                                  |
| Puljer uden timeouts                                                            | `src/core/db/client.ts`                                                                                        | `connectionTimeoutMillis`, `idleTimeoutMillis`, `statement_timeout` og `idle_in_transaction_session_timeout` sat pr. rolle i migreringen (`alter role kadence_app set statement_timeout = '30s'`), så en fuld pulje fejler hurtigt i stedet for at hænge.                                                                                                                     |
| Postgres med fabriksindstillinger                                               | `docker-compose.yml`                                                                                           | `command:` med `shared_buffers`, `effective_cache_size`, `work_mem`, `max_connections=60`, `pg_stat_statements`, `log_min_duration_statement=500ms`. Sat til en 4 GB VPS, med en kommentar om, hvad der skrues på ved 8 og 16 GB.                                                                                                                                             |
| Manglende indekser                                                              | `drizzle/0043_indexes.sql`                                                                                     | `activity_files (org_id)`, `ai_calls (org_id, created_at)`, `device_links (org_id)`, `season_plans (org_id, rider_id)`, `push_runs (org_id)`, `comments (activity_id)`, `comments (planned_session_id)`, `riders (user_id)`, `guardians (user_id)` og hver `created_by`/`updated_by`/`author_id`-kolonne mod `users`. I dag skanner en sletning af en bruger femten tabeller. |
| RLS-hjælperne evalueres pr. række                                               | `drizzle/0003`, politikker                                                                                     | `app_is_coach()` og de andre kaldes som `(select app_is_coach())`, så Postgres regner dem én gang pr. forespørgsel. Samme svar, samme tests.                                                                                                                                                                                                                                  |
| Session slås op i databasen ved hver request                                    | `src/core/auth/auth.ts`                                                                                        | Better Auths `session.cookieCache` på (5 min). Udlogning og fjernelse fra et hold virker som før, fordi `stillAMember` stadig læses pr. side.                                                                                                                                                                                                                                 |
| Layoutet kører ti forespørgsler i række før siden                               | `src/app/[locale]/(app)/layout.tsx`                                                                            | Én definer-funktion `app_shell()` giver navn, billeder, roller, indstillinger og ulæste tråde i ét kald; `refreshStaleRaces` flyttes fra navigation til et job (trin 1), indtil da højst én gang i timen pr. hold.                                                                                                                                                            |
| Revisionssporet hex-koder hver fil                                              | `drizzle/0001`, `0003`                                                                                         | `audit_row_change` fjerner `bytes` og `streams` **før** `to_jsonb`; `delete_workspace` slår triggerne fra under kaskaden og skriver én hændelse i stedet; demoens oprydning sletter demoens egne revisionsrækker (den gør det ikke i dag, så de vokser for evigt med `DEMO=on`).                                                                                              |
| Eksporten læser alt i hukommelsen, uden rate limit, med `streams`               | `src/app/api/export/route.ts`, `src/modules/export/`                                                           | Faste kolonner (ingen `streams`), revisionssporet sidevis, rate limit 3 i timen pr. arbejdsrum, og en zip med filerne som eget klik ("Hent dine filer"). Dogme tre: alt kan hentes, også filerne.                                                                                                                                                                             |
| Logs og fejl ses ikke                                                           | `docker-compose.yml`, `src/instrumentation.ts`, `docs/deploy.md`                                               | `logging: json-file, max-size 20m, max-file 5`; et request-id i hver loglinje via `console` som i dag (ingen ny afhængighed); `/api/health` skelner `live` fra `ready` (pulje med timeout); backup-scriptet melder succes til en push-monitor, og deploy-guiden får et afsnit om overvågning (Uptime Kuma på samme VPS, EU, open source).                                     |

Lagring i Postgres bliver ved i trin 0. Det er det, der gør
selvhosting til én compose-fil, og med `bytes` ude af revisionssporet er
prisen en dump, der vokser med filerne. Trin 1 giver et valgfrit
objektlager.

### 5.1 Trin 1: en worker, mail og et valgfrit objektlager (vinteren 2026–27, når de første klubber er på)

**En jobtabel og en worker.** Alt, der i dag kører på `after()`, i et
`setInterval` eller i en hukommelseskø, mister sit arbejde ved et deploy
og kører på hver instans: påmindelser, enhedernes webhooks (udbyderen har
fået sit 200, og intet prøver igen), DCU-læsninger, holdsidens
opfriskning, demoens oprydning, og snart eksport og sletning af store
arbejdsrum. Forslag: en tabel `jobs (id, kind, payload, run_at, attempts,
locked_by, locked_until, done_at, error)` med `for update skip locked`,
og en worker-container af **samme image** (`node scripts/worker.js`),
én instans, med `restart: unless-stopped`. Ingen ny afhængighed; omkring
to hundrede linjer plus tests. Alternativet er `pg-boss`, som giver
gentagelser og tidsplaner ud af kassen, mod en afhængighed; spørgsmål 3.
Selvhosting uden worker virker stadig: uden `WORKER=on` kører appen
jobbene i sin egen timer som i dag.

**Mail gennem en EU-udbyder (P3-05, rykket frem).** Uden mail er hver
adgang et link, et menneske sender ved hånden. Det er fint for tyve
trænere og umuligt for enkeltpersoner, der finder siden selv. Forslag:
SMTP via `nodemailer` (én afhængighed, udbyderneutral) mod en EU-udbyder;
kandidater med EU-ejerskab og EU-drift er Scaleway Transactional Email
(FR) og Brevo (FR). Mails indeholder aldrig noget om træning eller
helbred: bekræft din adresse, nulstil din adgangskode, du er inviteret,
og forældrenes ugeoverblik kun som valg (ADR 0060). Trænerens link (ADR 0032) bliver ved som den vej, der virker uden mail. Række i
`docs/subprocessors.md`, `SMTP_*` i `env.ts` og compose. Spørgsmål 2.

**Et valgfrit objektlager til filer.** `activity_files.bytes` er bytea i
Postgres: hver tur ligger i databasen, i hver dump og på VPS'ens disk 30
gange. Et skøn: 1.000 ryttere × ca. 250 ture × 0,3–1 MB er 75–250 GB om
året. Forslag: en lagringsadapter `src/core/files` med to bagender,
`db` (standard, som i dag) og `s3` (Hetzner Object Storage eller et
hvilket som helst S3-kompatibelt EU-lager), valgt med `FILES_STORAGE`.
Nøglen i databasen bliver `activity_files.storage_key`, bytes bliver
null, og RLS på rækken er stadig det, der afgør, hvem der må hente.
Flytning af gamle filer er et job. Signeringen (SigV4) er omkring 150
linjer og kan skrives selv som FIT-dekoderen og xlsx; alternativet er
`@aws-sdk/client-s3`. Spørgsmål 4. Kvoter følger med: filplads pr.
arbejdsrum (standard 20 GB for en klub, 2 GB for en person), vist under
Indstillinger → Data og i ejerens Installation, og eksport og sletning
tager filerne med.

**Backup, der kan rulle tilbage til et minut.** I dag én dump i døgnet,
30 kopier på appens egen disk, og ingen alarm, hvis den fejler.
Forslag: `pgbackrest` (eller `wal-g`) som sidecar i compose-filen bag en
profil, fuld backup om natten og WAL hvert minut til Hetzner Object
Storage, krypteret som i dag, og dumpen beholdt som den uafhængige kopi.
Restore-øvelsen kvartalsvis står allerede i deploy-guiden; den får et
skript.

**AI-forbrug med pris.** `ai_calls` får `tokens_in`, `tokens_out` og
`cost_micro`; det fælles loft `AI_DAILY_CALL_CAP` (2.000 kald i døgnet
for hele installationen) bliver et loft pr. arbejdsrum pr. måned, så én
klub ikke lukker AI'en for alle. Standard 600 kald pr. arbejdsrum pr.
dag som i dag, og en samlet månedlig budgetlinje i ejerens Installation.

### 5.2 Trin 2: databasen for sig, flere instanser (når 5.5 siger det)

- **Postgres på sin egen maskine** (en anden Hetzner-VPS med egen disk,
  eller en EU-ejet managed Postgres: Aiven (FI) og Scaleway (FR) har
  den), med `pgbouncer` i transaction mode foran. `set_config(…, true)`
  pr. transaktion er allerede skrevet til den tilstand.
- **To eller flere app-instanser** bag Coolifys proxy: kræver trin 0 og
  1, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` sat ens, og holdsidens
  øjebliksbillede og kortet i et delt volume eller i databasen.
- **Revisionssporet partitioneret pr. måned** med en opbevaringsregel,
  som vilkårene nævner (ADR 0003 kaldte det "the known escape hatch").
  Spørgsmål 6: hvor længe skal sporet gemmes; forslag 24 måneder for
  rækker om ryttere, for evigt for adgang og sletninger.
- **Kortets fliser** gennem proxyens cache i stedet for Node pr. flise.
- **FIT-dekodning** i workeren i stedet for i requesten, så en 25 MB fil
  ikke blokerer event-loopet, mens en forbindelse holdes.

### 5.3 Hvad der bevidst ikke gøres

Ingen Kubernetes, ingen Redis/Valkey, før der er en måling, der beder om
det, ingen amerikansk sky og ingen CDN uden for EU. Ingen betaling eller
abonnement i denne plan: kvoterne pr. arbejdsrum (filer, AI, medlemmer)
er det, en betalt udgave senere kan hænge på, og dogme ét tillader den
på samme kode. Spørgsmål 7.

### 5.4 Rækkefølge og afhængigheder

```
Trin 0 (uden afhængigheder) ──► Trin 1: worker ──► Trin 2: flere instanser
                              └► Trin 1: mail ──► afsnit 2.5 dør 2 (selvoprettelse)
                              └► Trin 1: objektlager og kvoter
                              └► Trin 1: pgbackrest
Afsnit 6 (jura) løber ved siden af og skal være på plads før dør 2.
```

### 5.5 Hvornår næste trin: tal, der kan måles

Skøn, ikke målinger; de står her, så vi måler det rigtige. Ejerens
Installation får en linje for hver.

| Mål                                  | I dag      | Trin 1 bliver nødvendigt ved | Trin 2 bliver nødvendigt ved    |
| ------------------------------------ | ---------- | ---------------------------- | ------------------------------- |
| Arbejdsrum (klubber + personer)      | 1 pilot    | 5 klubber eller 100 personer | 25 klubber eller 1.000 personer |
| Filer i databasen                    | under 1 GB | 10 GB                        | 50 GB                           |
| Postgres-forbindelser i brug (af 60) | ukendt     | 30 i spids                   | 50 i spids                      |
| 95-percentil svartid på I dag        | ukendt     | 600 ms                       | 1 s                             |
| Påmindelseskørslen                   | sekunder   | over 5 min                   | —                               |
| Dump pr. nat                         | under 1 GB | 5 GB                         | 20 GB                           |

---

## 6. Jura, før døren åbnes for den enkelte

Ingen kode, men det skal være på plads, før afsnit 2.5 dør 2 åbnes, og
før den første klub ud over piloten kommer på. Det er Martins del;
Claude forbereder udkast.

- **To roller for Haij.** For en klub: klubben er dataansvarlig, Haij
  databehandler, og der skal en databehandleraftale til (A-05).
  Datatilsynets standardkontraktsbestemmelser for databehandleraftaler
  (godkendt af EDPB) er udgangspunktet, med Kadences bilag: hvad der
  behandles, hvor (Hetzner, Mistral EU, mail), og hvordan klubben
  henter og sletter. For en person alene: Haij er dataansvarlig, og
  `/terms` skal deles i vilkår og en privatlivspolitik, der siger det.
- **Hjemmel for helbredsoplysninger.** Check-ins, smerte, sygdom og puls
  er art. 9-oplysninger. For en person alene er hjemlen udtrykkeligt
  samtykke (art. 9, stk. 2, litra a), givet ved oprettelsen med et
  afkrydsningsfelt, der kan trækkes tilbage under Indstillinger → Data,
  og et nej slår check-in og målinger fra og lader resten virke. For
  klubber er det klubbens hjemmel, og aftalen siger det.
- **Alder.** 15 år for eget samtykke (databeskyttelsesloven § 6, stk. 2
  og 3, siden 1. januar 2024); under 15 opretter forælderen (afsnit 2.3). Kilden står ved tallet i
  `src/core/auth/register-personal.ts`.
- **Konsekvensanalyse (art. 35).** Helbredsoplysninger om mindreårige i
  stort tal er efter Datatilsynets liste over behandlinger, der kræver
  en DPIA, tæt på at kræve en. Udkastet skrives som
  `docs/dpia.md`, og Martins rådgiver afgør.
- **Fortegnelse (art. 30)** som `docs/fortegnelse.md`: hvilke
  oplysninger, formål, hjemmel, modtagere, slettefrister.
- **A-08's udkast ligger i `docs/jura/`** (gren `docs/jura`): databehandleraftale
  med bilag, forslag til vilkår og privatlivspolitik på dansk og engelsk,
  DPIA og fortegnelse. DPIA'en konkluderer, at en konsekvensanalyse er
  påkrævet (helbredsoplysninger om børn, GPS sammen med helbred, en
  sprogmodel der læser check-in-flag), men ikke forudgående høring af
  Datatilsynet. Den fandt ni steder, hvor koden ikke holder, hvad `/terms`
  lover; de tre, der kræver kode, bliver story S-13: medlemmers konti
  slettes ikke med arbejdsrummet og ingen kan slette sin egen konto;
  logins skrives i revisionssporet med IP-adresse og browser under
  holdets `org_id`, så trænere kan læse rytteres og forældres IP-adresser
  i sporet og i eksporten; en rytter kan ikke selv slette sin egen
  historik (`erase_rider` er trænerens).
- **Rettelser, der kan laves nu:** `/terms` siger "vi skriver til dig om
  tjenesten", men Kadence sender ingen mail; Mistral-rækken i
  `docs/subprocessors.md` beskriver et søsterprodukts prompts
  ("initiatives, deliverables"), ikke Kadences; backup-lageret har
  ingen egen række; UCI's DataRide læses til holdsiden (ADR 0072) og
  står ikke under kilder. Disse rettes i trin 0's PR.

---

## 7. ADR'er

Næste ledige nummer er 0080 (tjekkes igen før hver PR).

| ADR  | Titel                                                                              | Trin |
| ---- | ---------------------------------------------------------------------------------- | ---- |
| 0080 | A person alone: a personal workspace, the owner who is also the rider              | A    |
| 0081 | The history follows the rider: one definer function moves it between workspaces    | A    |
| 0082 | Kadence as a service: what stays one server, what becomes optional, and when       | 5    |
| 0083 | Counters in the database: rate limits, in-flight work and nonces without a process | 5.0  |
| 0084 | A jobs table and a worker of the same image                                        | 5.1  |
| 0085 | Mail through an EU provider, never about training or health                        | 5.1  |
| 0086 | Files in the database or in an EU object store, behind one adapter, with quotas    | 5.1  |
| 0087 | Who is the controller: clubs, persons, consent and age                             | 6    |

---

## 8. Bølger og skøn

| Bølge | Indhold                                                                                                                         | Str. | Tokens (ca.) | Model     | Afhænger af          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------ | --------- | -------------------- |
| S-01  | Personligt arbejdsrum: `kind`, registrering "mig selv"/"mit barn", rytterrække, menu, indstillinger, demo                       | L    | 600k–1M      | Opus 5.5  | ja til afsnit 2      |
| S-02  | Historikken følger rytteren: `move_rider_history`, ind på holdet, ud af holdet, tests                                           | M    | 400–700k     | Fable 5.1 | S-01                 |
| S-03  | Trin 0: tællere i databasen, timeouts, Postgres-indstillinger, indekser, `(select …)` i politikker, cookie-cache, `app_shell()` | M    | 400–700k     | Opus 5.5  | —                    |
| S-04  | Trin 0: revisionssporet uden filer, demoens rækker, `delete_workspace` uden triggere, eksport i faste kolonner med filer        | M    | 300–500k     | Opus 5.5  | —                    |
| S-05  | Trin 0: logs, health live/ready, overvågning i deploy-guiden, rettelser i vilkår og subprocessors                               | S    | 150–250k     | Sonnet 5  | —                    |
| S-06  | Trin 1: jobtabel og worker, påmindelser, webhooks, DCU og holdsiden flyttet over                                                | L    | 600k–1M      | Opus 5.5  | S-03, spørgsmål 3    |
| S-07  | Trin 1: mail (P3-05): bekræftelse, nulstilling, invitation, forældrenes ugeoverblik som valg                                    | L    | 500–800k     | Opus 5.5  | spørgsmål 2          |
| S-08  | Dør 2: `SIGNUP=individuals`, selvoprettelse med bekræftet adresse, oprydning af ubekræftede                                     | M    | 300–500k     | Opus 5.5  | S-01, S-07, afsnit 6 |
| S-09  | Trin 1: filadapter `db`/`s3`, kvoter, flytning som job, filer i eksport og sletning                                             | L    | 600k–1M      | Fable 5.1 | S-06, spørgsmål 4    |
| S-10  | Trin 1: pgbackrest-sidecar, restore-skript, AI med tokens og pris pr. arbejdsrum                                                | M    | 300–500k     | Opus 5.5  | —                    |
| S-11  | Trin 2: pgbouncer, flere instanser, partitioneret revisionsspor, fliser via proxy, FIT i workeren                               | L    | 800k–1,2M    | Fable 5.1 | S-06, 5.5            |
| A-08  | Databehandleraftale, privatlivspolitik, DPIA og fortegnelse som udkast                                                          | S    | 150–250k     | Opus 5.5  | —                    |

S-01, S-03, S-04, S-05 og A-08 kan starte med det samme og uafhængigt af
hinanden; S-02 lige efter S-01. Hver bølge i eget worktree med egen
database, som rammen i `docs/backlog.md` §0 siger.

---

## 9. Spørgsmål til Martin

1. **Brug alene som i afsnit 2:** personligt arbejdsrum, rytterens menu
   med planlægning, under 13 via forælder, historikken flyttes ved ind-
   og udtræden (ikke deles på tværs). Ja eller ændringer?
2. **Mail:** ja til `nodemailer` som afhængighed og en EU-udbyder? Og
   hvilken: Scaleway Transactional Email eller Brevo (begge FR)? Uden
   mail bliver dør 1 (ansøgning og ejerens godkendelse) den eneste vej
   ind for den enkelte.
3. **Worker:** egen jobtabel uden afhængighed (anbefalet), eller
   `pg-boss`?
4. **Filer:** egen S3-signering (ca. 150 linjer, som FIT og xlsx) eller
   `@aws-sdk/client-s3`? Og er Hetzner Object Storage i orden som lager
   for filer og backups (en række i subprocessors)?
5. **Kvoter:** 20 GB filer pr. klub og 2 GB pr. person som standard, 600
   AI-kald pr. arbejdsrum pr. dag som i dag. Andre tal?
6. **Revisionssporet:** en opbevaringsregel (forslag 24 måneder for
   rækker om ryttere, for evigt for adgang og sletninger), eller alt for
   evigt som i dag?
7. **Betaling:** skal planen tage højde for en betalt udgave (plan pr.
   arbejdsrum, hængt på kvoterne), eller venter det helt?
8. **Rækkefølge:** S-01 først, så Martin har sin egen konto at teste
   med, og trin 0 parallelt? Eller trin 0 først?

---

## 10. Martins svar, 11. oktober 2026

1. **Ja** til afsnit 2: personligt arbejdsrum, rytterens menu med
   planlægning, under 13 via forælderen, historikken flyttes.
2. **Mail: ja**, Claude vælger udbyder. Valget er **Scaleway
   Transactional Email** (Scaleway SAS, Paris; SMTP, EU-datacentre, kun
   transaktionsmail, ingen marketingdel). Brevo er reserven. Rækken i
   `docs/subprocessors.md` skrives, når S-07 bygges.
3. **Ja**: egen jobtabel uden afhængighed, ikke pg-boss.
4. **Ja**: egen S3-signering, og Hetzner Object Storage er i orden.
5. **Kvoter** som foreslået: 20 GB pr. klub, 2 GB pr. person, 600
   AI-kald pr. arbejdsrum pr. dag.
6. **Revisionssporet:** 24 måneder for rækker om ryttere, for evigt for
   adgang og sletninger.
7. **Betaling: ja**, et enkelt gebyr for at drive og vedligeholde
   løsningen. Planen tager højde for det sådan: kvoterne pr. arbejdsrum
   (S-09) og en kolonne `organizations.plan` ('free' | 'paid'), sat af
   ejeren under Installation, er det, gebyret hænger på; selve
   opkrævningen (faktura eller kortbetaling gennem en EU-udbyder) er en
   egen story, S-12, der skrives, når de første klubber er på og tallene
   siger, hvad det koster. Dogme ét: samme kode, intet kun for betalende.
8. **Rækkefølge:** S-01 først, trin 0 parallelt.

Byggeriet starter samme dag: S-01 på `feat/alene`, og S-03, S-04 og S-05
hver på sin gren, hver i eget worktree med egen database. S-02 følger
efter S-01.

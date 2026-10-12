# Kadence — plan til godkendelse: opret dig selv, prøveperiode og priser

Oktober 2026. Planen svarer på Martins input af 12. oktober 2026: en
installation skal kunne sættes op, så en person opretter sig selv og
bruger Kadence med det samme; en prøveperiode med en længde, der kan
sættes, eller ingen prøveperiode, hvor kontoen er gratis, til andet er
bestemt; forsiden skal afspejle det; en simpel, konfigurerbar prismodel
med faktura og bankoverførsel til at begynde med; og en side på
kadence.haij.dk, der siger, hvad det koster. Det er S-12 fra
`docs/plan-alene-og-som-tjeneste.md`, skrevet ud.

Som sidst: planen, skemaet og siderne godkendes først, og derefter
bygges der. Afsnit 8 samler spørgsmålene.

---

## 1. Hvor vi står

- **Dør 2 findes** (ADR 0088): med `SIGNUP=individuals` opretter en
  person fra 15 år, eller en forælder for sit barn, et personligt
  arbejdsrum uden ansøgning. Men personen ser kun `/verify`, til
  adressen er bekræftet, og klubber ansøger stadig.
- **Kvoter og budget pr. arbejdsrum findes** (ADR 0087, 0089): filplads
  og AI-budget, som ejeren kan ændre under Installation. Det er det, en
  plan kan hænge på.
- **Der er ingen plan, prøveperiode, pris eller faktura** i koden, og
  forsiden siger "Ansøg om adgang", uanset hvad `SIGNUP` står på.
- **Mail findes** (ADR 0086, one.com), så en påmindelse før
  prøveperiodens udløb kan sendes.

---

## 2. Beslutninger

### 2.1 Tre indstillinger på installationen

| Indstilling  | Værdier                         | Betyder                                                                                                                                               |
| ------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SIGNUP`     | `closed`, `individuals`, `open` | Som i dag. `individuals` åbner døren for personer; klubber ansøger.                                                                                   |
| `BILLING`    | `off` (standard), `on`          | `off`: alt er gratis, ingen prøveperiode, ingen prisside, ingen fakturaer. Det er selvhosterens og pilotens stilling. `on`: planerne nedenfor gælder. |
| `TRIAL_DAYS` | heltal, standard 30; 0 = ingen  | Hvor længe et nyt arbejdsrum er gratis, før det skal betales. 0 med `BILLING=on` betyder "gratis, til ejeren sætter andet", som Martin beskrev.       |

Alle tre læses i `src/core/env.ts`, sendes videre i `docker-compose.yml`
og står i `.env.example`. `BILLING=on` kræver mail (påmindelser), som
`SIGNUP=individuals` gør i dag.

### 2.2 Brug med det samme, bekræft inden en uge

Dør 2 ændres: en ny person kommer ind i sit arbejdsrum med det samme
og ser en stribe øverst, "Bekræft din adresse inden 7 dage", med en
knap til at sende mailen igen. Efter 7 dage uden bekræftelse lukker
døren som i dag (`/verify` er alt, de ser); efter 30 dage sletter
oprydningen kontoen (i dag: 7 dage). Grunden til at vente med låsen:
den, der vil prøve, skal ikke skifte til sin mail, før de har set noget.
Grunden til at låse alligevel: en adresse, der ikke findes, kan ikke få
"glemt adgangskode", og en konto, ingen kan nå, er en konto, ingen ejer.

### 2.3 Fire tilstande for et arbejdsrum

`organizations.plan` og to datoer:

| Tilstand  | Hvornår                                                                                      | Hvad virker                                                                                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `free`    | `BILLING=off`, eller `TRIAL_DAYS=0`, eller ejeren har sat rummet gratis (pilot, DCU, venner) | Alt.                                                                                                                                                                                                                             |
| `trial`   | Nyt rum med `BILLING=on` og `TRIAL_DAYS>0`; `trial_ends_at` er sat                           | Alt. En linje under Indstillinger siger, hvor mange dage der er tilbage; mail 7 dage og 1 dag før.                                                                                                                               |
| `paid`    | Ejeren har registreret en betaling; `paid_until` er sat                                      | Alt. Mail 14 dage før `paid_until`.                                                                                                                                                                                              |
| `expired` | `trial_ends_at` eller `paid_until` er passeret, og rummet ikke er `free`                     | **Læs og hent ud.** Kalender, ture, check-ins og eksport kan ses og hentes; intet nyt kan lægges ind, ingen AI, ingen upload. En plain besked siger det og viser prisen og kontonummeret. Intet slettes nogensinde af den grund. |

Overgangen til `expired` sker i et dagligt job, aldrig midt i en
request. Et rum, der er `expired`, kan altid eksporteres og slettes af
sin ejer (dogme tre). Kun installationens ejer flytter et rum til `paid`
eller `free`, og kun i databasen gennem en definer-funktion, der tjekker
ejeren, som `set_ai_budget` gør.

### 2.4 Priser som data, ikke kode

En tabel `price_plans` på installationen (uden `org_id`, læses af
alle, skrives kun af ejeren):

| Kolonne            | Eksempel                                 |
| ------------------ | ---------------------------------------- |
| `key`              | `person`, `club`                         |
| `name_da/en`       | "Rytter alene", "Klub"                   |
| `price_year_dkk`   | 290, 1200                                |
| `per_rider_dkk`    | null, 50 (pr. rytter ud over `included`) |
| `included_riders`  | null, 20                                 |
| `ai_budget_micro`  | 5 €, 5 €                                 |
| `file_quota_bytes` | 2 GB, 20 GB                              |
| `vat_included`     | true                                     |
| `valid_from`       | dato                                     |

Prissiden læser tabellen; ejeren retter tallene under Installation →
Priser, og en ny `valid_from`-række er en ny pris, så den gamle kan
læses i fakturaerne. Et arbejdsrums plan er `person` eller `club`
efter `organizations.kind`, medmindre ejeren sætter en anden.

### 2.5 Faktura ved hånden, registreret i Kadence

Til at begynde med laver Martin fakturaen i sit eget regnskabsprogram
(nummerering, moms og bogføring hører til der). Kadence hjælper med
tre ting:

- **En liste under Installation → Betaling**: hvert arbejdsrum med
  tilstand, dage tilbage, pris efter tabellen og antal ryttere, så en
  faktura kan skrives af. Knappen "Registrér betaling" tager beløb,
  fakturanummer, periode (fra–til) og skriver en række i `payments`
  og sætter `paid_until`. Knappen "Sæt gratis" med en grund.
- **Klubbens og personens egen side, Indstillinger → Abonnement**:
  tilstand, hvad det koster for dem (udregnet af tabellen og deres
  antal ryttere), kontonummer og reference til bankoverførsel, og
  betalingerne, der er registreret. Ingen kortbetaling.
- **Mails** uden personoplysninger ud over adressen: 7 og 1 dag før
  prøveperiodens udløb, 14 dage før en betalt periode udløber, og én når
  rummet er sat til `expired`. Går gennem mailsenderen fra ADR 0086.

`payments` har `org_id`, tvungen RLS (rummets ejer læser, ingen i
rummet skriver), audit-trigger, og skrives kun af installationens ejer
gennem en definer-funktion. Beløb i hele kroner, moms som en kolonne.

### 2.6 Forsiden efter `SIGNUP`

- **`closed`** (i dag): "Ansøg om adgang" øverst, som nu.
- **`individuals`**: "Opret konto" er den første knap i toppen og i
  midten; under den står "Er I et hold? Så ansøger I først", med et
  link til ansøgningen. Sektionen "To måder at bruge Kadence" (PR #50)
  får samme knapper: _Alene_ → "Opret konto", _På et hold_ → "Ansøg om
  et hold". Med `BILLING=on` står en linje under knapperne: "Gratis i
  30 dage, derefter fra 29 kr. om måneden. Se priserne." Med
  `TRIAL_DAYS=0`: "Gratis at komme i gang." Med `BILLING=off`: ingen
  linje om pris.
- **`open`** (demo): som i dag.

### 2.7 Prissiden `/priser`

En åben side som `/guides`: to kort, Rytter alene og Klub, med pris pr.
år og pr. måned (årsprisen delt med 12, så begge tal står), hvad der er
med (kalender, pas, ture, check-in, Rulle, AI inden for budgettet,
filplads), hvad der er gratis (unge ryttere alene, trænere og forældre,
pilotvinteren), prøveperioden, og hvordan man betaler (faktura og
bankoverførsel, hvert år forud). En linje om, at koden er open source,
og at en klub kan køre den selv uden at betale nogen, med et link til
GitHub (dogme ét). Siden findes kun med `BILLING=on`; ellers svarer
den 404, og forsiden linker ikke til den. Link i forsidens top og bund
og under Viden og hjælp.

---

## 3. Prisforslag

### 3.1 Hvad det koster at drive

Skøn for det første år med op til 10 klubber og 100 personer:

| Post                                                                                         | Kr. pr. år (ca.)     |
| -------------------------------------------------------------------------------------------- | -------------------- |
| Hetzner VPS (CX32, 4 vCPU, 8 GB)                                                             | 700                  |
| Hetzner Object Storage (filer og backup, under 1 TB)                                         | 450                  |
| Mistral ved AI-budgettet (5 € pr. rum pr. måned er loftet; forbruget er typisk en tiendedel) | 2.000–4.000          |
| Mail (one.com), domæne, overvågning                                                          | 0–300                |
| **Drift i alt**                                                                              | **3.500–5.500**      |
| Martins tid: support, opdateringer, fakturaer (2–4 timer om måneden)                         | det, der skal dækkes |

Infrastrukturen er lille; det, en pris skal dække, er tiden. Ved 20
klubber vokser kun lageret og AI'en mærkbart.

### 3.2 Hvad andre tager

| Tjeneste                      | Pris (ca., pr. person)                        |
| ----------------------------- | --------------------------------------------- |
| TrainingPeaks Premium (atlet) | 20 USD pr. måned, ca. 1.700 kr. pr. år        |
| TrainingPeaks Coach           | fra 19 USD pr. måned pr. træner, plus atleter |
| Strava                        | 11 € pr. måned, ca. 1.000 kr. pr. år          |
| intervals.icu                 | gratis, støtte fra 4 USD pr. måned            |
| Join                          | 12 € pr. måned                                |

Kadences mål er ungdomsryttere og klubber, hvor budgettet er
kontingentet. Prisen skal være så lav, at en klub ikke behøver et
bestyrelsesmøde, og høj nok til, at tjenesten ikke er et tab.

### 3.3 Forslaget (alle priser inkl. moms)

| Plan                                                                                   | Pris                                                                                                                | Med i prisen                                                                                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Rytter alene, ung** (til og med U19, dvs. fødselsår der giver under 19 år i sæsonen) | **Gratis**                                                                                                          | Alt, AI-budget 2 € pr. måned, 2 GB filer                                                                            |
| **Rytter alene, voksen**                                                               | **290 kr. pr. år** (svarer til 24 kr. pr. måned); 30 dages prøve                                                    | Alt, AI-budget 5 € pr. måned, 2 GB filer                                                                            |
| **Klub**                                                                               | **1.200 kr. pr. år for op til 20 ryttere, derefter 50 kr. pr. rytter pr. år**; første sæson gratis for pilotklubber | Trænere og forældre uden begrænsning, alle ryttere, AI-budget 5 € pr. måned, 20 GB filer, holdets uge, Trænerrummet |

Eksempler: en klub med 12 ryttere betaler 1.200 kr. om året, 100 kr. om
måneden. En klub med 40 ryttere betaler 2.200 kr. om året, 55 kr. pr.
rytter pr. år, mod ca. 1.700 kr. pr. rytter hos TrainingPeaks. Ti
klubber af den størrelse og 50 voksne alene giver omkring 36.000 kr. om
året: driften er dækket, og der er 30 timer til Martin til 1.000 kr.

Hvorfor unge alene er gratis: det er dem, Kadence er til, og en
16-årig uden klub skal ikke stoppes af 290 kr. Deres AI-budget er
lavere, så prisen for dem er næsten nul. Hvorfor klubben betaler pr.
rytter og ikke pr. træner: en klub med tre trænere og tolv ryttere
skal ikke betale tre gange, og trænerne er de frivillige.

Alt i tabellen er data (afsnit 2.4), så tallene kan rettes under
Installation uden kode, og en anden installation kan have andre tal
eller ingen.

---

## 4. Skema

Migrering `0052_plans_and_payments.sql`:

```sql
alter table organizations
  add column plan text not null default 'free'
    check (plan in ('free', 'trial', 'paid', 'expired')),
  add column price_plan text null,          -- 'person' | 'club' | ..., null = efter kind
  add column trial_ends_at timestamptz null,
  add column paid_until timestamptz null,
  add column free_reason text null;         -- 'pilot', 'youth', 'operator', ...

create table price_plans (
  key text primary key, name_da text not null, name_en text not null,
  price_year_dkk integer not null, per_rider_dkk integer null,
  included_riders integer null, ai_budget_micro bigint not null,
  file_quota_bytes bigint not null, vat_included boolean not null default true,
  valid_from date not null default current_date, source text
);  -- installationens, tvungen RLS, læses af alle, skrives af ejeren via definer

create table payments (
  id text primary key, org_id text not null references organizations on delete cascade,
  amount_dkk integer not null, vat_dkk integer not null, invoice_no text not null,
  period_from date not null, period_to date not null,
  registered_by text not null, registered_at timestamptz not null default now(), note text
);  -- tvungen RLS: rummets ejer læser; skrives kun af set_payment() (installationens ejer)

-- definer-funktioner, ejer-tjek som set_ai_budget: set_payment(), set_plan_free(),
-- expire_workspaces() (det daglige job), workspace_price() (rummets pris efter tabel og ryttere)
```

`users.self_signup` og `email_verified` bruges som i dag; `/verify`-låsen
får datoen (7 dage) fra en konstant.

## 5. API og sider

| Flade                                          | Hvor                                                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `BILLING`, `TRIAL_DAYS` i env og compose       | `src/core/env.ts`, `docker-compose.yml`, `.env.example`                                                                            |
| `registerSelf` sætter `trial`/`free` og datoer | `src/core/auth/register-personal.ts`; klubber ved godkendelse i `src/core/access/admit.ts`                                         |
| `workspacePlan(ctx)` cached pr. request        | `src/modules/billing/plan.ts`; `requireWritable()` i `runAction` og uploadruterne, så `expired` nægter at skrive med `planExpired` |
| `expire_workspaces` som dagligt job + mails    | `src/modules/billing/jobs.ts` (ADR 0085), skabeloner i `src/core/mail/templates`                                                   |
| Installation → Betaling og → Priser            | `src/app/[locale]/(app)/(narrow)/settings/installation/billing/`, `prices/`; actions ejer-tjekkede i `src/core/admin/actions.ts`   |
| Indstillinger → Abonnement (ejer af rummet)    | `settings/subscription/page.tsx`                                                                                                   |
| `/priser` åben side                            | `src/app/[locale]/(open)/prices/page.tsx`, 404 uden `BILLING=on`                                                                   |
| Forsiden efter `SIGNUP` og `BILLING`           | `src/app/[locale]/page.tsx`                                                                                                        |
| Demo                                           | demoen er altid `free`                                                                                                             |

Tests: RLS på `payments` og `price_plans`; kun ejeren registrerer
betaling; `expired` nægter skrivning i hver indgang og tillader eksport
og sletning; det daglige job flytter de rigtige rum og ingen andre;
prissiden regner klubbens pris rigtigt (12, 20, 21, 40 ryttere); forsiden
i hver stilling af `SIGNUP` og `BILLING`; mailskabelonerne uden
personoplysninger; `tests/i18n`.

ADR 0090: "A price, a trial and an invoice by hand: what a workspace may
do when it has not paid". Dogme ét i ADR'en: samme kode, intet kun for
betalende; `BILLING=off` er standard.

## 6. Bølger og skøn

| Story | Indhold                                                                                                       | Str. | Tokens (ca.) | Model    |
| ----- | ------------------------------------------------------------------------------------------------------------- | ---- | ------------ | -------- |
| S-12a | Skema, tilstande, `expire`-job, `requireWritable`, Installation → Betaling, Abonnement, mails                 | L    | 600k–1M      | Opus 5.5 |
| S-12b | Prisside `/priser`, pristabel under Installation, forsiden efter `SIGNUP`/`BILLING`, brug med det samme (2.2) | M    | 400–600k     | Opus 5.5 |

S-12a først; S-12b oven på den. Begge på `feat/konto-og-priser`.

## 7. Det, der venter på dig uanset koden

- Kontonummer og reference til bankoverførsel (står på Abonnement og i
  mails).
- Fakturaerne laves i dit regnskabsprogram; Kadence registrerer kun, at
  de er betalt.
- Vilkårene får et afsnit om priser, prøveperiode og hvad der sker ved
  udløb (læs og hent ud, intet slettes); rådgiveren læser det med
  (docs/jura).
- Moms: priserne her er inkl. moms; sælger du til foreninger uden moms,
  siger `vat_included` det på fakturaen.

## 8. Spørgsmål

1. **Priserne i 3.3**: 290 kr./år for voksne alene, gratis for unge
   alene, 1.200 kr./år for en klub op til 20 ryttere og 50 kr. pr.
   rytter derover. Ja, eller andre tal?
2. **Prøveperiode**: 30 dage som standard for personer; klubber får
   samme 30 dage, eller første sæson gratis ved din godkendelse (sat
   som `free` med grunden `pilot`)?
3. **Udløb**: læs og hent ud, intet slettes. Ja?
4. **Brug med det samme**: ind straks og lås efter 7 dage uden bekræftet
   adresse (2.2), eller bekræft først som i dag?
5. **Kontonummer**: hvilket, og skal det stå på siden for alle eller kun
   efter login?

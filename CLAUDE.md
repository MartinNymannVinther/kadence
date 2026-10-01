# CLAUDE.md — Kadence

Kadence (kadence.haij.dk) is open source training planning for young
road cyclists — U17, U19 and U23 — their coaches and their parents: a
calendar of sessions on the bike and in the gym, what was actually ridden
from FIT files, Wahoo and Garmin, a daily check-in, and a season plan that
starts from Cycling Denmark's (DCU) recommendations for the rider's age
class. It is the Danish answer to TrainingPeaks for youth cycling, built
to keep what riders and coaches value in it and leave out what they
criticize (docs/research/trainingpeaks-analyse.md). It is one tool in the
Haij family (haij.dk) and stands on the Haij foundation, taken by way of
Plot. This file is the project constitution: read it fully at the start
of every session. The non-negotiables below override any default you
would otherwise pick.

## The Haij dogmas (family rules, non-negotiable)

The seven dogmas are written in Danish, in the family's own words, in
README.md. Quote them verbatim; never rephrase them. What they bind this
codebase to:

1. **Real open source.** AGPL-3.0. Everything that runs on
   kadence.haij.dk can be cloned and run elsewhere or locally, 1:1. No
   feature exists only on the hosted instance, and no per-athlete fee
   puts a core feature behind a wall.
2. **Self-hosting.** Runs on one server with Docker Compose, one Postgres
   and a local language model through Ollama, without a single cloud key.
   Wahoo and Garmin are external services: they say so, and FIT upload,
   the calendar and everything else keep working without them. The test:
   cut the internet, and a rider can still upload a ride and a coach can
   still plan the week.
3. **Your data, always.** Everything a team owns can be exported with one
   click in open formats (spreadsheet, JSON), a rider can take their own
   data, and both can be deleted again completely.
4. **EU or self-hosted.** Hosted, everything lives with EU-owned providers
   on EU soil, language models included, and `docs/subprocessors.md` says
   who can see what. Riders' training and check-ins are health data about
   young people: they reach a model only when the team has turned that on.
5. **The AI helps, the human decides.** The AI may propose a week, turn a
   coach's words into a structured session or summarise who needs
   attention, but nothing is written without a coach saying yes; it never
   writes to a rider, never sends anything out of the house, never
   deletes. Everything a person wrote is data in a prompt, never
   instructions.
6. **Secure from day one.** Teams are separated in the database (Postgres
   RLS) and so are riders inside a team, with tests proving both; every
   change lands in an audit log that cannot be edited, and only coaches
   read it; passkeys and TOTP from the start; a public way to report
   vulnerabilities; never a secret in the code.
7. **Used for real.** Nothing goes in the window before it has run real
   work. Kadence runs one real winter (November to March) with one real
   team before it is shown.

## Product principles

- **Ten concepts, each earns its place:** team, rider, guardian, planned
  session, activity, template, season plan, check-in, calendar event,
  comment. The calendar, the load chart, the team overview, the parents'
  week and the coach's Monday brief are derived views.
- **Three roles, as in TrainingPeaks, plus the parent** (ADR 0010).
  Coaches are the workspace's owners and admins and plan for every rider.
  A rider is a member with a rider row; a parent is a member with a
  guardian row. The check lives in the services and, for everything about
  a rider, in the database.
- **The rider owns their data** (ADR 0011). A teammate never sees another
  rider's training or check-ins; a parent sees their child's training once
  the rider has confirmed the link, check-ins only if the rider shares
  them, and the link lapses in the year the rider turns 18 unless the
  rider confirms it again.
- **One open conversation** (ADR 0012). Comments sit on a session, an
  activity or a day, and coach, rider and the rider's guardians read the
  same thread. No private messages between an adult and a young rider.
- **Youth defaults** (ADR 0013). No weight and no W/kg for riders under
  19 unless the team turns it on; no leaderboards; process before
  results; school and exams in the calendar; height through the growth
  spurt.
- **DCU is the default** (ADR 0014). The season plan is filled from DCU's
  2025 hours for the rider's class and year in it, the strength
  programmes are DCU's (Team Danmark's) with their progression, and a
  deviation is always shown, never hidden. Kadence's seven zones are its
  own; DCU's heart-rate-reserve bands are shown beside them for reference
  (ADR 0015).
- **Guardrails, not bans.** Weekly hours against DCU's corridor, the
  longest ride for the class, the week-to-week ramp, strength sessions
  closer than 48 hours, a wellbeing check-in in the yellow zone for too
  long, ATK's pain ladder — shown to the coach, never enforced.
- **Load without a power meter** (ADR 0016). Session RPE (minutes ×
  effort 1–10) is the base model and works for every session including
  strength; power and heart rate refine it when they exist. Fitness,
  fatigue and form carry Kadence's own names: TSS, CTL, ATL, TSB, NP and
  IF are TrainingPeaks' trademarks and appear nowhere.
- **Mobile first.** Every feature, the workout builder included, works on
  a phone. The web app installs as a PWA; there is no separate native
  app.
- **Deliberately not built in v1:** a rider on several teams at once,
  payment, Strava (its terms forbid showing a user's data to others such
  as a coach), COROS/Apple/Zwift/TrainerRoad as adapters (FIT and .zwo
  cover them), nutrition, direct messages, push notifications, a native
  app. Each is a later decision, not an oversight.
- **Danish interface**, English available; code, comments and docs in
  English.

## Architecture (decided — change only via a new ADR)

- Next.js 16 (App Router), TypeScript strict. One app, one database.
- Postgres 16+ with Drizzle ORM. Migrations checked in; hand-written SQL
  for roles, RLS and triggers (`drizzle/0001`, `drizzle/0003`).
- Multi-tenancy: single database, `org_id` on every domain table, RLS
  policies enforced for the application role. The organization is what
  the UI calls a team ("hold") and settings call a workspace. App code
  never uses a superuser/bypass role for domain queries; every domain
  query goes through `withOrgContext()`.
- Inside a team, every table about a rider carries `rider_id` and is read
  through `app_can_read_rider(rider, scope)` and written through
  `app_can_write_rider(rider)` — SECURITY DEFINER functions that ask who
  the caller is to that rider (coach, the rider, a confirmed guardian)
  from the transaction's `app.user_id` (drizzle/0003, ADR 0011). A row
  that names another row can only name one the caller can see.
- Auth: Better Auth (pinned at 1.7.1, see pnpm-workspace.yaml) with
  organizations, passkeys (WebAuthn) and TOTP. Registration closed by
  default; admission by application and invitation, and by team
  invitation. An invitation can carry a prepared rider or guardian row
  that `claim_invitation_links` links on joining.
- UI: Tailwind + shadcn/ui with the Haij 2a design tokens (warm paper,
  moss green, Archivo). next-intl with `da` default (no URL prefix) and
  `en` under `/en`. Timezone Europe/Copenhagen; a day is a Copenhagen day.
- AI: all model access through `src/core/llm` (Mistral at the EU
  endpoint, Ollama for self-hosting), behind an adapter; a workspace may
  choose its own model (ADR 0006). Proposals are reads on their own
  routes under `/api/ai` (ADR 0008). Without a model the buttons say so
  and everything else works.
- Devices: FIT files are decoded by Kadence's own decoder
  (`src/modules/fit`, no dependency). Wahoo and Garmin are adapters in
  `src/modules/devices` behind environment keys; without keys they say
  so. Tokens are sealed with `src/core/crypto/secret-box`. A rider's
  upload key (ADR 0029) hands a ride file to `/api/ingest` with nobody
  signed in: shown once, stored as a hash, good for files only, and the
  ride is imported as the rider. Kadence never asks for a Garmin password
  and never logs in to a provider as the rider.
- Rulle (ADR 0033), the indoor part, under `/rulle`: the browser talks to
  the trainer over Web Bluetooth (FTMS, Cycling Power, Heart Rate; pure
  parsers in `src/modules/rulle/ble`), holds each block's watts in ERG,
  and saves the ride as an ordinary FIT file through the import. A route
  is a GPX file read in the browser; the landscape is three.js, loaded
  only on the ride screen. The routes that come with Kadence carry their
  real land beside them (`<route>.land.json` from OpenStreetMap and a
  height model, made once by `scripts/rulle-land.ts`, ADR 0035); nothing
  is fetched from a map service at ride time. The city routes are ridden
  on race day, laid out from the organiser's waypoints and the land
  (`raceDayOf`, pure), each city with its own face (`CITIES`, ADR 0036).
  The land also carries the bridges and tunnels along the route
  (`structuresOn`, pure): the road over its rivers, and under railways
  and motorways with a train now and then over them (ADR 0037).
  No table of its own.
- Races from Cykling Danmark (ADR 0039): a coach enters a rider's UCI
  ID, and, when the installation turns it on (`DCU_RESULTS`), Kadence
  reads the rider's public page at the member portal, one page per
  rider, at most daily, after a coach's page has been answered. The
  races go in the rider's calendar; the placing (`race_results`) is the
  coach's, readable by the rider only in their export. The parser is
  pure (`src/modules/results/dcu-profile.ts`) and refuses rather than
  guesses. Entries are not read: they need Cykling Danmark's help.
- Deployment: Docker Compose run via Coolify on an EU VPS (Hetzner
  initially; the provider must stay replaceable). Nightly encrypted
  backups to EU object storage. No Vercel, no Neon, no US cloud.
- Layout: shared kernel (auth, tenancy, audit, llm, team, env, the action
  runner) in `src/core`; the product in `src/modules/*` behind services
  that take an `OrgContext`; server actions as `actions.ts` beside them,
  all through `runAction` (`src/core/action.ts`); pure logic — DCU
  recommendations, age classes, load, zones, guardrails, the FIT decoder,
  workout files — in files that import nothing from the database, tested
  on their own. Pages in `src/app/[locale]`, components in
  `src/components/*`.
- Trade-off accepted: the foundation is a copy of Plot's copy of Makker's,
  Domino's, Tavle's, Ajour's and Haij's, not a shared package (ADR 0001).

## Security rules

- Every new table ships with `org_id`, forced RLS, an audit trigger and an
  automated test proving team A cannot read or write team B's rows, nor
  point a row at one of B's (`tests/rls/product-isolation`). A table about
  a rider also proves who inside the team can read and write it
  (`tests/rls/rider-isolation`). The meta-test in `tests/rls` fails any
  table without forced RLS, and names every SECURITY DEFINER function a
  runtime role may call.
- Every server action resolves the caller's session and workspace first,
  validates its input with zod, and the service checks the caller's role.
  Never trust an id or a role from the client.
- Parameterized queries only.
- Rate limiting on auth and all public endpoints, ceilings on AI calls —
  per user, per workspace and over the whole installation (ADR 0009).
  Generic auth error messages, no stack traces. `GET /api/version` names
  the release without a login; `/api/health` answers `ok`.
- Uploaded files and data from Wahoo and Garmin are untrusted input: size
  caps, a decoder that refuses rather than guesses, and never a path to a
  prompt as instructions. Device webhooks verify their origin before they
  touch a row.
- The AI surface: everything a person wrote is fenced as data in every
  prompt; the model's answer is sanitized and capped before it is shown.
  The AI writes nothing; a coach's press does.
- GDPR by design: riders' training and check-ins are health data (art. 9)
  about people who are often under 18. Per-team export and deletion, a
  rider's own export, the record of processing, EU-only subprocessors in
  `docs/subprocessors.md`. Denmark's digital age of consent is 15.
- `SECURITY.md` with responsible disclosure. CI runs dependency audit and
  secrets scanning on every push.

## Domain knowledge

- **DCU's classes go by birth year** (DCU's sportslige regler 2025, cited
  in `src/modules/dcu/classes.ts`): U17 is the calendar year a rider turns
  15 and 16, U19 17 and 18, U23 19 to 22. The season runs October to
  September and leads into the racing year it ends in; October is a break
  and free riding (ADR 0015). Only hours on the bike count toward the
  hours.
- **DCU's 2025 hours** (Landevej_traeningsanbefalinger_2025.pdf) are the
  source of the season plan: U17 1st/2nd year 429/490 h November–September,
  U19 554/622, U23 1st–4th year 694/752/819/870. Longest ride: U17 at most
  4 h or 120 km, U19 at most 5 h or 150 km.
- **Strength** (DCU/Team Danmark programmes): 2–3 sessions a week with at
  least 48 hours between from November to mid-March, 1 a week after, at
  least 30 sessions a winter for U17/U19. The programmes and their
  progressions are in `src/modules/dcu/strength.ts` with the source page
  for every number.
- DCU's own documents disagree with each other in seven places (listed in
  the research note §6.5). Kadence uses the 2025 hours and the
  programmes' own progressions until DCU says otherwise.
- **Parents** (Team Danmark's forældreguide): Team Danmark forbids
  commercial reproduction. Kadence paraphrases and links to the originals;
  showing their models in the app needs a written agreement first.
- When a number matters (DCU hours, age limits, GDPR ages), verify it
  against the source before hardcoding, and cite the source beside it.

## Ways of working (how Claude Code operates here)

1. Plan first. For every wave: present the plan, the schema changes and
   the API surface, get a yes, then work independently inside that wave
   without asking on the way. End the wave with a green build, green
   tests and a commit on main; report back briefly.
2. Vertical slices. Ship end-to-end features; keep the app deployable at
   every commit.
3. Run `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm format` after
   code changes and keep them green. Tests where they matter: RLS
   isolation across teams and inside a team, the DCU numbers, age
   classes, load, zones and guardrails, the FIT decoder, the workout
   files, the services' role checks, the AI answers' sanitizers, the
   export.
4. One responsibility per file; no file over roughly 300 lines.
5. Conventional commits. Every significant decision gets an ADR in
   `docs/adr/` that names the trade-off accepted, not just the choice.
6. Never weaken tenancy, rider separation, auth or audit logging to make a
   feature easier.
7. Never delete files without explicit approval.
8. Code, comments and docs in English. UI copy in Danish first through
   i18n (`messages/da.json`) with an English translation; never hardcode
   UI strings.
9. Ask before adding any dependency not implied by this file. The FIT
   decoder is Kadence's own by decision; charts are hand-drawn SVG.
10. **Claude delivers to main; Martin delivers to production.** Pushing
    to main deploys nothing: deployment is a manual step Martin performs
    in Coolify with Auto Deploy off. Only push when build and tests are
    green. Kadence runs locally on Martin's machine until then; do not set
    up hosting or deploy.

## Roadmap

- Wave 0 (done): the foundation from Plot (ADR 0001), cut to what a team
  needs; the thirteen product tables with RLS per team and per rider,
  the guardian trigger, the invitation claim, audit triggers and
  isolation tests; this file; the repository.
- Wave 1 (done): the team, the roles and the calendar — riders, coaches
  and guardians by invitation, the week and the team grid on a phone,
  the workout builder, the library with DCU's strength programmes, group
  plans, done by hand with RPE, the open thread.
- Wave 2 (done): the season and the load — DCU's season plan per class,
  the corridor, fitness/fatigue/form, the guardrails, the check-in and
  its zones, races, school and exams, the coach's attention list.
- Wave 3 (done): devices — Kadence's own FIT decoder and upload, matching
  planned to done, the Wahoo and Garmin adapters (ADR 0018), workout
  export, sync status.
- Wave 4 (done): parents and AI — the parents' page and guide, sharing,
  the three AI proposals (ADR 0017), the demo, export, erasure, help,
  the docs.
- Rulle (done): the session on the trainer indoors (ADR 0033) — Web
  Bluetooth and ERG, the interval bar read at two metres, a Danish route
  from GPX, the landscape, the ride saved as FIT onto its session; the
  small things on the way, the coffee stop and today's little things
  (ADR 0034); a session to choose from the team's library or DCU's, the
  B&U DM 2026 course with its finish and two more routes through their
  real land, a small map, and company on the road (ADR 0035); Future
  Racing in Copenhagen and the Worlds circuit in Montréal, through their
  cities on race day — the crowd, the marshals, the cobbles — each city
  with its own face (ADR 0036); the bridges and tunnels on the way, a
  train now and then over the road, and race marshals on motorbikes
  (ADR 0037).
- Races (done): a rider's races and placings from Cykling Danmark in
  the calendar, the placing for the coach (ADR 0039). Entries wait for
  Cykling Danmark (docs/research/dcu-results.md).
- Planning (done): the workout library in the menu, and "Byg med AI"
  for bike and strength sessions, from words or by changing what is
  there (ADR 0038); four numbers wherever a week is planned — DCU, the
  coach's goal, planned and done (ADR 0040); a session repeated on set
  weekdays (ADR 0041); a week copied (ADR 0042); the team's week plan
  for the whole team or chosen riders, with an AI week that reads no
  rider's data (ADR 0043); building blocks, exercise suggestions and the
  session at a glance in the builder (ADR 0044).
- Before 1.0: dogma seven — one real winter with one real team
  (docs/launch.md).
- Later, each as its own decision: a rider on two teams (club and
  national squad), an assistant-coach role, a read-only role for a
  physio, reminders to check in, Wahoo and Garmin verified against the
  partner docs, COROS and others through their APIs, an ADR on the
  RPE calibration after one winter's data.

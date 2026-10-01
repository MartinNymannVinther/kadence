# CLAUDE.md — Kadence

Read this fully at the start of every session. It is short on purpose;
the reasoning behind each decision lives in `docs/adr/`.

## What Kadence is, and for whom

Kadence (kadence.haij.dk) is open source training planning for Danish
road riders in **U17, U19 and U23** and **their coaches** — and, through
the rider, their parents. A calendar of sessions on the bike and in the
gym, what was actually ridden (FIT files, Wahoo, Garmin, Polar), a daily
check-in, and a season plan that starts from Cycling Denmark's (DCU)
2025 recommendations for the rider's class. Rulle rides the session on a
smart trainer indoors. It is the Danish answer to TrainingPeaks for youth
cycling, and one tool in the Haij family (haij.dk).

The seven Haij dogmas in `README.md` are non-negotiable. Quote them
verbatim, never rephrase. In practice: AGPL-3.0 and nothing hosted-only;
runs on one server with Docker Compose and no cloud key; one-click export
and full deletion; EU or self-hosted only (`docs/subprocessors.md`); the
AI proposes, a coach decides, and it never writes, sends or deletes; RLS
between teams and between riders, an append-only audit log, passkeys and
TOTP; nothing is shown before it has run a real winter with a real team.

## The stack, and why

| Piece                                      | Why                                                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 (App Router), TypeScript strict | One app, server-rendered, installs as a PWA on a phone. This Next differs from older ones: read `node_modules/next/dist/docs/` before relying on memory (`AGENTS.md`).      |
| Postgres 16 + Drizzle                      | One database. Separation is enforced **in the database** with RLS, not only in code. Migrations are checked in; roles, RLS and triggers are hand-written SQL in `drizzle/`. |
| Better Auth, pinned at 1.7.1               | Organizations, passkeys and TOTP, self-hosted. 1.7.5 dropped a column we need; lifting the pin is a migration (`pnpm-workspace.yaml`).                                      |
| Tailwind + shadcn/ui, Haij tokens          | The family's look (warm paper, moss green, Archivo). Charts are hand-drawn SVG.                                                                                             |
| next-intl                                  | Danish default with no URL prefix, English under `/en`.                                                                                                                     |
| Mistral (EU endpoint) or Ollama            | Dogma four. All model access goes through `src/core/llm`; without a model everything but the AI buttons works.                                                              |
| Our own FIT decoder (`src/modules/fit`)    | No dependency; it refuses rather than guesses on untrusted files.                                                                                                           |
| three.js                                   | Only on Rulle's ride screen.                                                                                                                                                |
| Docker Compose on an EU VPS via Coolify    | Hetzner today, replaceable tomorrow. No Vercel, no Neon, no US cloud.                                                                                                       |

Changing any of these needs a new ADR. Ask before adding any dependency.

## Run it locally from scratch

Needs Node 22+ (CI runs 22, the image 26), pnpm 10.28 and Docker.

```bash
pnpm install
cp .env.example .env                                   # the defaults work locally
docker compose -f docker-compose.dev.yml up -d --wait  # Postgres 16 on 127.0.0.1:5438, with the runtime roles
pnpm db:migrate                                        # tables, RLS, audit triggers, role logins
pnpm dev                                               # http://localhost:3000
```

Then either register at `/register` (the first account on an empty
installation gets in and becomes its owner; the door then closes), or
seed teams with a coach, two riders and a parent each, password
`kadence-test-2026`:

```bash
pnpm script scripts/seed-test-teams.ts martin
```

What `.env` holds: three database URLs (`MIGRATION_` as superuser for
migrations only, `APP_` for every domain query under RLS, `AUTH_` for
Better Auth), `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, `SIGNUP` (closed),
`DEMO` (off), `LLM_PROVIDER` (none). Everything else — Wahoo, Garmin,
Polar, the map, DCU results — is optional and documented in
`.env.example`. A variable the app reads in production must also be
forwarded in `docker-compose.yml`'s `app.environment`.

Optional: `scripts/fetch-map.sh` fetches the map of Denmark into
`./data/map` (about 500 MB); set the `MAP_FILE` line it prints. To test
from a phone, add the machine's name to `AUTH_TRUSTED_ORIGINS` and
`KADENCE_DEV_HOSTS`.

Port 5438 sits beside the family's other dev databases (Haij 5432 …
Kladde 5437). Other one-off tools are in `scripts/README.md`.

## Tests, and what is green before a commit

```bash
pnpm format       # then:
pnpm lint
pnpm typecheck
pnpm test         # everything, against the database
pnpm test:unit    # the pure logic only, no database, in a second
```

All four must be green before every commit; CI runs the same plus the
production build, both Docker images, `pnpm audit --prod` and gitleaks.
Run `pnpm build` too when you touch config, routes or the Dockerfile.

`pnpm test` drops and rebuilds the schema of a `_test` sibling of the
database in `.env` (`kadence` → `kadence_test`) and refuses to run
against anything that is not clearly a test database. Files run one at a
time. It never calls a model or the network.

Tests that matter most: RLS between teams (`tests/rls/product-isolation`)
and between riders inside a team (`tests/rls/rider-isolation`), the
meta-test that fails any table without forced RLS, DCU's numbers, age
classes, load, zones, guardrails, the FIT decoder, workout files, role
checks in services, AI sanitizers, the export, and `tests/i18n` (every
message key the code uses exists).

## How the code is laid out

- `src/core` — the shared kernel: auth, tenancy (`withOrgContext()`),
  audit, llm, env, crypto, the action runner (`src/core/action.ts`).
- `src/modules/<area>` — the product, behind services that take an
  `OrgContext` and check the caller's role. Server actions sit as
  `actions.ts` beside them and all go through `runAction`.
- Pure logic (DCU, age classes, load, zones, guardrails, FIT, workout
  files, Rulle's physics and parsers) imports nothing from the database
  and is tested on its own.
- `src/app/[locale]` — pages; `src/components/<area>` — components;
  `src/app/api` — routes; `tests/<area>` mirrors the modules.

Rules:

- **One responsibility per file, and no file over 300 lines.** Split
  before you pass it.
- Every new table: `org_id`, forced RLS, an audit trigger, and isolation
  tests; a table about a rider also carries `rider_id` and goes through
  `app_can_read_rider` / `app_can_write_rider`. CONTRIBUTING.md has the
  checklist.
- Every server action resolves the session and team first and validates
  input with zod. Never trust an id or a role from the client.
- Never weaken tenancy, rider separation, auth or audit to make a feature
  easier. Never a secret in the code.
- Everything a person wrote goes into a prompt fenced as data; the
  model's answer is sanitized and capped before it is shown.
- When a number matters (DCU hours, age limits, GDPR ages), check it
  against the source and cite the source beside it.
- Code, comments and docs in English.

## Danish in the interface

- No UI string in code. Danish first in `messages/da.json`, English in
  `messages/en.json`, same keys.
- The words: a team is **hold** (settings call it **arbejdsrum**; the
  code says organization), **træner**, **rytter**, **forælder**, a planned
  session is a **pas**, a ride is a **tur**, plus **check-in**,
  **sæsonplan** and **biblioteket**.
- Write to the reader as **du**, in plain short sentences. Say what
  happens and why, never blame the user, no exclamation marks. When
  something is missing or off, say so plainly and what still works
  ("Der er ingen sprogmodel sat op, så AI'en kan ikke svare. Alt andet
  virker.").
- Fitness, fatigue and form carry Kadence's own names. TSS, CTL, ATL,
  TSB, NP and IF are TrainingPeaks' trademarks and appear nowhere.
- Dates and days are Copenhagen days (Europe/Copenhagen).

## Rulle and the rest

Rulle (`/rulle`, ADR 0033–0037) is the session on the trainer. It has
**no table of its own**:

- It reads the day's session, the rider and their thresholds through the
  ordinary services (`src/modules/rulle/service.ts`), under the same RLS.
  A coach can try a rider's session; that ride is never saved.
- The browser talks to the trainer and heart-rate strap over **Web
  Bluetooth** (FTMS, Cycling Power, Heart Rate; pure parsers in
  `src/modules/rulle/ble`) and holds each block's watts in ERG.
- The finished ride is written as an ordinary FIT file and posted to
  `/api/rulle/ride`, which runs it through the same import as any upload
  (`importFit`) onto its session. Offline, it waits in the browser.
- Routes are GPX read in the browser, with their land beside them in
  `<route>.land.json`, made once by `scripts/rulle-land.ts`. Nothing is
  fetched from a map service while riding.
- **Web Bluetooth needs a secure context — https or `localhost` — and
  works only in Chrome and Edge** (on a computer and on Android). Safari
  and Firefox are told so plainly. Locally, test Rulle on
  `http://localhost:3000`; a phone over a plain-http network name will
  not get Bluetooth.

## How we work

1. **Plan first.** For anything larger than a fix, present the plan, the
   schema changes and the API surface, and get a yes before building.
2. **Work on a branch,** never on `main`: `feat/<name>` or `fix/<name>`.
   Several sessions may share this checkout, so build anything larger in
   a worktree with its own database
   (`git worktree add .claude/worktrees/<name> -b feat/<name> main`).
3. **Vertical slices.** Each commit ships something end to end and keeps
   the app deployable. Conventional commits (`feat(scope): …`).
4. **Pull requests go to Martin.** Push the branch and open a PR with
   `gh pr create`. Nobody merges to `main` themselves — Martin merges.
5. **Martin delivers to production,** by hand in Coolify, with Auto
   Deploy off. A merge to `main` deploys nothing. Never set up hosting or
   deploy. `docs/deploy.md` is his guide.
6. Every significant decision gets an ADR in `docs/adr/` that names the
   trade-off accepted. Check the next free number just before the PR.
7. Never delete files without explicit approval. Ask before adding a
   dependency.

## Where to read more

`README.md` (the dogmas, the product), `CONTRIBUTING.md` (the tenancy
and AI checklists), `docs/adr/` (every decision), `docs/deploy.md` and
`docs/launch.md` (production), `docs/research/` (DCU and TrainingPeaks),
`src/modules/dcu/` (DCU's numbers with their sources).

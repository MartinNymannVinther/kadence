# ADR 0001: Kadence becomes a Haij app on a copy of the Plot foundation

Status: accepted · Date: 2026-09-27

## Context

Kadence is training planning for young road cyclists, their coaches and
their parents: a Danish alternative to TrainingPeaks for the U17, U19 and
U23 classes, with Cycling Denmark's recommendations as the default. The
brief asked for it to be built "after the Haij principles" — the way the
family's other tools are built.

The family has a foundation proven six times over. Haij built it —
Better Auth with passkeys and TOTP, organizations with Postgres RLS
enforced through two confined database roles, an append-only audit log
written by triggers, admission by application and invitation, CI with
dependency audit and secrets scanning, Docker Compose deployed through
Coolify, the 2a design system. Ajour, Tavle, Domino, Makker and Plot each
took a copy of the one before and hardened it. Plot's (commit `964b352`)
is the newest clean copy: Kladde is newer but has grown a runtime and a
document store Kadence does not want.

## Decision

Kadence is a Next.js application on a copy of Plot's foundation, taken at
Plot commit `964b352` with `git archive` and adapted: the same stack
(Next.js 16, Postgres 16, Drizzle, Better Auth, Tailwind + shadcn/ui,
next-intl, pnpm, Vitest), the same tenancy model, the same audit model,
the same admission model, the same demo mechanics, the same
workspace-chosen models, the same design tokens and shell, the same AI
door and roof, the same CI gates and deployment shape.

Every Plot-specific module is removed rather than disabled: the
portfolio, the planning, the overview, the two assists, their pages,
components, tests and migrations. Kadence's own start at 0002 on top of
the untouched foundation migrations 0000 and 0001. Plot's three motion
hooks (`use-run`, `use-flip`, `use-landed`) stay, moved to
`src/components/common`.

The runtime roles are `kadence_app` and `kadence_auth`, the environment
variables `KADENCE_*`, the cookie `kadence-sidebar`, the dev database port
5438 (Haij 5432, Tavle 5433, Domino 5434, Makker 5435, Plot 5436, Kladde
5437), so the family's tools can share one Postgres cluster, one machine
and one browser without colliding.

The name is Kadence, the folder the tool was started in: cadence, the
pedalling rhythm, and the rhythm of a season.

## Alternatives rejected

- **Copy Kladde.** Newest, but its runtime, its document store and its
  publishing surface are the largest things any sibling carries, and
  Kadence would remove most of it.
- **A native mobile app first.** TrainingPeaks' users ask for everything
  on the phone; a responsive app installed as a PWA gives that on one
  codebase, one deployment and one set of tests, and the foundation is a
  web app.
- **Build on an existing open source training platform.** None is Danish,
  none separates riders inside a team in the database, and none knows the
  age classes, the parents or DCU.

## Trade-offs accepted

- **Seven copies of the foundation.** A fix in any sibling's auth, tenancy
  or audit code does not reach Kadence by itself. Bounded, as before, by
  keeping the copied code unchanged where possible and naming the commit
  it came from.
- **A web app on the bike.** A PWA cannot talk to a head unit over
  Bluetooth; sessions reach the device through Wahoo's and Garmin's
  clouds or as a file.

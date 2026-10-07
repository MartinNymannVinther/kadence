# ADR 0067: Exercises and programmes, drawn

Status: accepted · Date: 2026-10-06 · Builds on 0014, 0015, 0032, 0047, 0054 · docs/plan-ovelser-og-programmer.md

## Context

Martin asked on 6 October 2026 for a way to compose a strength or
mobility programme and download it with instructions and drawings, in
the style of a reference app, built dynamically rather than drawn once
as fixed images. His choices, given the same day: both an open page for
anyone and an entry inside the app; the download as one HTML file and
as a PDF; a team's own exercises and programmes in the database from the
start, not a later wave; and Kadence's own colours, light and dark.

A coach already builds a strength session from a catalogue of named
exercises (ADR 0015) and DCU's programmes sit in the library (ADR 0014).
What was missing was the exercise itself, shown: a drawing a rider can
follow without the coach standing next to them, and a programme a coach
can hand out — for mobility after a ride, or for a session with no
coach present at all.

## Decision

- **One contract**, `src/modules/exercises/types.ts`, shared by two
  sources. Kadence's own exercises and programmes live in code
  (`src/modules/exercises/builtin`), with their words in `messages`
  (`exercises.items`, `exercises.programs`) and a source cited beside
  every dose: DCU's and Team Danmark's own material first
  (`docs/research`), then ACSM, NSCA, Lloyd et al. and McGill's "big
  three" where DCU says nothing, and "Kadence's own suggestion" said
  plainly where no source sets one. A team's own live in the database
  (`team_exercises`, `team_programs`, drizzle/0032). A programme mixes
  both kinds through one reference type, `builtin:<id>` or `team:<uuid>`
  (`./ref.ts`), so the catalogue, the library and a strength session's
  exercises can all point at either without knowing which.

- **One geometry, two thin renderers.** A pose — joints in a box 240 ×
  140, hidden limbs, props, up to three arrows — becomes a short list of
  primitives (`figure.ts`); `figureSvg` paints it as a self-contained SVG
  string for the download, and `ExerciseFigure` paints the same list with
  Kadence's tokens in the app. The style is fixed in code, not in a pose:
  stroke 4.5, head radius 10, the far arm and leg at 50% opacity. The
  accent — the arrows, the dose's words — is the `--warning` token, read
  as an accent rather than a warning here: the clay ink of the light
  palette and the warm amber of the dark one, both close to the
  reference drawing's orange and both well past contrast minimums on the
  card. The floor is `--chart-3`, deliberately low-contrast so it places
  the figure and says nothing. No photos: a stick figure means no
  picture of a minor is ever stored or shown.

- **Database.** Every member reads a team's exercises and programmes;
  only coaches write them (drizzle/0032's `app_insert_*` and
  `app_update_*` policies check `app_is_coach()`). The read policy is
  stricter than the library's older tables: it asks the database for a
  live membership row rather than trusting the session's claimed team,
  so a context naming a team the caller has left reads nothing. Every
  command has its own policy, forced RLS, and an audit trigger; both
  tables are exported. **There is no DELETE** — a programme's parts name
  its exercises inside JSON, where no foreign key reaches, so a deleted
  exercise would leave a programme pointing at nothing. A coach archives
  instead; an archived exercise still resolves in the programmes that
  already had it (`resolve.ts`), and a reference that resolves to
  nothing — another team's, one that is simply gone — is left out when a
  programme is read rather than failing it. The JSON itself is validated
  by the application with zod on every write and every read
  (`teamExerciseView`, `readTeamProgram`); the database only checks its
  kind and caps its size.

- **The open page** (`/guides/programs`) keeps a composition in the URL
  only — a compact grammar documented in `compose.ts` — built from
  Kadence's own exercises alone, so nothing is stored about anyone and a
  link never carries a team's own exercise outside the team. The
  download route (`/api/programs/download`) serves one self-contained
  HTML file: no external resource, every piece of free text escaped, a
  `<style>` block with Kadence's colours for both light and dark through
  `prefers-color-scheme`, CSS-only tabs for a programme's parts, and the
  only script a few lines that remember a "Færdig" button's state in
  `localStorage`, keyed to what was downloaded. A team's own programme is
  served only to a signed-in member of that team, 404 for anyone else
  signed in or not, and the route is rate-limited. The PDF is the
  browser's own print of the same file; no library renders one.

- **In the app:** a library tab beside sessions and blocks
  (`library/programs`), a pose editor for a coach's own exercise with six
  base poses derived from Kadence's own (`base-poses.ts`) as a starting
  point — drag or arrow keys, props, arrows, mirror, undo, and an edit
  that would leave the box is simply not kept (`pose-fit.ts`) — and a
  programme builder. "Læg i kalenderen" is a coach's own, through the
  existing scheduler (`schedule.ts`, `createGroupSessionsIn`): a
  programme becomes an ordinary strength session whose exercises carry
  the reference they were drawn from, so the session shows the same
  figures. A reference the strength structure cannot read is dropped
  rather than failing the session, and an old session saved before this
  wave is unaffected — it simply carries none. A dose is written into
  the reps text the strength builder already has (`doseAmount`); the
  session's minutes are estimated at four seconds a repetition, 30
  seconds between sets of the same exercise, 15 seconds between
  exercises (`PACE` in `program-session.ts`) — Kadence's own assumption,
  not a source's, since nothing in `docs/research` times a repetition.
  An exercise's name is drawn and explained in the reader's language;
  while a coach is composing, names stay in the coach's own language, as
  the rest of a session already does.

## Trade-offs accepted

- **A mobility-only programme counts as a strength session** in the
  load and the guardrails, because "Læg i kalenderen" has one target to
  write to. A programme of nothing but stretches adds a small, mostly
  harmless number to a rider's load; splitting a "mobility" sport out of
  strength is a larger change than this wave.
- **A coach cannot truly delete a mistaken exercise or programme**, only
  archive it. The alternative — a foreign key from a programme's JSON
  into a table — is not how JSON works; the archived row stays, unused,
  until the team or the installation is deleted.
- **The pose editor's canvas captures touch scrolling** while a joint is
  dragged, as any drag-to-move editor on a phone must; a coach drawing
  on a phone scrolls the page from outside the canvas.
- **The downloaded file's colours are copies of the theme's values**
  (`FIGURE_PALETTE`), not a read of `src/app/theme.css` at build or
  request time. A test (`tests/exercises/figure.test.ts`) holds the two
  sides to the same numbers; a theme change that forgets this file keeps
  the download looking as it did.

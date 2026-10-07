# ADR 0057: Focus for the first winter — five parts behind installation flags

Status: accepted, amended the same day and on 7 October (the proxy answers 404) · Date: 2026-10-06 · Amends ADR 0045, 0047, 0051, 0052 and 0054

## Context

The review of `main` on 5 October 2026 (docs/plan-fokus-vinter.md) found
the core sound, and the product grown wider faster than deeper. Nothing
in it has yet run a real winter with a real team, which is what dogma
seven asks for before anything is shown:

> Intet af det vi selv har bygget kommer i vinduet før det har kørt
> rigtigt arbejde, hos os selv eller hos en kunde vi sidder tæt på.

The aim for the first winter is narrow: a coach lays the team's week in
five minutes on a phone, and a rider spends twenty seconds a day. Five
parts sit outside that aim:

- **Trænerrummet** (ADR 0052), a room for coaches across clubs, which
  needs many clubs before it is worth opening;
- **the club championship** (ADR 0051), which a club runs once a season;
- **the energy calculator** (ADR 0047), among the open guides, in the
  form ADR 0056 gave it: energy advice for the day, for a class;
- **the food guide** (ADR 0047), which is health advice about minors and
  waits for a sports dietitian to read its section on low energy
  availability;
- **Rulle's world** (ADR 0034–0037, 0045, 0046): the land, the towns, the
  people, the sound under the ride, the cheat code and the developer's
  warp, behind a session that works without any of it.

Martin said on 6 October "lav alle rettelser i planen". The plan's
recommended choices were built, and each can be turned at the review.

Three ways were open: delete the five, leave them on, or park them.

## Decision

- **Park them behind installation flags, off by default.** Five
  variables, each `off` or `on`, read on the server only
  (`src/core/features.ts`); a client component gets the answer as a prop.

  | Variable            | Feature            | While it is `off`                                         |
  | ------------------- | ------------------ | --------------------------------------------------------- |
  | `COACHES_ROOM`      | `coachesRoom`      | `/coaches` answers 404, its actions are refused, no count |
  | `CLUB_CHAMPIONSHIP` | `clubChampionship` | `/club` answers 404 for every team, whatever it chose     |
  | `CALC_ENERGY`       | `energyCalculator` | `/calculators/energy` answers 404, the hub leaves it out  |
  | `GUIDE_FOOD`        | `foodGuide`        | `/guides/food` answers 404, the hub leaves it out         |
  | `RULLE_WORLD`       | `rulleWorld`       | Rulle is the session alone                                |

- **One switch hides it everywhere at once:** the menu, the page (404,
  `notFoundWithout`), the server action behind it (refused as not found,
  `runFeatureAction`, after the session and team are resolved as every
  action's are), and the demo. Nothing is deleted. The code stays and
  keeps compiling, the rows stay in the database, and the export carries
  what it carried before (a club's championship included).
- **Trænerrummet:** the unread count the menu shows is 0 while the room is
  off, so a coach is never pointed at a page that is not there.
- **The championship:** the installation's flag sits above the team's own
  setting (`championshipOn` in `src/modules/club/switch.ts`). While it is
  off, every read answers as if the team had it off and every write is
  refused; the team's setting stays in the database untouched and counts
  again the day the flag is on.
- **The open guides:** the hub lists only what is on, and the card that
  leads to it from help and the parents' page names only those topics.
- **Rulle, the session alone.** Without its world Rulle keeps the strip of
  controls, the three numbers, the session's bar large across the middle
  of the screen, ERG on the trainer, the pulse strap, the recording, the
  ride saved through the ordinary FIT import, the ride kept offline, and
  the beeps that count down a block. It leaves out the three.js scene
  (its chunk is never requested), the choice of route and land, the
  sound under the ride, the cheat code, the developer's warp, the people,
  and the little things the landscape showed; "every block on target"
  stays, because it is about the session. The engine rides a flat 20 km
  loop made in memory (`flatCourse`), so speed and distance in the file
  come from the same physics as before, on a road with no hills.
- **Devices** (Settings → Enheder): only the providers this installation
  has keys for are listed; with none, one sentence says that rides come
  in as files and that it works just as well. Upload keys sit under
  "Avanceret". Garmin's text no longer promises sessions in Garmin
  Connect's calendar: that path needs Garmin's partner keys, the
  programme is closed to new partners (docs/research/garmin-without-partner-access.md),
  and the push is unverified against Garmin's partner documentation. The
  cable (ADR 0031) is named instead, because it works without keys.
- **The demo follows the flags** (amends ADR 0054). The championship, and
  the team setting that shows it, are seeded only when
  `CLUB_CHAMPIONSHIP=on`; Trænerrummet's example threads only when
  `COACHES_ROOM=on`.
- **`DCU_RESULTS` stays as it was** (ADR 0039). It is not one of these:
  it waits for an external service's yes rather than for a winter, and it
  already has its own three values, including one rider at a time.
- **The tests pin the five off** (`vitest.config.mts`), as a new
  installation has them, and turn one on with `vi.mock("@/core/features")`
  where a test exercises a parked part. Each gate is proven both ways in
  `tests/core/feature-gates.test.ts` (the pages) and
  `tests/core/feature-actions.test.ts` (the actions), and the demo is
  built both ways.

## Trade-offs accepted

- **Code carried and kept compiling, unseen.** Lint, typecheck and the
  tests keep running over five parts nobody sees, and a change to a
  shared service must keep them working. That is the price of bringing
  one back with one variable instead of a revert, for work that was asked
  for and may well return after the winter.
- **The demo shows less.** ADR 0054's "every part of the product" no
  longer holds by default. A demo installation can turn the flags on, and
  the demo follows.
- **One switch per installation, not per team.** A club on a shared
  installation cannot have Trænerrummet while another does not. The
  championship keeps its own team setting under the flag; the others did
  not need one.
- **A product switch, not a security boundary.** The flags are held in the
  application — pages, actions, the championship's services and the
  unread count — and not in the database. RLS decides who may read and
  write the rows exactly as before, flag or no flag.
- **A flat road under the session alone.** Without the land, the speed and
  distance written into the file are a flat road's. They were virtual
  before too; now there is no hill to make them vary.
- **What brings them back is decided after the winter**, by the three
  numbers in the plan: riders who check in at least four days a week,
  sessions with a receipt, and a coach's minutes a week spent planning.

## Amended the same day: on by default

Once PR #21 was on main, Martin found the energy calculator and Rulle's
maps and routes gone from his own installation, and chose to have all
five parts on by default. The flags stay: each is now `on` unless an
installation sets it to `off`, so parking a part is still one variable
away, and the gates, the demo's two ways and their tests are unchanged.
The food guide is shown by default too; its section on low energy
availability still waits for a sports dietitian (backlog A-01), and
`GUIDE_FOOD=off` holds it back until then.

What changes in the trade-offs above: the demo shows every part again
(ADR 0054 holds by default), and a new installation sees all of Kadence
unless its owner parks something.

## Amended 7 October: a parked page answers a real 404

"`/coaches` answers 404" above was true of the page and not of the
response. Under `(app)/(narrow)` a `loading.tsx` wraps every page in a
Suspense boundary, and the response starts streaming the moment that
fallback renders — before the page's `notFound()` runs. A stream that
has started is a 200 whatever is thrown afterwards; Next writes the
not-found page into it with a `noindex` tag and calls it a soft 404
(node_modules/next/dist/docs, `loading.md`, "Status codes"). Search
engines were kept out; monitoring and anyone reading the status were
told the page was there. Backlog P2-09.

The docs name the fix: check before the response streams, in the proxy,
and rewrite to a not-found route. `src/proxy.ts` now asks
`parkedPath(pathname, features())` (`src/core/features.ts`) first, and
for a parked part's page — `/coaches` and under it, `/club`,
`/calculators/energy`, `/guides/food`, each with or without `/en` —
rewrites the request to `/<locale>/parked/<path>`, which no page
matches, so the catch-all in `[locale]/[...rest]` renders the localized
not-found page with a real 404. The same page a visitor saw before, the
right status, no session read, and no login redirect for a page that is
not there. A per-route layout would not have done it: it sits under the
same loading boundary. `notFoundWithout` stays in every parked page as
the second lock, and its tests stand.

Two things pin it: `tests/core/features.test.ts` for the decision —
each parked path and everything under it, its own flag only, a segment
and not a prefix — and `tests/core/proxy.test.ts` for where the proxy
sends the request, with next-intl's middleware stood in for because its
ESM build does not load outside Next's bundler. The status itself is the
built app's and is checked by hand: `COACHES_ROOM=off CLUB_CHAMPIONSHIP=off
CALC_ENERGY=off GUIDE_FOOD=off pnpm start -p 3134` after `pnpm build`,
then `curl -sI http://localhost:3134/club` and the three others answer
`HTTP/1.1 404`; with the flags on, `/club` answers 307 to `/login` and
`/calculators/energy` 200. Rulle's world has no path and nothing changes
for it.

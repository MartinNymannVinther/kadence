# ADR 0093: A month and a season in the calendar — links, the season from October, sums in SQL

Status: accepted · Date: 2026-10-12 · Builds on 0011, 0016, 0018, 0026, 0040, 0049, 0057, 0059, 0062, 0077, 0091, 0092

## Context

Martin, 12 October 2026: "der skal være mulighed for et måneds og års
overblik i kalender". The calendar showed one week at a time — one
rider's, or the team's grid for a coach — and its "Gå til" popover could
only jump to a week. A coach planning a winter, a rider looking towards
a race in May and a parent asking how November went all had to step
week by week, and the only longer view, the season page, is the plan's
editor, not the calendar.

The week stays the place a week is planned and read in detail (ADR
0059, 0062): sessions are dragged, opened, commented and copied there.
What was missing was the step back: the month as weeks, and the season
as months.

## Decision

- **Three scales, as links.** A segmented switch in the calendar's
  header, **Uge · Måned · År**, each a link, so the back button and a
  shared address know them. The week keeps its addresses
  (`?week=`, `?rider=`, and `?view=team` for the team, which older links
  say); the month is `?view=month&month=2026-11` and the year
  `?view=year&year=2026`, with `team=1` for a coach's team. One builder
  (`calendarHref`) writes them all, so every link keeps the others'
  choices: the rider, the team, an open session's panel (`?session=`
  works on every scale). Switching scale opens on the week, month or
  season that holds today when the one shown does, otherwise the one
  the shown range starts in (a week by its Thursday, as ISO counts it).
  No client state: the server renders each scale.
- **The year is the season, October to September**, labelled "Sæson
  2026/27", not the calendar year. The season plan (ADR 0014), DCU's
  hours, its October break and the senior profiles (ADR 0091) all count
  that way; a calendar year would cut every season in two and put the
  break in the middle. `year=2026` names the season whose October is in 2026.
- **The month, one rider:** a Monday-first grid of the month's weeks,
  the days of the months either side dimmed but filled. A day shows its
  events as thin bars, its sessions with sport and minutes in the load
  model's colours (as the week's cards: done, off plan, missed, still to
  ride), and the rides nobody planned; today is marked. Each day is one
  link — to the session's panel when it holds one session, otherwise to
  its week with the day scrolled into view (`#day-…`) — with its
  content said in words for a screen reader. Each week ends in its hours
  on the bike in the four numbers' bar (ADR 0040), the paradigm's
  corridor with it when the team plans by one. On a phone each week is a
  row of seven small days with dots and its total under it.
- **The month, the team:** riders as rows and days as columns, a dot per
  session — filled when ridden, hollow while still to ride, in the load
  model's colours — a dot for a ride without a plan, a trophy for a
  race, and an empty cell for a day of rest; the team's own races in the
  header; the month's hours on the bike at the row's end. A name opens
  the rider's month. Inside one screen width on a desktop; on a smaller
  screen the table scrolls sideways inside itself with the names held.
- **The year, one rider:** a line on the season so far — hours ridden
  against the season plan's hours to today (or the paradigm's without a
  plan; nothing in October's break) and the plan's whole season — then
  twelve months, each with a small hand-drawn SVG bar drawn as the
  season chart draws it (the plan as a bar, the calendar's hours as an
  outline filled by the ridden, the paradigm's month as a dark tick),
  the numbers written beside it, the sessions done of planned, and the
  races and camps by date. A month opens its month view. A link leads
  to Sæsonplan: the year is an overview, and the plan is changed where
  it always was.
- **The year, the team:** riders as rows and months as columns, each
  cell the month's hours ridden, tinted with an arrow or a tick — and a
  word for a screen reader — by where the month is heading (ridden plus
  the sessions still to ride) against the season plan, within a tenth
  or half an hour as the volume bar says it, or the paradigm's corridor
  without a plan. A month not begun shows the hours put in, quietly. The
  team's races stand above their month.
- **Sums in SQL, a fixed number of queries.** One aggregate query
  (`bikeTotalsIn`) sums, by rider and by month or ISO week, the bike
  minutes put in, the bike seconds ridden, the minutes still to ride
  and the sessions of every sport planned and done — a `union all` of
  the sessions and the activities, grouped in the database. The riders'
  season frames (riders, plans, the team's paradigm) are three queries
  for any number of riders (`framesIn`, shared with the week's four
  numbers). Each view reads in one transaction: the team's month in
  seven reads, the team's season in five, one rider's month in eight
  (the month's weeks and the month are summed apart) and season in five
  — the same for a team of two and of twenty, which a test counts.
  Nothing is read row by row per day or per rider. Only the month's
  days, which the grid draws, are read as rows.
- **Under RLS as everywhere.** The new reads are ordinary queries as the
  application role inside `withOrgContext`: a rider gets their own hours,
  a parent the child who has confirmed them and nothing before, a coach
  the team. No new table, policy or function.
- **Kadence's words.** Hours, the four numbers and the colours keep the
  names the week uses; none of TrainingPeaks' terms. The parked parts
  (ADR 0057) stay as they were.

## What is left to the week and the season page

Moving, copying, adding and deleting sessions, the session's panel with
its comments, the week's strength count and all-sport total, the team's
signals and attention list (ADR 0062), race results from Cykling
Danmark (ADR 0039), and editing the season plan, its phases and its
intensity weeks (ADR 0053). The month and year views link to them.

## Trade-offs accepted

- **A long matrix scrolls.** Thirty-one days and a name do not fit a
  phone; the team's month scrolls sideways inside its frame rather than
  becoming a list per rider, which would lose what a matrix is for.
- **Week totals on the bike only.** A month's week row shows the four
  numbers (bike hours, as DCU counts them), not the week's all-sport
  total and strength count, which the week view keeps.
- **One more query for one rider's month** (weeks and month summed
  apart) rather than summing days in JavaScript; the count stays fixed.
- **Rows for the month's grid.** The days are drawn from the month's
  sessions, rides and events read as rows (about six weeks of them), as
  the week reads its seven days; only the totals are summed in SQL.
- **October stands against nothing** in the team's season when the plan
  follows DCU: DCU's October is "pause og frit", so there is no number to
  be under or over.
- **No component render tests.** The project has none; the pages stay
  thin, the shaping is pure and tested (`month-days.ts`, `grid.ts`,
  `href.ts`, `standing.ts`), the reads are tested against the database
  under RLS, and the pages were smoke-tested by hand as coach, rider and
  parent.

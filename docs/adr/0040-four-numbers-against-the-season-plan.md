# ADR 0040: Four numbers against the season plan — DCU, goal, planned, done

Status: accepted · Date: 2026-10-01 · Builds on 0014, 0015, 0025

## Context

A coach planning a week for one rider or several needs to see what the
planning adds up to against the season. Kadence had the pieces apart: the
season page set the coach's monthly hours ("Plan") beside DCU's and what
was ridden ("Kørt"); the calendar's week set planned and done against
DCU's corridor, never against the coach's own plan; and what was in the
calendar was counted nowhere beside the season. "Plan" on one page and
"planlagt" on the other meant two different things.

## Decision

- **Four numbers, one meaning each, wherever planning happens:**
  - **DCU** — DCU's hours for the class-year, with the corridor round them
    (±20 %, Kadence's reading, ADR 0015);
  - **Mål** (goal) — the coach's season plan;
  - **Planlagt** (planned) — the bike sessions in the calendar;
  - **Udført** (done) — what was actually ridden.

  The season page's "Plan" is now "Mål" and "Kørt" is "Udført". Only hours
  on the bike count, as DCU counts them.

- **One derivation for any range** (src/modules/season/volume.ts, pure): a
  day carries its month's hours over the month's calendar days, as
  `weeklyCorridor` already did for DCU, and the coach's months are spread
  the same way. A week, a month and a season to date are sums of their
  days; a range across 1 October reads each day in its own season.
- **The plan's basis is DCU's side.** A coach who plans a rider from
  another class-year has chosen what the plan is measured against; a
  rider without a plan is read from the birth year.
- **Expected is done plus what is still planned from today**, and it is
  what the corridor's word ("inden for", "over", "under") and the
  distance to the goal are said about — for a week ahead that is the
  plan, for a week behind it is what was ridden.
- **One picture, a bullet bar** (src/components/season/volume-bar.tsx):
  DCU's corridor as the band, the goal as an upright marker, planned as an
  outline and done filling it, every value also written out with a key
  drawn like its mark. In the calendar's week for a rider (with the
  week's strength sessions against DCU's two or three, or one), in each
  row of the team's week (under the name on a phone), and on the season
  page: month by month, in the chart, and a coach's "Hele holdet" with
  every rider's month and season so far.
- **No new table.** The numbers are read from the season plans, the
  planned sessions and the activities, under RLS: a rider gets their own,
  never a teammate's.

## Trade-offs accepted

- **No goal for part of a range.** A week across 1 October where the new
  season has no plan shows "intet eget mål" rather than the September
  days' share: a number for part of the range would read as the whole.
- **The calendar's numbers are the server's.** The bar is read with the
  page and refreshed after every change, not recomputed in the browser
  while a session is dragged; the hours line above it still is.
- **Planned counts what is in the calendar, done or not.** A session
  planned and skipped stays in "Planlagt"; "Udført" and the expected
  hours tell the difference.

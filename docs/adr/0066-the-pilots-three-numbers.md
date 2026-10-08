# ADR 0066: The pilot's three numbers

Status: accepted · Date: 2026-10-06 · Part of docs/plan-fokus-vinter.md, "Efter vinteren" · Backlog P1-04 · Amends ADR 0048 (the installation's overview)

## Context

Dogma seven says nothing goes in the window before it has run a real
winter with a real team. The focus plan lets three numbers decide what
comes back after that winter: the share of riders who check in at least
four days a week, the share of sessions with a receipt, and the coach's
minutes a week spent planning. Martin and the pilot team's coach need to
see them every week, and P3-01 will lay them beside the parts ADR 0057
parked. Until now Kadence counted none of them.

## Decision

**What is measured.** A week is a Copenhagen week, Monday to Sunday.

- **The week's riders** are the team's riders whose row a coach created
  on or before the week's Monday (a Copenhagen day) and who are not
  archived. A rider who joins in the middle of a week counts from the
  next one, so nobody is short of days they could not have had. A rider
  who has not signed in yet counts: the share is of the team, not of
  those who already use Kadence.
- **Check-in:** of the week's riders, those with a check-in on at least
  four different days of the week.
- **Receipt:** of the week's riders' planned sessions dated Monday up to
  and including yesterday (or Sunday, for a week that has ended), those
  with a linked activity. "Udført" makes an activity and links it, the
  RPE is said on that activity, and a ride that lands links itself, so
  the three kinds of receipt are one column.
- **Planning minutes:** the audit log's rows for `planned_sessions`,
  `training_blocks`, `training_block_items` and `season_plans` whose
  actor is one of the team's coaches (an owner or admin now). Each
  coach's rows, by time: a pause under ten minutes keeps them in one
  stretch; a stretch lasts from its first row to its last and counts at
  least two minutes. The coaches' stretches are added together and
  rounded to whole minutes once. A stretch across midnight between Sunday
  and Monday is split by the Copenhagen day.

**Who sees what.**

- **The coaches** see their own team's last eight weeks on Indstillinger
  → Holdet, this week first and marked "i gang" (check-ins up to today,
  sessions up to yesterday). A small table with a thin bar per share,
  tokens only, with what each number counts written underneath; the
  minutes are called a rough estimate meant to help, never a judgement.
  Nobody else on the team gets the card; the service answers null.
- **The installation's owner** sees the three numbers per club for the
  last full week on Indstillinger → Installation, as counts from
  `platform_overview()`. Never a name of a person, a rider, a check-in or
  anything an audit row says about what was written. Demo workspaces
  stay out, as before.

**How it is read.**

- The arithmetic is one pure function, `src/modules/insight/pilot-numbers.ts`,
  tested on its own. `pilot-service.ts` feeds it as the coach, under the
  ordinary policies. The coaches already read their team's audit log
  (`app_select_audit`: the active team and `app_is_coach()`, drizzle/0003),
  as well as its riders, check-ins, sessions and members, so **no new way
  into the data** was needed. Each read takes only what the numbers need:
  a check-in is a rider and a day; an audit row is who, which table and
  when, never the before and after.
- `platform_overview()` (drizzle/0031) computes the same for the last full
  week in SQL. Its result columns change, which `CREATE OR REPLACE` cannot
  do, so the migration drops it and creates it again, with the guard
  (only the installation's owner), the fixed search_path and the grants of
  drizzle/0019. The test pins its exact column list, so a new column is a
  decision.
- The two implementations are held to one answer by
  `tests/insight/pilot-overview.test.ts`, which seeds a team and compares
  the coach's last full week with the owner's row.
- Nothing is stored. The numbers are computed when they are read, so P3-01
  can compute any earlier week again from the same data.
- **The demo** shows the card: its riders' rows are dated to the first
  week it plans, as a team in full swing would have. Its audit log is not
  made up, so the minutes are the seeding itself, this week.

## What is not measured

- How a rider is: no answer from a check-in, no zone, no pain, no RPE
  value, and no number about one rider anywhere.
- Whether a session was ridden as planned: duration and intensity do not
  matter, and a ride on the day that is not linked to the session is not
  a receipt.
- Planning outside a save: reading the plan, thinking, talking to riders,
  paper and chat. Changes to the library, the calendar's events, comments
  and the team's settings are not planning here.
- Parents, and riders' own sessions (a rider's change is not a coach's).

## Why minutes from the audit log, and how rough they are

The audit log is the one record of when a coach worked that already
exists. Measuring time any other way means a timer, page tracking or a
question to the coach every week — new tracking of people, a new table,
or a chore that is answered unevenly. The log costs nothing more and is
already append-only.

It is rough, and the card says so:

- **It undercounts reading.** Half an hour with the plan open and one save
  is two minutes.
- **It can overcount an open tab.** Saves less than ten minutes apart for
  an hour are an hour, even with a phone call in between.
- **A big change is one moment.** Copying a week or laying in a block
  writes many rows in one transaction with one timestamp, and counts like
  a single save.
- **Ten and two minutes are assumptions,** not measured. A coach who does
  "Udført" for a rider is planning by this definition.

So the minutes are a trend for one team over the winter, not a time sheet,
and not a figure to compare coaches by. A single week may well be off by
half; the direction over weeks is what P3-01 needs.

## Trade-offs accepted

- **Archived riders leave every week.** Kadence does not record when a
  rider was archived, so an earlier week can change after the fact. The
  alternative, reading the archiving from the audit log, would tie the
  numbers to rows that `erase_rider` purges.
- **Former coaches leave the minutes.** Only today's owners and admins
  count; a coach who has left takes their past stretches along.
- **Two implementations.** TypeScript for the card (eight weeks, a week in
  progress) and SQL for the owner (every club in one call, without an org
  context). The equality test is the guard; changing a definition means
  changing both files and the ADR.
- **Small teams.** With one or two riders a share is close to a person. It
  still says only whether Kadence was used, never what anyone answered,
  and the owner already sees each club's name and counts (ADR 0048).
- **The owner's overview reads the audit log across tenants,** inside the
  definer function and only as a number per club. The owner never sees a
  row.
- **Every team's coaches see the card,** not only the pilot's. It is the
  team's own data, and it helps a coach see how the team uses Kadence.

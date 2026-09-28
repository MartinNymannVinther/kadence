# ADR 0024: Process goals, counted from what was done

Status: accepted · Date: 2026-09-28 · Builds on 0013

## Context

ADR 0013 says process before results, and the coach guide (ADR 0021)
says the same in DCU's and Team Danmark's words. Kadence had nowhere to
write a process goal down: "30 strength sessions this winter" lived in
the coach's head, and TrainingPeaks' answer — goals tied to a race
result — is the thing ADR 0013 keeps out.

## Decision

- A `rider_goals` table: a title, a kind, a target, a period. The kinds
  are things done — strength sessions, rides, hours on the bike, long
  rides, or a count kept by hand — never a watt, a place or a weight.
- **Progress is read, not stored**: counted from the rider's activities
  in the period every time a page shows it, so nothing is counted twice
  or left stale, and a deleted ride takes its count with it. A goal kept
  by hand is the one exception, bumped by the rider or the coach.
- **The one goal Kadence proposes** is DCU's: at least 30 strength
  sessions from 1 November to 15 March for U17 and U19
  (`src/modules/dcu/strength-frequency.ts`). It is offered as a press,
  never created unasked; the demo presses it for its riders.
- The same security as every table about a rider (drizzle/0011): forced
  RLS, whoever may read the rider's training reads the goals, the coach
  and the rider write, every change audited, and the isolation tests
  prove both. Exported with the rest ("Mål").

## Trade-offs accepted

- **Counting on every view** costs a query over the goal's period; a
  rider has a handful of goals over a season, so it is cheap, and it is
  always right.
- **A race is not a goal here.** A rider who wants "top ten at DM" may
  write it as a manual goal; Kadence does not offer it.
- **Long rides count from three hours** unless the goal says otherwise;
  the form offers no other number yet.

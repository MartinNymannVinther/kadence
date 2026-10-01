# ADR 0042: Copy a week — each rider's own, laid again

Status: accepted · Date: 2026-10-01 · Builds on 0025, 0040, 0041

## Context

A coach whose week worked wants the next one to look the same, and a
week is rarely one session: a group ride, a rider's own intervals, the
strength programme. ADR 0025 named a copy-week button as a later change.
A copy can mean two things — one rider's week given to many, or each
rider's own week again — and the second is what a coach asks for on a
Sunday evening.

## Decision

- **"Kopiér ugen før"** in the calendar's week, for one rider, and in the
  team's week, for every rider or a chosen few. The week copied from is
  the one before unless the coach picks another; the copy goes into the
  week on screen.
- **Each rider gets their own week**, on the same weekdays
  (src/modules/training/copy-week.ts, pure):
  - a copy is a new planned session; what was ridden stays with the week it
    was ridden in, and nothing is marked done;
  - copies of one group plan stay one group, under a new key, so "Ret
    alle" reaches them as it did the originals;
  - a strength programme counts on from where the rider is, not from the
    copied number;
  - a session of a series (ADR 0041) that already has a day in the target
    week is left out and counted as such: the series has it covered.
- **The preview first**: how many sessions go and how many are left out,
  and each rider's target week in the four numbers before and after
  (ADR 0040). Shown, never enforced.
- **Who may**: a rider their own week; several riders' is a coach's. RLS
  reads and writes only what the caller may, and a parent writes nothing.
- No schema change: the copy is ordinary planned sessions.

## Trade-offs accepted

- **Added, not replaced.** A copy into a week that already holds sessions
  adds to them; the preview shows what is there, and the coach removes
  what should go. Replacing would mean deciding which of the week's
  sessions a copy is "the same as".
- **No link back.** A copied session does not remember where it came
  from, as an applied block does not (ADR 0025).

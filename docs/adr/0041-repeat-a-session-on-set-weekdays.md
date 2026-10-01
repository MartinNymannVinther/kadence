# ADR 0041: Repeat a session on set weekdays — a series key, not a rule

Status: accepted · Date: 2026-10-01 · Builds on 0014, 0025, 0040

## Context

A coach who wants the same strength session every Tuesday and Thursday
from November to March had to lay it into the calendar forty times, or
build a block of twenty weeks by hand (ADR 0025 left repeats out). A
recurring event in a calendar program is the usual answer, and it brings
its usual trouble: a rule that expands at read time, exceptions for the
one Tuesday that moved, and a session that is not a row until someone
looks at it.

## Decision

- **"Gentag på faste ugedage"** in the calendar's "Tilføj pas" (from the
  library or built there) and in the library's "Planlæg": the weekdays and
  the last day; the first day is the date already chosen. It works for
  one rider or several.
- **The series is made at once, as ordinary planned sessions.** Every day
  of it is a row, as if the coach had laid it in by hand; a group plan
  gets one group key per day, as before, and every row of the press gets
  the same `series_key` (drizzle/0017, the only schema change). Moving,
  completing, commenting and the load model see nothing new.
- **A programme counts on.** A strength programme's session number goes up
  for each rider through the series in date order, from where that rider
  already is, so the progression follows on its own.
- **"Ret" and "Slet" can take the series**: "dette og de kommende" reaches
  this copy and every copy of the series from this day on that is not
  done — every rider's for a coach, the rider's own otherwise. Done
  sessions are never changed.
- **Limits.** At most 26 weeks ahead from the first day, and at most 2,000
  sessions in one press (riders × days). The service refuses beyond them
  with a word, not a stack trace.
- **The guardrails before the press, never instead of it.** A strength
  series with two weekdays less than DCU's 48 hours apart, or more
  sessions a week than DCU recommends from a week on (one after mid-March),
  is said under the choice. A bike series can show each rider's four
  numbers month by month before and after (ADR 0040).

## Trade-offs accepted

- **Rows, not a rule.** A series to the end of March is a few hundred
  rows; changing "every Tuesday" to "every Wednesday" is deleting the rest
  and making a new one. In return there is no expansion, no exceptions
  table, and nothing that behaves differently from a session laid in by
  hand.
- **The series is not a thing of its own.** It has no name and no page;
  it is a key the copies share. A change to the series after the fact is
  a change to its coming copies, made from any one of them.
- **Too few strength sessions a week is not said** at the press: a coach
  may make Tuesday's and Thursday's as two series of one. The weekly
  guardrails still see the whole calendar.

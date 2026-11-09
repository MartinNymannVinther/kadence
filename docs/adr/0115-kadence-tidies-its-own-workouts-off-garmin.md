# ADR 0115: Kadence takes its own workouts off the rider's Garmin three days after their day

Status: accepted · Date: 2026-11-03 · Amends 0114 (planned sessions go to Garmin by themselves)

## Context

ADR 0114 left the past alone: the job dropped the rows for days before
today without asking Garmin, so Kadence forgot Garmin's workout id the day
after. Every session ever sent stayed in the rider's Garmin workout
library, hundreds over a season. Martin asked Kadence to tidy after
itself.

## Decision

- **Three days kept.** A row whose day is one, two or three days before
  today (Copenhagen days) is left as it is: no call, no write. The
  workout is the rider's recent history at Garmin, beside the ride, and
  there for a session ridden a day late.
- **Then taken off.** Once its day is more than three days back, the job
  takes the workout off Garmin the way it takes off a session that left
  the window — the schedule, then the workout (`takeOff`) — and drops the
  row (`calendar-tidy.ts`; `pastKeeping` in `calendar-plan.ts`, pure). The
  ride is another thing at Garmin and is never touched.
- **What Garmin answers.** Gone (404, 410): the rider deleted it already,
  and the row goes. 429, Kadence's own budget spent, or a failure that
  may pass: the row stays for a later run, a failure noted on it. 401,
  403, 412, a token that cannot be had, or a link known to lack workout
  import or noted `workouts_refused`: Kadence can no longer take it off,
  so the rider's rows that are due go without another call, and the link
  is not marked for this alone. Another refusal: Garmin will not delete
  it, and the row goes.
- **Whatever the switch says.** The tidy runs for every connected Garmin
  link holding such rows, sending on or off, workouts sent by a press
  included, and in a workspace that may only be read. A link that does
  not send is sent nothing new. No migration: the job gives
  `device_links_to_sync` (drizzle/0062) the first day kept as its
  `p_today`, so a link that does not send is named only while it holds
  rows older than that.
- **After the sending, within a share.** In a run, every rider's upcoming
  sessions are seen to first, then the tidy. Its calls take from the same
  budgets (`calendar-budget.ts`), but only down to 10 of the minute's 40
  and 20 of the rider's 80 a day, which stay for sending and presses.
  What does not fit waits for the next run.
- **A session moved into the window from a day that has passed** takes
  its workout along, replaced and rescheduled, instead of leaving it on
  the old day and getting a second one. Otherwise the new workout's row
  would overwrite the old one's, and Kadence would forget the old workout
  at Garmin, which is what this decision ends.
- **Leaving.** Before a link goes, every workout Kadence still remembers
  is taken off, the last few days' included, as best effort within the
  same three seconds (`calendar-exit.ts`).
- **Words.** The Garmin card and the help say it in one plain sentence.
  The words of the rider's yes and their version stay as they are:
  taking off what Kadence sent widens nothing Garmin gets.

## Trade-offs accepted

- **Garmin's calendar loses the planned entry** for days more than three
  days back. The ride stays, with everything it recorded; the plan stays
  in Kadence.
- **Three days for everyone**, not a setting. A rider who changed a
  workout Kadence sent, in Garmin Connect, loses that change with it.
- **Given up, not forgotten quietly.** A workout Kadence can no longer
  take off (401, 403, the permission gone) stays in the rider's library,
  for the rider to delete; Kadence stops asking.
- **Two calls a workout**, about two a day per rider. On a busy minute
  the tidy waits, and a failure that keeps coming back is tried again on
  every run, within the tidy's share.
- **A moved session's workout moves**: its old day loses the planned
  entry at once. This amends 0114's "the past is left alone", where the
  old workout stayed on its old day and a new one was made.

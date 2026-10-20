# ADR 0103: The race is a session on its day, and the day before has Danish words

Status: accepted · Date: 2026-10-17 · Amends ADR 0101 (a week around a race) · Builds on 0102 (a race is hard and has a name)

## Context

With ADR 0102 in place, "Foreslå ugen" laid a week around a cyclocross
race as a coach would: easy days, the race as the week's hard effort. Two
things still read wrong. The race itself was only a line from the
calendar, not a session in the plan: it did not count in the week's
planned hours, and the ride had no session to land on. And the day before
was titled "Opvarmning til cross" with a why line about "lidt spidse":
the model had translated "opener" and "short efforts" from the English
prompt into Danish words that mean something else. A warm-up is ridden on
the race day before the start.

The product owner's words: "Også må den gerne lægge løbet ind også, så
det ikke kun er en begivenhed men også en konkret aktivitet", and "sørg
for at det giver mening det der bliver skrevet".

## Decision

- **A race day holds one session, the race itself.** The race-week rules
  ask for a bike session with the race's name from the calendar as its
  title, and a workout of warm-up, the race by feel and a cool-down, e.g.
  "15 min opvarmning, 45 min RPE 9, 10 min nedkørsel" for a cyclocross
  race. The race is written as RPE because it is ridden by feel and not to
  a zone, and the load model already reads RPE. Laid into the plan, the
  session counts in the week's hours, and the ride can land on it.
- **The guard settles the race day** (`settleRaceDays`, replacing
  `dropRaceDaySessions`). On a day a race in the calendar covers, the
  longest bike session with a step at threshold or harder is the race. It
  takes the calendar's name for the race, and every other session that
  day goes: a warm-up as a session of its own, a strength session, an
  easy spin. A race day without such a session stays empty.
- **The day before gets the reader's words.** The rules give the opener's
  title in the reader's language: "Kort tur med ryk" in Danish, "Opener"
  in English. "Opvarmning" belongs to the race day inside the race's
  session, and short, hard efforts are "ryk" or "spurter". The example
  opener, "40 min Z2, 3x1 min Z5 / 2 min pause, 5 min Z1", puts the
  efforts into the workout and not only into the why line. A test checks
  that every example in the rules is one the shorthand reader understands.
- **The note names the race** and says how the days around it are laid.

## Trade-offs accepted

- **The race's length is the model's estimate.** A calendar event has no
  discipline or duration. The guard does not invent a race session when
  the model gave none, because Kadence does not guess how long a race is.
  The planner shows the session before anything is laid in, and its length
  can be changed there.
- **In a club the team's race becomes a session for the whole group.**
  The group's week plans one week for the selected riders. A coach whose
  group does not all race takes it out in the planner for those who do
  not.
- **The youth prompts changed again.** The pins are retaken, since a young
  rider's race is a session on its day too.

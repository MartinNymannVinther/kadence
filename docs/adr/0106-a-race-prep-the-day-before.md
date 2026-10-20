# ADR 0106: A race prep the day before every race, DCU's opladning

Status: accepted · Date: 2026-10-20 · Amends ADR 0101 (a week around a race) and 0103 (the race is a session) · Builds on 0035 (DCU's sessions in Rulle), 0092 (weeks for a motionist)

## Context

A week with a cyclocross race on the Saturday had "Restitutionstur 45
min" on the Friday. The race-week rules left the day before to the
model: "rest, or a short opener", with an example of Kadence's own. The
model chose neither and planned a recovery ride. A planned race also had
no way to get a race prep at all except by building one by hand. The
product owner's words: "Før et løb skal der være en reel race prep. Byg
det."

DCU has a name and a form for it. In the U17 compendium's example week,
the day before the Sunday race is "Opladning", 1 hour, "1*5 min. AT
eller 1*3 max." (DCU_U17_kompendium_2016.pdf p. 14;
DCU_U19_kompendium_2016.pdf p. 17; docs/research/dcu-anbefalinger.json).
Kadence already had DCU's opener in Rulle, at 30 minutes.

## Decision

- **One race prep, DCU's opladning** (`src/modules/workouts/race-prep.ts`).
  It is an hour: 20 minutes easy, 5 minutes at AT (zone 4, Kadence's
  reading of DCU's forms), 25 minutes easy and 10 minutes cool-down. It
  is the structure of DCU's opener in Rulle, which now lasts DCU's hour,
  so the two never part. The lengths around the effort are Kadence's,
  since DCU gives none. Its words say "tærskel", not AT, so an adult on a
  training profile reads no youth federation's terms: "Opladning før
  løbet: en time roligt med 5 minutter ved tærskel, så benene er vågne og
  friske til start."
- **The week drafts lay it in the day before every race, whatever the
  model said** (`layRacePrep`, after `settleRaceDays`). The model's
  sessions that day go. A race on the Monday has its eve in the week
  before, which the draft does not plan. A stage race gets one race prep,
  before its first day. The rules tell the model the day is taken and its
  hour counts.
- **A race in the calendar offers it.** An open race shows "Dagen før
  løbet" with "Læg opladning ind fredag", which opens "Tilføj pas" on the
  day before with the race prep built. The rider is the race's own, or the
  rider whose week is open. The coach can change it and lays it in. No new
  action and no new table are needed.

## Trade-offs accepted

- **No rest day before a race.** DCU's example week rides the day before.
  A coach who wants rest deletes the session.
- **Only DCU's first form.** "1*3 max." gives no unit (dcu/intensity.ts),
  so Kadence does not guess one. The race prep is the five minutes at AT.
- **The race prep replaces what the model planned that day, even a good
  opener.** One known session the day before reads the same every week.
- **Rulle's DCU opener changed for young riders** from 30 minutes to
  DCU's hour. The pins in `tests/ai/youth-unchanged.test.ts` are retaken
  for it and for the week drafts' rules.

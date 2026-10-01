# ADR 0044: A better builder — building blocks, exercise suggestions, the session at a glance

Status: accepted · Date: 2026-10-01 · Builds on 0014, 0015, 0016, 0038

## Context

The workout builder could write any session, one step or one exercise at
a time, each with every field to fill. Coaches asked for a builder that
is quick for the sessions they write every week, on a phone as well as
at a desk, and that shows what a session amounts to while it is built.

## Decision

- **Building blocks for the bike** (src/modules/workouts/building-blocks.ts,
  pure): a warm-up, a cool-down, steady endurance, cadence drills, and the
  interval sets coaches write most — tempo, threshold, VO₂max, sprints —
  each with its recovery. One tap puts a block where it belongs: a warm-up
  first, a cool-down last, work after what is there but before a closing
  cool-down. They are Kadence's own starting points in Kadence's own
  zones, not DCU's prescriptions, and every number can be changed after.
- **Exercise suggestions for strength**
  (src/modules/workouts/exercise-catalogue.ts, pure): typing an exercise's
  name offers DCU's exercises — taken from the programmes in
  src/modules/dcu/strength.ts, not typed again — and a short list of
  Kadence's own for a session without machines. Choosing one fills its
  group, sets, reps and load while those are still a new exercise's
  defaults; a coach's own numbers are never overwritten. DCU's names stay
  DCU's Danish words; Kadence's are named in the reader's language.
- **The session at a glance** beside the library's builder on a wide
  screen: the time, the load the model expects (ADR 0016, the estimate the
  load chart counts with), and the time in each zone for a bike session
  or the sets per group for a strength session, following every change.
  On a phone the builder keeps its profile and total time on top instead.
- No dependency: the suggestions are a native `<datalist>`, which a phone
  shows in its own keyboard bar.

## Trade-offs accepted

- **A short catalogue.** Fourteen exercises of Kadence's own beside DCU's,
  not a library of hundreds: enough for a session without machines, small
  enough to keep in two languages. A team's own exercises live in its
  templates.
- **Blocks are not editable as blocks.** A block is laid in as ordinary
  steps and repeats; there is no team-defined block. A session saved as a
  template is the team's own building block.
- **The glance is the library's.** The calendar's sheet is narrower and
  keeps the builder alone; the same session is a tap away in the library.

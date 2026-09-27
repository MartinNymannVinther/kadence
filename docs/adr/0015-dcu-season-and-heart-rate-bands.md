# ADR 0015: The season runs October to September, and DCU's heart-rate bands sit beside Kadence's zones

Status: accepted · Date: 2026-09-27 · Amends 0014

## Context

ADR 0014 was written from the research notes and said two things that
building `src/modules/dcu` against the sources proved wrong:

- that the season runs November to October. DCU's 2025 table
  (Landevej_traeningsanbefalinger_2025.pdf) starts with October — "pause
  - frit" — and runs to September, and DCU's page speaks of the year in
    the same way;
- that DCU publishes no zone model. `intervaltraening.pdf`, linked from
  the same page, gives intensity bands as a share of heart-rate reserve
  (restitution up to 55 %, basis 56–75 %, medium 76–83 %, AT 84–92 %,
  VO2 max 93–100 %), while the example weeks in the compendiums say AT
  80–90 % without saying of what.

## Decision

- A season starts on 1 October and leads into the racing year it ends
  in; a rider is planned in the class of that racing year. A season plan
  has twelve months from October, October with no planned hours.
- Kadence keeps its own seven zones (src/modules/workouts/structure.ts):
  they are defined on threshold power and threshold heart rate, which a
  power meter or a test gives, where DCU's bands need a resting and a
  maximum pulse and stop at five. DCU's bands are kept as data
  (`DCU_HRR_BANDS`) and shown beside Kadence's zones where a coach reads
  them, labelled as DCU's.

## Trade-offs accepted

- **Two vocabularies on one screen.** A coach trained on DCU's words sees
  them next to Kadence's zones rather than instead of them. Replacing
  Kadence's zones with DCU's would leave power without a model; showing
  only Kadence's would hide the federation's own words.

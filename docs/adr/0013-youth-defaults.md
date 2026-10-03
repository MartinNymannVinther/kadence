# ADR 0013: Youth defaults — no weight, no leaderboards, school in the calendar

Status: accepted · Date: 2026-09-27 · Amended by ADR 0051 (the club championship, the one place riders see placings)

## Context

The riders are 15 to 22. ATK (Team Danmark's age-related training
concept) warns about low energy availability and disordered eating in
weight-sensitive sports, about the relative age effect, and about the
growth spurt; DCU's strategy warns against adult targets too early.
TrainingPeaks is built for adults: W/kg front and centre, weight in
every chart.

## Decision

- No weight and no W/kg for riders under 19 unless a coach turns it on
  for the team (`team_settings.allow_youth_weight`).
- No leaderboards or rankings between riders anywhere.
- Height is a first-class measurement, for the growth spurt.
- School, exams, camps and illness belong in the calendar beside races.
- Goals are process first; results are one goal among several.

## Trade-offs accepted

- **A U19 climber's coach may want W/kg.** They can turn it on; the
  default protects the many from what helps the few.

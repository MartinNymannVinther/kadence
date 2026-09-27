# ADR 0014: DCU's recommendations are the default, and deviations show

Status: accepted · Date: 2026-09-27

## Context

The brief: follow the UCI/DCU training recommendations for each age group
by default, on the bike and for strength. DCU publishes them as PDFs
(docs/research/dcu-traeningsanbefalinger.md): monthly hours per class and
year in it (2025), phases, the longest ride, and strength programmes with
progressions. It publishes no zone model and disagrees with itself in
seven places.

## Decision

The recommendations live as data in `src/modules/dcu`, with the source
document and page beside every number. A rider's class comes from their
birth year and the season (a coach may override it). A new season plan
is filled from the class's hours and phases; strength programmes arrive
in the library as templates with their progression. The coach can change
anything, and every view that shows a plan shows DCU's number beside it.

Where DCU disagrees with itself, Kadence uses the 2025 hours and the
strength programmes' own progressions, and the research note lists the
disagreements. Kadence's zones are its own and are labelled so.

## Trade-offs accepted

- **A snapshot of a PDF.** When DCU publishes new numbers, a person
  updates the data and the tests; nothing fetches them.
- **Kadence's zones are not DCU's.** Coaches who use another model can
  still write sessions in watts or pulse.

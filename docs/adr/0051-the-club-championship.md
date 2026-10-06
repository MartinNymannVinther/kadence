# ADR 0051: The club championship, the one place riders see placings

Status: accepted · Date: 2026-10-03 · Amends ADR 0013 and ADR 0039 · Amended by ADR 0057 (behind CLUB_CHAMPIONSHIP above the team's own setting, off by default)

## Context

Kadence shows no leaderboards and no rankings between riders anywhere
(ADR 0013), and the placings read from Cykling Danmark are for the coach
alone (ADR 0039). Martin asked for a club championship with a history —
"det eneste sted hvor placering og resultater vises for rytterne, men det
skal være i en hyggelig tone" (docs/plan-klubber-og-guides.md, section 2,
approved 3 October 2026, with the club's own rounds only).

## Decision

- **The club turns it on** (`team_settings.club_championship`, off by
  default) under Indstillinger → Holdet. Until then nobody sees it and the
  services refuse it.
- **The club's own rounds.** A coach creates a season's championship,
  adds rounds — a time trial, a hill climb, a road race, a criterium or
  anything else — decided by time or by place, and types the results: a
  rider of the club, or a guest by name, in U17, U19, U23 or an open
  class. Nothing is read from Cykling Danmark.
- **Points** are 10-8-6-5-4-3-2-1, and one for every other finisher;
  equal times share a place; the standings per class sort by points, then
  wins, then name. The arithmetic is pure (`src/modules/club/standings.ts`)
  and tested on its own.
- **A friendly tone.** The standings open with thanks to everyone who
  rode; the three at the top are lifted gently; everyone who rode is
  listed, and nobody is called last. A rider who beats their own earlier
  time on a course the club rides again gets "Personlig rekord", and the
  largest improvement on a course from last year is named "Årets
  fremgang".
- **The roll of honour** ("Klubmestre gennem tiden") holds the season's
  winners when a coach crowns them, and years from before Kadence typed in
  by hand.
- **Four tables** — championships, rounds, entries, champions — with
  forced RLS and audit triggers: everyone in the club reads, coaches
  write, a rider named must be the club's own. They are in the export.

## Trade-offs accepted

- **An exception to rider separation.** Entries carry a `rider_id` that
  teammates and their parents can read, which no other rider table allows.
  It is a results board in the clubhouse, kept inside the club, and it is
  the club's choice to have one. A rider who does not want to stand with
  a name asks the coach to take the line away.
- **An exception to "no rankings".** ADR 0013's line still holds for
  everything else: training, load, check-ins and DCU's placings are never
  ranked between riders.
- **No points from real races yet.** Martin chose the club's own rounds;
  points from DCU results could come later as a choice, once the results
  trial (ADR 0039) has DCU's yes.
- **Records by course name.** A personal best and the year's improvement
  match rounds by their title, so the club names its fixed course the same
  way each year.

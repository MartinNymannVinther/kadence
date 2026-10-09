# ADR 0078: Programmes and the week — one word for a forløb, the open page as a place to share, and a rider lays a programme into their own week

Status: accepted · Date: 2026-10-09 · Amends ADR 0025 (training blocks), ADR 0050 (a rider's own sessions) and ADR 0067 (exercises and programmes)

## Context

On 9 October 2026 Martin asked how the training plans in a rider's week
and the library relate to the programmes under Viden og hjælp. The
answer was that the code was consistent and the words were not:

- "Program" meant three things: a recipe for one strength session with
  drawings (ADR 0067), DCU's series of strength sessions with a
  progression (ADR 0014), and, in everyday Danish, a rider's schedule.
- The multi-week sets of sessions (ADR 0025) were "forløb" in the week
  planner and "Blokke" in the library.
- "Øvelser og programmer" stood in two places with different powers: in
  the library with the team's own and "Læg i kalenderen", and as an open
  page under Viden og hjælp with Kadence's own only, to download and
  print. A signed-in coach was sent out of the app's frame for what the
  library held with more.
- A rider who found a programme could not put it into their own week,
  although riders plan their own sessions (ADR 0050).

Martin said yes to all four changes below.

## Decision

- **One word: forløb.** The library's "Blokke" are "Forløb" in Danish
  everywhere — the tab, the section, the buttons and the dialogs — as the
  planner already said. English keeps "block". Addresses do not change
  (`/library/blocks`). Rulle's "blokke", the parts of a session, are a
  different thing and keep their word.
- **The open page is a place to share and print.** The card for the
  programmes under Viden og hjælp says that the same programmes are in
  the library, where they are put in the calendar, and that the open
  page is for sharing and printing without a login. The library's
  programmes tab leads to the open page, and one of Kadence's own
  programmes has "Del som åben side" beside its download, with the
  programme preselected. A team's own programme is never shared out of
  the team (ADR 0067).
- **A rider lays a programme into their own week.** `scheduleProgram`
  lets a rider lay Kadence's or the team's programme into their own
  calendar and nobody else's; a coach lays it for any rider; a parent for
  none. The session made is the rider's own, as a session they plan from
  the library is (ADR 0050), and the scheduler under it checks the rider
  again. The programme page shows "Læg i kalenderen" to a rider as to a
  coach, with the rider as the only choice. The demo's Emma has laid
  "Bevægelighed hele dagen" into her own calendar.
- **The words in one place.** Hjælp opens with a section, "Pas, forløb,
  program og sæsonplan", one line each, and the same section is found by
  Søg.

## Trade-offs accepted

- **"Program" still carries two meanings** — one strength session's
  recipe, and DCU's series. DCU's own word is "styrkeprogram", and
  renaming what DCU calls a programme would make the source harder to
  find; the help's section says which is which instead.
- **A rider's programme session counts in their week** like any session
  they plan: the guardrails see it, the coach sees it in the team's week,
  and the 48 hours between strength sessions are checked as for a
  coach's. A rider can therefore lay a programme on top of what the coach
  planned; the coach sees it, and the week's flags say if it is too much.
- **The open page keeps duplicating the library's built-in programmes.**
  It is what parents and clubs without a login reach, and keeping one
  copy would mean a login for them or a weaker library for the team.

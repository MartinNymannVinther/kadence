# ADR 0039: Races from Cykling Danmark, for the coach

Status: accepted · Date: 2026-10-01 · Builds on 0011, 0013, 0018 · Amends 0013 (a rider's own placings, for the coach) · Amended by ADR 0051 (the club championship shows its own results to the club)

## Context

A coach wants to know what a rider has actually raced, and how it went:
it says where the rider is, and whether they are riding themselves
tired. Danish race results are public. Cykling Danmark's member portal
(run by Sportstiming) has a page per member, filed under the UCI ID on
the licence, with every race and placing
(docs/research/dcu-results.md). There is no API and no terms for reuse.
Sportstiming's main site withholds its data from software on purpose;
the member portal does not.

ADR 0013 keeps results out of a young rider's sight in Kadence: process
before results, no leaderboards. Martin's brief kept that: the placing is
information for the coach and is not shown to the rider. The rider gets
only a mark in their calendar that they rode a race. He dropped DCU's
points altogether.

What a coach plans by is the races a rider has entered. Kadence cannot
see those: they are the rider's own account at Sportstiming, or a guess
by name across every event's participant list on the site that shuts
software out.

## Decision

- **The coach or the rider enters the rider's UCI ID** (`riders.uci_id`,
  eleven digits, unique on the team): the coach on the rider's page, the
  rider under Settings → Me. The rider-row guard (drizzle/0007, renewed
  in 0016 and 0018) lets the rider change it, as it lets them change
  their thresholds, and nothing else new: when the races were last read
  stays Kadence's note. With nothing else turned on, the UCI ID gives a
  link to the rider's page at the portal.
- **The birth year must match.** The portal prints the member's birth
  year above the results. Where the installation reads races, a new UCI
  ID is checked before it is saved: the portal must know it, and the
  member must be born in the rider's year. Every reading checks it
  again, so a number typed wrong, or a teammate's, never brings another
  person's races into the calendar, whoever typed it.
- **Reading is the installation's choice, and off by default**
  (`DCU_RESULTS`): `off`, `on`, or a list of UCI IDs to read for and no
  others. That is how it is tried with one rider before a team, and how
  an installation keeps it off until Cykling Danmark has said yes.
- **One page per rider, from the portal only.** Kadence reads
  `dcumedlem.sportstiming.dk/profile/<UCI ID>` and nothing else. It never
  reads `www.sportstiming.dk`. It names itself and the installation in
  the user agent. The page is capped, must be HTML, and must be the
  profile of the UCI ID that was asked for, or it is refused whole. A row
  that does not read cleanly is skipped, never filled in (the parser is
  pure, `src/modules/results/dcu-profile.ts`).
- **Read when Kadence is opened, not on a schedule.** Kadence has no
  scheduled job. A coach opening Kadence, the calendar or a rider's page
  puts every rider on the team whose races are more than three hours
  old in a line. The line runs in the background after the page has
  been answered (`after()`) and reads one rider at a time, ten seconds
  apart (`src/modules/results/queue.ts`). A rider opening Kadence does
  the same for their own races. The coach's "read races now" reads at
  once, but never twice in ten minutes for the same rider. The whole
  installation never reads more than six pages a minute.
- **The rider's visit writes what the rider may write.** It is written
  as the rider, the way a ride from their bike computer is (ADR 0018).
  It puts a race in the rider's own calendar for a day that has none,
  and writes no place: only a coach writes those. A coach's visit then
  finds those races and hangs the places on them. When the rider's own
  reading last ran is kept in memory, because the rider may not write
  the rider row's note of it.
- **A race in the calendar, the placing on it for the coach.** Each
  result from the season before and this one hangs on a race in the
  rider's calendar. It goes on the race it hung on before; otherwise on a
  race already there that day, the rider's own before the team's, so a
  race the coach planned gets its result and is not doubled; otherwise
  on a race Kadence makes for the day (`calendar_events.source = 'dcu'`),
  one per day however many results the day had. The race follows the
  calendar's rules: the rider and a parent who may see the rider's
  training see it, marked as read from Cykling Danmark.
- **The placing is a table of its own** (`race_results`, drizzle/0016).
  It holds the race's name, class, date, place (or what stood instead,
  DNF), and the link to the result list. A coach reads and writes it.
  The rider can read their own, because it is about them and belongs in
  their export (ADR 0011), but no screen shows it to them. No parent and
  no teammate can read one. A result can name only a race on the same
  team that is the rider's own or the team's. Every change is audited.
  The coach sees a small place on the race in the calendar, the results
  with their result lists when opening it, and the latest five races on
  the rider's page.
- **Removing or changing the UCI ID takes it all along**: the results and
  the races Kadence made. A race a person made stays, without its
  results.
- **Not built:** entries (see Context); DCU's points and points lists;
  any list of riders by results; anything about results in the AI's
  prompts or the Monday brief; a flag or guardrail computed from
  placings. Placings for young riders are noisy (tactics, crashes, the
  class), and the coach reads them beside the form curve, not instead of
  it.

## Consequences

- A coach sees a rider's racing season in the calendar without typing
  it, and a rider's calendar shows the races they rode.
- ADR 0013 is amended narrowly. There is still no leaderboard and no
  ranking between riders anywhere. What is new is that a coach sees a
  rider's own place in a race, as DCU published it.
- The rider can read a table that no screen shows them. That is
  deliberate: the data is about them, the export is theirs, and the same
  results are public at Cykling Danmark anyway.
- A result Cykling Danmark removes stays in Kadence until the UCI ID is
  removed. Mirroring removals would mean trusting an empty page, and an
  empty page is also what a broken page looks like.
- A race Kadence made can be edited or deleted like any other. Deleted,
  it comes back the next time the races are read.

## Trade-off accepted

Kadence reads a public page that was made for people, with no agreement
behind it yet. It does so politely: one page per rider, rarely, named,
from the host that does not shut software out, and off unless the
installation turns it on. The alternative, waiting for an API, would
leave coaches typing results by hand. The page can change under Kadence
at any time. When it does, the parser refuses, the coach's page says so,
and nothing in the calendar changes. The questions for Cykling Danmark
are in the research note, and entries, the part coaches want most, wait
for their answer.

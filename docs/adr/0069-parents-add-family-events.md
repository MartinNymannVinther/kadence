# ADR 0069: Parents put the family's days into their child's calendar

Status: accepted · Date: 2026-10-07 · Builds on 0010 · Amends 0011 · docs/backlog.md P2-04

## Context

A coach plans around a rider's holiday, an exam or a confirmation, and
the person who knows the dates first is often a parent. Until now a
parent read their child's calendar and wrote nothing (ADR 0011: coaches
and the rider write; guardians read), so the dates went by text message
to the coach, or to the rider, and from there into Kadence or not at
all. The backlog asks for a parent to put them in themselves, for their
own child only, and only the family's kinds of day.

A rider's calendar holds more than dates. Its races are where the team
goes, a week ill is health data, school is the rider's own. Writing is
where the trust between a 16-year-old, their parents and their coach is
drawn, and dogma six puts that line in the database.

## Decision

- **One narrow pen, in the database.** Three permissive policies on
  `calendar_events` (drizzle/0034) sit beside the coach's and the
  rider's: a guardian may insert, update and delete a row only when
  - it is about a rider, never the team (`rider_id` is not null);
  - its kind is `holiday`, `exam` or `other` — never a race, a camp,
    school or a week ill;
  - the guardian passes `app_is_guardian_of(rider_id, 'training')`: the
    rider has confirmed the link, shares their training with their
    parents, and — from the year they turn 18 — has confirmed again as
    an adult. The same test lets the parent read the calendar, so a
    parent writes exactly where they may read;
  - it is the guardian's own: `created_by` is the caller on the way in,
    and only rows they wrote can be changed or removed. The rider's own
    exam, the coach's entry and the other parent's are not theirs;
  - it carries no priority and does not claim to come from Cykling
    Danmark.
- **The service says it first** (`src/modules/training/family-events.ts`,
  through `runAction` with zod): a confirmed child the parent can see,
  one of the three kinds, the parent's own row. A refusal is "forbidden"
  before the database would refuse it.
- **"Tilføj til kalenderen" on /parents**, in each child's part, under
  "Familiens kalender": what this parent has put in from today on, each
  with "Ret", and the dialog with the kind, a title and the days. It
  says that the child and the coaches see it, and that the child may
  delete it.
- **The coach and the rider see it in the calendar as any event**, and
  the event's dialog says a parent put it in (`fromParent`, read under
  the reader's RLS from the rider's guardians). The rider may change or
  delete it, as every row of their own; so may a coach.
- **The audit trail** records every write, as on every row of the table.
- **The demo's parent** has put an autumn break into Emma's calendar.

## Trade-offs accepted

- **A parent writes into a minor's calendar.** The rider decides who is
  a parent at all, whether parents see the training, and keeps the last
  word: they see every row and may delete it. A parent's row cannot be
  hidden from the rider.
- **Two parents do not share their rows.** One parent cannot change the
  other's holiday; the rider or a coach can. Sharing would make the line
  "what I wrote" into "what a parent wrote", and the rows carry one
  author.
- **A child who stops sharing their training takes the pen with the
  view.** The rows a parent wrote stay in the calendar; the parent can
  no longer see or change them until the child shares again.
- **An exam is both the family's and the rider's.** A parent may put one
  in, and so may the rider; they are two rows if both do. Merging them
  would mean a parent changing the rider's row.
- **No note, no time, no place on a parent's row.** A holiday and an
  exam need days and a name; what more there is to say goes to the coach
  in person. The policies do not forbid them; the service does not offer
  them.

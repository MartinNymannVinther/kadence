# ADR 0107: Rulle gives the trainer the road, eases ERG, and says how hard the session was turned

Status: accepted · Date: 2026-10-20 · Amends ADR 0033 (Rulle: the session on the trainer); touches ADR 0073 (the WATT cheat code's avatar) and 0075 (the sprinter)

## Context

ADR 0033 chose "ERG only, no simulated gradients": the trainer holds each
block's watts whatever the road does, a free block is a flat road, and
the route's hills move the rider on the screen, not the resistance. The
product owner, riding Rulle on a trainer, asked for three things:

- that the resistance follows the block's target, so that it goes up and
  down with the cadence — which is what ERG does, and already did;
- alternatively, that the resistance follows the speed, the weight and
  the route's slope, so that the rider shifts gears to reach the block's
  watts at a chosen cadence, as on the road;
- a way to turn the whole session down or up on the way — "90 % on a day
  the legs are bad" — which the arrows and the plus and minus already
  did, at 50 to 120 % in steps of five, but without a word for it on the
  screen and without a trace on the ride afterwards.

Two things came up while looking. A trainer holding 300 W against a
crank that has fallen to 40 rpm is a wall the rider never gets back up
(the "ERG spiral"); the riding apps let go a little, Rulle did not. And
the weight: FTMS's Set Indoor Bike Simulation Parameters carries grade,
wind, rolling and wind resistance, and no rider weight, so the trainer's
own reckoning of a slope uses the weight set in its maker's app, or its
default. Kadence keeps no weight by decision (ADR 0013, 0031, and the
choice of class and sex over kilos). Rulle's own physics rode a fixed 70
kg of rider and 8 of bike. The product owner's answer on weight: one
average for every class, 68 kg.

## Decision

- **The route sets the resistance where Rulle is not holding the watts.**
  A free block, ERG turned off, or the rider's choice before the start
  ("Ruten styrer modstanden"): the trainer is given the route's grade
  where the rider is, through FTMS's simulation command, instead of the
  flat road of ADR 0033. The block's watts stay on the screen and "på
  mål" counts as before; the rider's gears and legs reach them. The
  grade is sent at **half strength** (`ROAD.difficulty`, 0.5 — Zwift's
  default "trainer difficulty"), in steps of half a per cent so the
  trainer is written to when the road changes and not every second, and
  never steeper than 20 % either way. A pause is a flat road, so a rider
  starting again never starts against a hill. The session alone (ADR
  0057), with no world, has a flat course and so a flat road, as before.
  Pure: `src/modules/rulle/road.ts`.
- **The choice is made before the start and switched on the way.** A
  trainer that can both hold watts and ride a road is asked on the ready
  screen which it should do; the ERG button and the E key switch during
  the ride, as they did. The choice is not remembered between rides.
- **ERG is eased when the cadence collapses.** Under a held target, with
  a measured cadence below 50 rpm for three seconds, the trainer is set
  to 60 % of the block's watts, and set back once the cadence has been
  at 60 rpm or more for two seconds. The screen says "ERG lettet, til
  kadencen er oppe igen"; the target on the screen stays the block's,
  and the seconds count as under target, which they are. A deliberate
  low-cadence block at 55 rpm is left alone. The numbers are Rulle's
  own; the behaviour is the apps' (`src/components/rulle/ride/hold.ts`).
- **The dial is called "Sværhedsgrad", shown by the target, and written
  on the ride.** The watt tile says "Mål 270 W · 90 % af passet" when
  the dial is off 100 %. The least and the most the session was turned
  to go with the file to `/api/rulle/ride` (`low` and `high`, per cent),
  and become the ride's note in the rider's language: "Kørt i Rulle på
  90 % af passet." or "… på 80–110 % …". At 100 % there is no note. The
  note is the ordinary one a rider edits afterwards; the coach reads it
  where they read any ride's.
- **The standard mass is 68 kg of rider and 8 of bike**, for every class
  and profile, in Rulle's own physics: the speed on the screen, the
  sprinter's share of the air (now about 0.84, ADR 0075), and where the
  WATT cheat code's avatar starts (ADR 0073). It is never shown. The
  trainer's resistance on the route reckons with the trainer's own
  weight, which Rulle cannot set: the hint under the choice says so.

## Consequences

- A trainer that speaks FTMS simulation now gets a changing grade for
  the first time. Rulle has met one real trainer (TECH-DEBT.md,
  docs/rulle-proevetur.md); the checklist gains the road and the ease,
  for the next ride.
- The ride's note is written by Kadence, not by the rider, for the first
  time. It is plain text in `activities.note`, overwritten by whatever
  the rider writes afterwards, exported with the ride as any note.
- The grade is given in half-per-cent steps on a road that changes by
  the metre, so the trainer steps rather than glides on a long climb.
  Finer steps would mean a write a second on the Control Point; FTMS
  answers each in turn, and that queue is better kept short.
- Half strength and 68 kg are two numbers a rider may want to change: a
  heavier senior, or a rider who wants the full climb. A setting for the
  difficulty is a later decision; `roadGrade` takes one already.
- "ERG only, no simulated gradients" in ADR 0033 no longer holds. ADR
  0033's "the mass is not the rider's" still does.

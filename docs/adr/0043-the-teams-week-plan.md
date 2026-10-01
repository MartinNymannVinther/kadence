# ADR 0043: The team's week plan — built in one place, laid in at once

Status: accepted · Date: 2026-10-01 · Builds on 0017, 0025, 0038, 0040, 0042

## Context

A coach planning next week for a squad of twelve laid each session in
separately, for the riders it was for, from the calendar; a block
(ADR 0025) laid in several weeks at once but could only hold the
library's sessions and lived in the library. The AI's week draft
(ADR 0017) was for one rider and needed the team's yes to read riders'
data. Coaches asked to plan a week for the whole team or chosen riders at
the same time.

## Decision

- **"Planlæg ugen"**, a page of its own (`/calendar/week-plan?week=`)
  opened from the team's week. A coach's.
- **Who**: the whole team, a class with one tap (every U17 this season),
  or riders picked one by one.
- **The week**: seven days, each with its sessions — from the library or
  built there with the same builder and "Byg med AI" (ADR 0038). It can
  start empty, from a week of one of the library's blocks, from one
  rider's week ("a week like Emma's"), or from an AI proposal.
- **The AI's week for a group** (`POST /api/ai/group-week`, counted as
  `group_week`): from DCU's hours and phase for a class-year the coach
  chooses — the selected riders' lightest by default, the safe side for a
  mixed group — strength this time of year, the team's own events and
  library, and the coach's wishes, fenced as data. No rider's data goes
  in, so the team's switch for it is not asked; the per-rider draft keeps
  asking. The answer goes through the per-rider draft's sanitizer and
  lands in the planner, where the coach changes it; nothing is written.
- **The preview first**: each rider's week in the four numbers before and
  after (ADR 0040). Shown, never enforced.
- **One press lays it in**: every session of the plan becomes one group
  plan across the riders, so "Ret alle" reaches its copies, and a strength
  programme counts on per rider. At most 21 sessions and 60 riders.
- **Kept on the device until then.** The plan is stored in the browser per
  week, so a closed page or a lost signal does not lose it; it holds
  sessions and rider ids, nothing a rider wrote. Where the browser keeps
  nothing, it lives for as long as the page does.
- No schema change and no new concept: what is laid in is ordinary planned
  sessions.

## Trade-offs accepted

- **The same week for everyone chosen.** The plan does not vary by rider;
  a coach who wants U17 and U19 to differ plans each class in turn, or
  changes a rider's copy afterwards. Per-rider variation inside one plan
  would be a second builder.
- **A plan is not kept on the server.** It is not shared between a
  coach's devices or with an assistant coach; a plan worth keeping is a
  block in the library.
- **The AI's group week sees no rider.** It cannot plan around one rider's
  fatigue or exam; the guardrails and the preview show those, and the
  per-rider draft, with the team's yes, can read them.

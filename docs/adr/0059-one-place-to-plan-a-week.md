# ADR 0059: One place to plan a week

Status: accepted · Date: 2026-10-06 · Builds on 0017, 0025, 0041, 0042, 0043, 0058 · docs/plan-fokus-vinter.md · "Never on the server" amended by ADR 0043's amendment of 2026-10-07 (the draft is shared by the team's coaches)

## Context

A coach had five ways to plan a week: "Tilføj pas" one session at a
time, "Kopiér ugen før" (ADR 0042), a block from the library (ADR 0025),
the team's week planner (ADR 0043) and, for one rider, the AI's "Foreslå
ugen" dialog (ADR 0017), which wrote straight into the calendar. Each
had its own start, its own preview or none, and the planner followed
the week the calendar happened to show. A coach planning the winter
wants one place that starts from something sensible, repeats a good
week, and keeps it for next time. The plan for the winter
(docs/plan-fokus-vinter.md, wave 4) asks for that place.

## Decision

- **The week planner is the place** (`/calendar/week-plan`). It has its
  own way between weeks — previous, next, this week, "Gå til" — and is
  opened from the team's week and, now, from a single rider's week with
  that rider chosen (`?rider=`). A plan begun for one rider is kept on
  the device apart from the team's plan for the same week; plans stay in
  the browser as before (ADR 0043), never on the server.
- **"Start fra"**: _Tom uge_, _Sidste uge_, _Et forløb_ or _AI_.
  - _Sidste uge_ reads the week before for the riders chosen. For one
    rider it is that rider's whole week. For several it is the group
    sessions — those laid in for more than one rider at once — each
    once, since a plan is the same week for everyone it is for; a
    rider's own session is not the group's. A session of a series that
    already has its day in the week is left out, as "Kopiér ugen" does.
  - _Et forløb_ loads a week of a block, its own sessions included.
  - _AI_ is the group's AI week (ADR 0043), from the class-year and the
    team's library, with no rider's data. A rider's "Foreslå ugen" now
    opens the planner for that rider with the AI chosen (`?start=ai`):
    one AI path, and nothing the AI proposes reaches a calendar before
    the coach lays the week in.
- **"Gentag i N uger"** (1–12) when laying the week in: the same week in
  N weeks in a row. Each session is a group plan across the riders each
  week, as before, and repeated, its weeks are one series (ADR 0041), so
  "Ret" and "Slet" can take the coming ones. The preview shows every
  week in the four numbers (ADR 0040). One press writes at most 2,000
  sessions, the series' limit.
- **"Gem som forløb"** keeps the planner's week as a one-week block in the
  library. Its sessions from the library are kept as the library's; a
  session built in the planner is kept in the block itself — sport,
  title, words, steps, minutes, time and place — and is not added to the
  library (drizzle/0027: `training_block_items.template_id` may be empty
  when the item carries its own session).
- **Blocks read, preview and lay in both kinds.** The block editor shows a
  session of the block's own beside the library's and keeps it when the
  block is saved again; the preview counts it; laying the block in makes
  it a group plan of its own with its time and place.
- **RLS**: a coach writes an item without a template, the database asks
  for a whole session when there is none, a rider writes none, and a
  coach of another team reads and writes none (tests/rls/block-items).

## Trade-offs accepted

- **The old ways in now lead to one planner.** "Foreslå ugen" in a
  rider's week no longer opens its own dialog: it opens the planner with
  the group's AI, which reads no rider's data, so the proposal no longer
  sees that rider's last weeks and calendar — the preview and the
  guardrails do. The dialog and its route stay in the code, unused by
  the calendar, until the pilot says whether the per-rider reading is
  missed.
- **A block may hold sessions that are not in the library.** A session
  saved from the planner lives only in its block: changing it in the
  library is not possible, and the same session saved in two blocks is
  two copies. The alternative — adding every built session to the
  library — would fill the library with one-offs.
- **"Sidste uge" for a group is the group sessions only.** A rider's own
  intervals last week do not become everyone's this week; a coach who
  wants a rider's week for the group starts from that rider alone.
- **The same week, repeated.** "Gentag i N uger" does not progress; a
  rising winter is a block of several weeks, built in the library.

# ADR 0011: Riders are separated inside a team, in the database

Status: accepted · Date: 2026-09-27 · Amended by ADR 0069 (a parent puts the family's days into their child's calendar)

## Context

Every sibling separates workspaces in the database and lets every member
of a workspace read everything in it (Plot's ADR 0013). A cycling team
cannot: a rider's check-ins, sleep, pain and training are health data
(GDPR art. 9) about someone who is often under 18, a teammate must never
see them, and a parent should see what the rider chooses to share. Dogma
six says separation lives in the database, with a test that proves it.

## Decision

Every table about one rider carries `rider_id`, and its policies ask who
the caller is to that rider through five SECURITY DEFINER functions in
drizzle/0003 that read the transaction's `app.org_id` and `app.user_id`:

- `app_is_coach()` — an owner or admin of the active team;
- `app_is_rider_self(rider)` — the rider's own account;
- `app_is_guardian_of(rider, scope)` — a guardian whose link the rider
  has confirmed, for what the rider shares: `profile` always, `training`
  unless the rider says no, `wellbeing` only if the rider says yes; and
  from the year the rider turns 18 only if the rider has confirmed the
  link again as an adult;
- `app_can_read_rider(rider, scope)` and `app_can_write_rider(rider)` —
  the two the policies use. Coaches and the rider write; guardians read.

The data falls in two scopes. **Training** — planned sessions,
activities and their files, the season plan, the rider's calendar events,
the comments. **Wellbeing** — check-ins and measurements (height, and
weight where allowed).

A trigger makes confirming a guardian the rider's alone and stops a link
from changing rider or person. Device links are the rider's; a coach may
see that one exists. The audit trail carries every row before and after,
so it is read by coaches only.

The functions are definers so that a policy on one table can ask about
another without the policies recursing; each answers true or false about
the caller and nothing else, and the meta-test names them.

## Trade-offs accepted

- **A rider can hide their training from their parents.** A 16-year-old
  deciding what their parents see is the point; the coach sees
  everything, and a family that disagrees has that conversation at home.
- **Birth year, not birth date.** The link lapses on 1 January of the
  year the rider turns 18, because DCU's classes and Kadence only know
  the year. A few months early, never late.
- **Coaches see everything their riders log.** That is what a coach is
  for. A rider who wants a thing kept from the coach does not log it.
- **The audit trail keeps health data.** It is the trail's job to hold
  the before and after; it is limited to coaches, deleted with the team,
  and a rider's own erasure is a later piece of work (TECH-DEBT.md).

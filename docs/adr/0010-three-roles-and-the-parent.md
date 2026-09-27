# ADR 0010: Coaches, riders and parents — three roles on the foundation's two

Status: accepted · Date: 2026-09-27

## Context

TrainingPeaks has two roles — the coach and the athlete — and users miss
a third: the parent of a 15-year-old. Better Auth's organizations give
three roles, owner, admin and member, that say how much a person may
manage the workspace, not who they are to a rider.

## Decision

A workspace is a **team**. Its **coaches** are its owners and admins:
they add riders, plan for every rider, keep the library and the team's
calendar, and manage the workspace. Everybody else is a **member**, and
what a member is to the team is a row:

- a **rider** has a row in `riders` with their `user_id`;
- a **parent** (guardian) has a row in `guardians` linking their
  `user_id` to one rider;
- a member with neither sees the team's calendar and library and no
  rider — room for a team manager or a physio later.

A coach may create a rider's or a guardian's row before the person has
an account, and send an invitation that carries it; on joining,
`claim_invitation_links` (drizzle/0003) links the account to the row it
was invited for, and only that one.

A rider who trains alone is the owner of their own team and has a rider
row: coach and rider in one person.

## Trade-offs accepted

- **One team per rider.** A rider on a club team and a national squad at
  once needs two accounts, or waits for a later decision. Most youth
  riders have one coach; the ones with two are where the later decision
  will be made.
- **Assistant coaches are admins.** Someone who should plan for riders
  but not manage the workspace cannot be expressed yet.

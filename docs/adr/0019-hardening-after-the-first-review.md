# ADR 0019: Hardening after the first security review

Status: accepted · Date: 2026-09-27 · Amends 0011 · Amended by 0029 (the hour's files are counted when they are kept)

## Context

Before 0.9 an independent review tried to break Kadence as a member of a
team would: a rider, a parent, a teammate. It confirmed twelve findings.
Several live in the foundation every Haij tool shares and are therefore
likely in the siblings too; they are fixed here and named for them.

## Decision

- **Invitations and addresses are the coaches'.** Better Auth answers any
  member with the team's pending invitations — each id the key to a join
  link — and every member's address. A rider could register as a pending
  coach invitation and become a coach. `set-active`, `get-full-organization`,
  `list-members` and `list-invitations` are now trimmed for anyone who is
  not an owner or admin: no invitations, and only themselves among the
  members (src/core/auth/coach-only.ts). The members page and the export
  follow the same rule. _Foundation: check the siblings._
- **Definer functions resolve `pg_temp` last**, and the runtime roles may
  not create temporary tables. A temp table named `memberships` could
  otherwise make `app_is_coach()` say yes. _Foundation: check the siblings._
- **The plugin cannot delete a team.** Its own delete would leave the
  riders' check-ins in the audit trail; `delete_workspace` is the only way.
  _Foundation: check the siblings._
- **Audit rows in one's own name**: the application's insert policy
  requires `actor_user_id` to be the caller. _Foundation._
- **The rider row** (a trigger, `riders_guard`): only the rider changes
  what the parents see; a rider changes only thresholds and sharing; a
  changed birth year withdraws every guardian's confirmation.
- **A parent reads the rider row under the training scope**, so
  thresholds are not visible while the rider does not share training
  (amends ADR 0011's "profile" scope). A parent whose child shares nothing
  is told so.
- **A guardian link is confirmed for a person**: the first time someone
  takes a link, an earlier confirmation goes; the rider can confirm only a
  link someone holds, and sees that account's name and address first.
- **Comments** moved by their author are checked like new ones; the
  team's **model settings** are the coaches' to write.
- **Uploads** are counted as they arrive (no trusted length), three files
  a request, sixty stored an hour; the same ride is recognised by its
  start as well as its hash. **The FIT decoder** refuses fields of no
  bytes, caps the field reads a file may cost, and does not believe times
  or totals no ride can have.
- **Weight for young riders** is judged by today's date, not the date
  typed.

## Trade-offs accepted

- **Trimming, not blocking.** The org switcher keeps working for riders
  and parents because the plugin's answers are trimmed after the fact; a
  plugin upgrade that renames a path would need the list updated
  (tests/team/invitation-leak.test.ts fails if the trimming stops).
- **Members can still read each other's names and addresses in the
  database.** The foundation's `users` policy lets a member read the rows
  of everyone on the team; comments need the names. No page or export
  shows a rider another member's address, but the row is readable to a
  query that bypasses the services. Written down in TECH-DEBT.md.

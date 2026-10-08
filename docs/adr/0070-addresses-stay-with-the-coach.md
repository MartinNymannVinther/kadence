# ADR 0070: Addresses stay with the coach — column privileges on `users`, one definer for the rest

Status: accepted · Date: 2026-10-07 · Amends ADR 0002 (the application role's read on `users`) and ADR 0019 (its trade-off "members can still read each other's addresses") · Backlog P2-07

## Context

The foundation gives the application role `SELECT` on the whole `users`
table, and the policy `app_select_org_members` (drizzle/0001) shows it the
row of everyone on the active team. Kadence needs the names: a comment
carries its author, a card its coach, a guardian link the account that
holds it. Since ADR 0019 no page, export or action shows a rider or a
parent another member's address. But the row was there, and a query that
bypassed the services — in a service with a bug, or in a future feature
written in a hurry — could read it. TECH-DEBT.md carried it as "Members
can read each other's addresses in the database".

Who legitimately reads whose address today, inventoried over every read
of `users` by the application role:

- **A coach**: the members page under Arbejdsrum, the export (dogma
  three: a coach must be able to take the whole team out), and the
  rider's page with their guardians' accounts. The list "Inviter hele
  holdet" checks addresses against the team on the auth role, not the
  application role, and was never affected.
- **A rider**: the accounts holding a guardian link to them. ADR 0019
  decided that the rider confirms a person, not a name a coach typed, and
  sees that account's name and address first. That stays.
- **Anyone**: their own, on the members page and in their own export.
- **A parent**: nobody's but their own. Not the rider's, not the coach's.

Everything else that touches `users` reads the name (comments, the push
reminder's "who wrote it", a reset link's "made by", a guardian's account
name) or runs on the auth role (invitations, the demo's accounts, the
sign-up gate, the installation's owner).

Two ways were open, and the backlog named both.

## Decision

- **Column privileges on `users` for the application role.** `SELECT` on
  the table is revoked and granted back on `id` and `name` only
  (drizzle/0034). The policies are unchanged: a member still reads the
  rows of everyone on the team, and of those rows two columns. Postgres
  refuses `select email`, `select *`, a `where` on the column and an
  `order by` on it alike, with `permission denied for table users`.
  `email_verified`, `two_factor_enabled`, `platform_role` and `image` go
  with it; nothing on the application role read them.
- **One definer function for what the pages need:**
  `team_member_addresses()` returns `(user_id, email)` for the caller
  themselves, for every member of the active team when the caller coaches
  it, and for a rider the people who hold a guardian link to the rider's
  own row. No arguments, so there is nothing to aim it with; no context,
  no rows; `pg_temp` last as drizzle/0007. It is on the allow-list in
  `tests/rls/tenant-isolation.test.ts` with its reason.
- **Three readers move to it**, as a join: the members page
  (`listMembers`), the export's member sheet (`readMembers`) and a
  rider's guardians (`listGuardians`). The join is a left join where a
  row may lack an address (a guardian link a parent reads beside their
  own), so a list keeps its rows and loses a column. Nothing else in the
  application changed.
- **The export's member sheet names the active workspace** in its `where`
  clause, which it did not before. The memberships policy shows a person
  their own rows in every team they belong to, so a coach's export of one
  team carried the coach's own membership row in another. One line, in
  the same query, while it was open.
- `tests/rls/member-addresses.test.ts` proves it as the application role
  with raw SQL: the column is refused in every shape to a rider, a parent
  and a coach alike, their own address included; the function answers each
  role exactly as listed above and stops at the team; the members page,
  the guardians and the export carry what they must for the right people;
  and no view and no third column grant exists.

## Why column privileges rather than a view

A view `team_members (id, name, image)` with `security_invoker`, and the
table itself withdrawn, would have done the same for the address — and
moved every reader of a name with it: comments, reminders, reset links,
guardians, the members page, the export and the Drizzle schema that
declares the table. Each is a place to get wrong, and each a place a
sibling tool has to change too. The column grant touches one migration
and three readers, and the names path is exactly what it was. The
refusal is also louder: a query that reads the column fails on the
database rather than returning an empty column, so a service that drifts
back is caught by the first test that runs it.

## Trade-offs accepted

- **A rider reads their parents' addresses.** ADR 0019's reason stands:
  confirming a parent means knowing who the person is, and a name a coach
  typed is not that. The function answers only for links to the rider's
  own row, and only for links someone holds.
- **`select *` on `users` is gone for the application role**, which any
  future service has to know. The test suite says so the first time one
  tries, and this ADR says why.
- **Family code, changed here first.** The `users` policy and grant came
  with the foundation, so every sibling built on it carries the same
  debt. The migration is written to be lifted as it is (the guardian
  clause is Kadence's and goes); this is the first of the siblings to pay
  it, and the pull request says so.

# ADR 0064: Invite the whole team at once

Status: accepted · Date: 2026-10-06 · Builds on 0004, 0010, 0032 · docs/backlog.md P1-01

## Context

A coach starting a team added and invited one rider at a time: "Tilføj
rytter" with name, birth year and address, copy the link, then the
rider's page for each parent, add, copy again. Twelve riders and their
parents took most of an hour, on the evening the pilot team should get
going before DCU's distance period on 1 November. The backlog asks for
a list pasted once, a link for everybody, and nothing half made.

Two facts shape the answer. A link is Better Auth's organization
invitation (src/core/team/service.ts), which binds one e-mail address
and lives in the auth tables on the auth connection; the riders and
guardians live under RLS on the application connection. And Kadence
sends no mail (ADR 0032): the coach passes every link on by hand.

## Decision

- **"Inviter hele holdet"** on /riders, beside "Tilføj rytter", for
  coaches only (the page shows riders nothing else, and the service
  refuses anybody but a coach). A dialog with one field: one rider a
  line, parents after semicolons, the name, birth year and address of
  each person separated by commas, and a shared birth year for the lines
  without one. Up to 40 riders and two parents a rider.
- **An address is optional, and it is what makes a link.** Better Auth
  cannot make an invitation without one, so a person written without an
  address is created without a link, and the dialog says so beside the
  field and again afterwards. The rider's page invites them later.
- **A pure parser** (`src/modules/team/bulk-parse.ts`) reads the list as
  the coach types, for the preview, and the server reads it again. It
  refuses, line by line with the number and a plain reason: no name, two
  names, a number that is not a year, no year, a year no rider can have
  (the rider form's rule, now `birth-year.ts`), a year on a parent, a
  bad address, two addresses for one person, more than two parents, the
  same rider twice, and the same address on two people. Blank lines are
  skipped and counted. A brother and a sister share their parents: the
  same parent with the same name and address may stand on two lines and
  gets one link, carried by both guardian rows, so joining links both
  children at once (`claim_invitation_links` already links every row
  with the invitation).
- **The service** (`src/modules/team/bulk-invite.ts`) checks the list
  against the team before anything is made — the caller coaches it, no
  rider by that name is on it, no address belongs to a member or has a
  link waiting, and the team's open links stay under Better Auth's limit
  of 200 — and answers with the same line-by-line refusals.
- **All or nothing, in two steps.** Better Auth's invitations cannot
  join the domain transaction, so the links are made first, one address
  at a time and passed this team's id explicitly; if one fails, the
  links already made are cancelled. Then every rider and guardian row is
  created and given its link in one transaction, through the same
  functions as one at a time (`createRiderIn`, `addGuardianIn` and the
  two attach functions, which `createRider` and the others now wrap), so
  the role check, RLS and the audit trail are exactly theirs. If that
  transaction fails, it rolls back and the links are cancelled.
- **Afterwards**, the dialog lists every person with a link, who they
  are to the team, the address and until when it works, and "Del":
  the phone's share sheet where there is one, the clipboard where there
  is not. The text greets the person by first name, says they are
  invited to the team as a rider or as a parent of the rider, which
  address to create the account with, that a parent follows along once
  the rider has said yes (ADR 0011), and until when the link works.
- **"Links, der venter"** on /riders lists every rider and parent with
  an open link who has not joined, with the same "Del" — for these
  links and for the ones made one at a time.
- No schema change, no new table, no new dependency.

## Trade-offs accepted

- **Undoing a link is cancelling it.** A failure halfway leaves the
  cancelled invitations as rows in the auth table, as Better Auth keeps
  every cancelled invitation; their links admit nobody. If the server
  stops between making the links and creating the rows, the links stay
  open without rows; they show under Settings → Arbejdsrum, where a
  coach withdraws them. One transaction across both connections would
  mean writing Better Auth's invitation rows ourselves, past its own
  checks.
- **No link without an address.** A link that admits whoever opens it
  would let anybody with the link become the rider; Better Auth's link
  admits the address it was made for and nobody else. The coach who has
  no address yet adds it on the rider's page later.
- **A name already on the team is refused.** Two riders can share a
  name; the list refuses the second, since pasting the same list twice
  is far likelier. A real namesake is added one at a time.
- **An address already on the team is refused.** A parent who is already
  a member — with an older child on the team — is written without an
  address; linking an existing member as a parent is not something
  Kadence does yet, one at a time either.
- **The links work for 48 hours**, Better Auth's default, the same as one
  at a time. A coach who shares them the next weekend makes new ones
  from the rider's page. The text says until when, so nobody wonders.
- **The text is in the coach's language.** A coach writing in English
  shares English; the join page itself follows the reader.

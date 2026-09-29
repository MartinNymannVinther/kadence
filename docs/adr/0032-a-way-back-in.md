# ADR 0032: A way back in: a one-time link a coach makes

Status: accepted · Date: 2026-09-29 · Builds on 0010, 0019

## Context

Someone will forget their password: a rider of fifteen in November, a
parent who signs in twice a season. Kadence sends no mail (ADR 0001), so
the usual "forgot your password?" had nowhere to send its link, and the
only way back in was the operator's script (`scripts/set-password.ts`).
Two ways were weighed: a link by e-mail through an EU mail provider, and
a link a coach makes and passes on by hand, the way an invitation goes
today. Martin chose the coach's link on 2026-09-29.

## Decision

- **A coach makes a link for a member of the team** under Settings →
  Arbejdsrum, "Link til ny adgangskode", and sends it on by hand. Who may
  make one is the team's own rule for who may remove a member: a coach,
  for anyone on the team but an owner, never for themselves. The service
  checks it (`src/core/team/reset-link.ts`), and so does the database.
- **The link is Better Auth's own password reset.** Kadence mints the
  token in Better Auth's verification table, and Better Auth's
  `/reset-password` takes it once, within the hour, with the sign-up's
  rule of twelve characters. Asking for a link by e-mail stays closed:
  without `sendResetPassword`, Better Auth refuses it.
- **Using the link signs the person out everywhere else**
  (`revokeSessionsOnPasswordReset`), and the audit trail keeps that it
  was used (`auth.password_reset`). Two-step verification still asks for
  its code.
- **The person can see it.** `password_resets` (drizzle/0015) records
  that a link was made, by whom and for whom: forced RLS, written only by
  a coach in their own name for a member who is not an owner, read by
  the coaches and the person, never changed or removed by the
  application (it holds neither right), every insert in the audit trail.
  The person's security page lists the links made for them.
- **Counted**: ten links a coach an hour, five for one person an hour,
  ten uses of `/reset-password` a minute from one address.
- **The page the link opens** sends no referrer, so the token goes no
  further than Kadence.

## Trade-offs accepted

- **The coach is trusted with the link.** A coach could open it and take
  the account over. What stands against that: the person sees on their
  security page that the link was made and by whom, is signed out
  everywhere at once and cannot get in with the old password, and the
  audit trail names the coach. Two-step verification stops it outright.
  A coach can already read and write everything about a rider; what the
  link adds is acting in the person's name.
- **An owner gets no link from the team.** An owner who forgot the
  password signs in with a passkey or asks whoever runs Kadence, who has
  the script. A team whose only owner is locked out depends on the
  operator.
- **No mail, still.** A self-service link by e-mail would ask for an EU
  mail provider, a subprocessor and setup on every installation. It can
  come later beside this one; this one works on every installation
  without any of that.
- **Which link was used is not recorded.** Better Auth tells Kadence
  whose password was reset, not with which token; the record says that a
  link was made, and the audit trail that a reset happened.

# ADR 0111: Better Auth past the issuer, at 1.7.14

Status: accepted · Date: 2026-10-31 · Builds on 0001 (the foundation)

## Context

Better Auth was held at 1.7.1. Versions 1.7.0 to 1.7.2 scoped an account
by an `issuer` column ("local:credential" for a password) with a unique
index on `(issuer, account_id)`, and Kadence's schema was born with both.
1.7.3 went back to 1.6's identity, `(provider_id, account_id)`, and never
writes the issuer again ("We restored the 1.6 account core schema to avoid
requiring a disruptive backfill", release notes for 1.7.3; the 1.7 upgrade
guide's section on the issuer). The same release made Better Auth check
the schema it is given and refuse every request while a column it never
writes is required. With our schema as it was, 1.7.14 refuses
`getSession` with "Drizzle schema mismatch … accounts.issuer": nobody
could sign in.

On 2026-10-27 GHSA-965c-763c-88jm (critical, OAuth state used as a magic
link) was published against `better-auth` from 1.4.0-beta.18 up to and
not including 1.7.7, beside GHSA-r4xp-prcw-77qf (high, OAuth Proxy) and
GHSA-44jh-23m7-hpcf (low). Kadence is not exposed to any of them: it has
no magic link, no social or generic OAuth sign-in and no OAuth proxy,
only email and password, passkeys, TOTP and organizations. But the
required dependency audit went red on every pull request and on main,
and a gate that is red for a reason nobody acts on is a gate people learn
to ignore.

## Decision

- **1.7.14, all three together.** `better-auth`, `@better-auth/core` and
  `@better-auth/passkey` at exactly 1.7.14, the newest 1.7 patch: past
  the fix in 1.7.7, with the patches since, and no 1.8 beta. Between
  1.7.1 and 1.7.14 Better Auth's tables changed only in the account's
  issuer; the organization, passkey and two-factor tables are as they
  were, and the schema check finds nothing else.
- **The column is relaxed, not dropped** (drizzle/0059), as the upgrade
  guide asks: `issuer` loses NOT NULL and keeps every value it holds.
- **The index follows the identity.** `accounts_issuer_account_uq` goes;
  `accounts_provider_account_uq` on `(provider_id, account_id)` comes in
  its place. For passwords it is the same rule as before, one account per
  person, and Better Auth itself refuses a lookup that finds two. The
  migration stops with a plain message, changing nothing, if a database
  already holds two.
- **A trigger keeps rollback open.** 1.7.1 signs a password in only when
  the row's issuer is "local:credential". A `BEFORE INSERT` trigger writes
  that value when a password account arrives without one, so the old
  version can still sign in a person the new version made. Other
  providers are left alone. The column and the trigger leave together in
  a later migration, once nobody needs to go back.
- **The old app survives the migration.** It writes and reads the issuer
  as before and never relied on the index, so the minutes between the
  migration and the new container are safe.
- **Dependabot still leaves Better Auth's versions alone.** Its security
  updates still arrive. A bump of the three is tried with a real login,
  because a schema Better Auth disagrees with takes every login down.

## Consequences

- The audit no longer reports Better Auth.
- A column nobody reads and a trigger that fills it stay in the auth
  schema until the clean-up. That is the price of a rollback that needs
  no SQL by hand.
- The unique index is stricter than Better Auth's own default schema. A
  future Better Auth that wants two rows for one provider and id would
  fail on it loudly, at the insert, rather than lock the person out.
- Every future Better Auth bump meets the schema check at startup: a
  disagreement shows on the first request, in every environment, before
  anyone tries to sign in.

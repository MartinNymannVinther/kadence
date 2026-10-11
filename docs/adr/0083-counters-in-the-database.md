# ADR 0083: Counters in the database — rate limits, in-flight work and nonces without a process

Status: accepted · Date: 2026-10-11 · Amends ADR 0002 (the runtime roles get timeouts), ADR 0005 (the demo's nonce) and ADR 0039 (when a coach's visit reads races)

## Context

Kadence was written for one process, and said so in five places. The
rate limits (`src/core/rate-limit.ts`, some thirty call sites), the two
bodies a person may have read at once (`src/modules/devices/in-flight.ts`),
the installation's six readings a minute at Cykling Danmark and the one
reading per rider at a time (`src/modules/results/read.ts`), when a
rider last read their own races (`own.ts`) and when a test push went out
(`src/modules/push/test-push.ts`) were all Maps in memory, and the
demo's key to the sign-up door was drawn at random when the process
started (`src/core/auth/signup.ts`). A restart forgot every count. A
second instance would have had limits of its own, refused the other
instance's demo, and let a person read four bodies at once instead of
two.

Martin approved the plan for running Kadence as a service for many
clubs on 11 October 2026 (`docs/plan-alene-og-som-tjeneste.md` §5.0,
backlog S-03). Its step 0 is to take these out of memory before a
second instance or a restart becomes a problem, without a new
dependency, and to give the database the settings and indexes it was
missing on the way.

## Decision

- **One unlogged table, `app_rate_limits (key, count, reset_at)`**
  (drizzle/0043). `src/core/counters.ts` is the only code that writes it,
  each operation one statement on the application role's pool:
  - a count in a window is one `insert … on conflict do update` that
    starts a new window when the old one has ended, so two instances
    counting at the same moment both count;
  - a place held while a body is read is the same row used as a lease:
    taken only while fewer than the ceiling are held, given back in a
    `finally`, and given back by the clock five minutes after the last
    one was taken if an instance dies holding it;
  - a moment to remember (a rider's own reading, a test push) is a row
    whose `reset_at` is when it is forgotten.
    Time is the database's, so instances with different clocks agree.
    Every minute or so a count sweeps the expired rows, and Better Auth's
    own `rate_limits` rows older than ten minutes, which nothing cleaned
    before.
- **The table is the installation's, not a team's.** No `org_id`, like
  Better Auth's `rate_limits`: most keys are counted before anybody has a
  team (an address at a public door, a key at the ingest door). RLS is
  enabled and forced with one policy for the application role, so the
  meta-test holds for it as for every table; the auth role has no grant.
  It has no audit trigger, named in the test's list beside
  `rate_limits`.
- **`rateLimit` and `peekRateLimit` keep their names and answers** and
  became asynchronous; every call site awaits them. The forwarded-address
  logic (P2-08) is untouched.
- **Fail closed.** When the database does not answer, a limit refuses
  with a five-second Retry-After and logs the error's name, and a place
  is not given. Every door behind a limit needs the database for its own
  work anyway; a limit that lets everything through while its store is
  down is no limit.
- **The demo's nonce is an HMAC-SHA256 under `BETTER_AUTH_SECRET` over
  the UTC day**, today's and yesterday's accepted, compared in constant
  time. Every instance computes the same one; nobody without the secret
  can.
- **The DCU queue's order stays in the process.** The line a coach's
  visit fills is a list of work for this instance; what must hold across
  instances — one reading per rider, six a minute — is counted in the
  table. A coach's visit from the layout puts the team in the line at
  most once an hour per team (a key in the table), not on every
  navigation; a reading stays fresh for three hours.
- **Timeouts.** `statement_timeout = 30s` and
  `idle_in_transaction_session_timeout = 15s` on `kadence_app` and
  `kadence_auth` (drizzle/0043); both pools give up on a connection
  after 5 s and close idle ones after 30 s. Measured on the development
  machine: the largest ride the decoder accepts (170,000 records, 47
  hours, 4.9 MB) imports in 0.7 s, three ten-hour rides from a Strava
  archive in 0.4 s, the export of a team with 34 rides in 0.07 s and
  `delete_workspace` in 0.06 s. None needed a `set local` of its own.
- **Postgres settings for a 4 GB VPS** in `docker-compose.yml`
  (`shared_buffers`, `effective_cache_size`, `work_mem`,
  `maintenance_work_mem`, `max_connections=60`, `pg_stat_statements`,
  statements over 500 ms logged), with what to raise at 8 and 16 GB in
  the comment and in `docs/deploy.md`. drizzle/0043 creates the
  extension where it can.
- **The indexes the foreign keys and policies were missing**
  (drizzle/0044): every column pointing at `users`, the `org_id`s
  `delete_workspace` cascades through, a ride's and a session's comments,
  and riders and guardians by person.
- **The policies call the helpers without an argument once per query**
  (drizzle/0045): `app_is_coach()` and the five others with no argument
  are wrapped in a sub-select, which Postgres runs once as an InitPlan.
  Done in place over every policy, so it is right whatever the earlier
  migrations said; a test fails a policy written later with a bare call.
  The helpers that take a row's `rider_id` are left as they are: their
  argument changes from row to row.
- **Better Auth's cookie cache** holds the session in a signed cookie for
  five minutes. Removal from a team still takes effect on the next page,
  because `getOrgContext` reads the membership on every page. Better Auth
  sets a joined or left team in the database and not in the cookie, so a
  session naming no team, or one the person is no longer on, is read
  from the database before it is believed, and accepting an invitation
  sets the team again through Better Auth's own door so the cookie
  carries it.
- **The layout asks at once.** The seven independent reads the shell
  needs run together. Measured on the development machine: 22 round
  trips either way, 31.6 ms one after the other and 6.4 ms at once; the
  session and team check went from 5 round trips to 1 with the cookie
  cache; a coach's navigation no longer reads the team's riders (5
  round trips) more than once an hour. A definer function `app_shell()`
  that returned all of it in one call was weighed and left: it would
  save about ten round trips of transaction framing, but the pages read
  the same values through the per-request caches the layout fills, and
  it would put the team's name, pictures and settings in a second place.

## Trade-offs accepted

- **One more write per limited request.** A count is an upsert where it
  was a Map lookup: about a millisecond on the same machine, and a row
  rewritten in a table that is unlogged and small, so no WAL and little
  vacuum. The sweep is two deletes a minute per instance.
- **Fail closed means the database down is every limited door down.**
  It was nearly so already; the doors behind the limits write to the
  same database.
- **A place lost with an instance comes back by the clock**, up to five
  minutes after the last place was taken. Until then the person has one
  body fewer at a time.
- **The cookie cache's window.** A session revoked elsewhere — the other
  devices signed out when a coach's reset link is used, or a password
  reset — keeps working for up to five minutes on a device that had it
  cached. The team is never taken from the cookie, and Better Auth's
  sensitive endpoints read the session from the database regardless.
  In a page render the cookie cannot be rewritten, so once its five
  minutes are up the session is read from the database again until the
  next action or sign-in sets a fresh one.
- **The addresses in the keys.** Some keys carry the caller's address,
  as they did in memory. They live no longer than their window, the
  sweep deletes them, and the table is unlogged: not replicated, and
  left out of the nightly dump (`scripts/backup-kadence.sh`).
- **The DCU queue is per instance.** Two instances may each put the same
  rider in their line; the per-rider place and the rider's
  `races_checked_at` keep the page from being read twice.
- **Statement timeouts bound everything the roles do.** An export of a
  very large team is one long statement today; backlog S-04 makes it
  paged before that matters.

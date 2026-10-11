# ADR 0082: Kadence as a service: what stays one server, what becomes optional, and when

Status: accepted · Date: 2026-10-11 · Builds on 0001, 0002, 0003, 0048 · Plan: docs/plan-alene-og-som-tjeneste.md

## Context

ADR 0048 let kadence.haij.dk host several clubs because not every club
would run its own installation. In October 2026 Martin learned that
most clubs will not run one at all: they want Kadence the way they have
TrainingPeaks, Strava or Garmin Connect, as a service they log into. At
the same time Kadence opens to a person alone (ADR 0080), and persons
find a service by themselves, in numbers a coach's hand-shared links
were never meant for.

The code was written for one container behind one proxy, and said so in
five places: the rate limiter, the upload ceiling, the DCU queue, the
reminder timer and the test-push memory. Ride files are bytea rows in
Postgres and in every nightly dump. The audit trail hex-encodes each
file before dropping it. The export reads everything into memory. There
is no monitoring. None of that is wrong for one pilot team; all of it is
wrong for fifty clubs.

## Decision

**The dogmas set the shape.** Everything that follows runs on one server
with `docker compose up` and no cloud key (dogma two). What a hosted
installation adds is optional and off by default: a worker container of
the same image, an EU object store for files, an EU mail provider, a
connection pooler. A club that runs its own Kadence gets the same code
and needs none of it (dogma one). Every new provider is EU-owned, on EU
soil and listed in `docs/subprocessors.md` before use (dogma four).

**Three steps, each useful alone, each with its own ADR:**

- **Step 0, before more clubs come on, without any new dependency**
  (ADR 0083, 0088): counters, limits and nonces in the database instead
  of the process; timeouts on the pools and the roles; Postgres tuned for
  the machine it runs on; the indexes the cascades lack; the RLS helpers
  evaluated once per query; a session cookie cache; the audit trail
  without files; deletion with the triggers off and one event; an export
  in fixed columns with the files beside it; logs that rotate, a health
  check that tells live from ready, and a monitoring section in the
  deploy guide.
- **Step 1, during the first winter with real clubs**: a jobs table and
  a worker of the same image; mail through an EU provider, never about
  training or health; files in the database or in an EU object store
  behind one adapter, with a quota per workspace; WAL-based backups that
  restore to the minute; AI calls with tokens and cost per workspace.
- **Step 2, when the numbers ask for it**: the database on its own host
  behind pgbouncer in transaction mode (the tenant context is already set
  per transaction), two or more app instances, the audit trail
  partitioned by month with the retention the terms promise.

**What decides the step** is measured, not guessed: workspaces, file
bytes, connections in use, the 95th percentile of the Today page, the
length of a reminder run and the size of the nightly dump, each with a
threshold in the plan's section 5.5 and a line on the owner's
Installation page.

**A fee is allowed and planned for.** Dogma one permits a paid edition
on the same code. The hosted installation will take a simple fee to run
and maintain the service; what it hangs on is the quota per workspace
and a `plan` column the installation's owner sets. Nothing is only for
those who pay, and the charging itself is a later story.

**Who is responsible changes with the customer.** For a club, the club
is the controller and Haij the processor, under a data processing
agreement. For a person alone, Haij is the controller, with a privacy
notice, explicit consent for health data and the age rule for a child's
own consent (ADR 0087, when written).

## Trade-offs accepted

- **Two ways to run the same code.** A self-hosted Kadence runs its jobs
  in the app's own timer and keeps files in Postgres; the hosted one has
  a worker and an object store. Both paths are tested; the second is the
  one that will see the load, so the first must stay simple enough to
  trust without it.
- **Hetzner holds more.** Files and backups in Hetzner Object Storage
  put more of what a rider is at one provider. It is the provider that
  already holds everything, in the EU, with an exit plan that is
  `rclone` and a dump.
- **Nothing is scaled before it is measured.** No Kubernetes, no Redis,
  no CDN. A measurement that asks for one gets its own ADR.
- **Append-only is not for ever.** Rows about riders leave the audit
  trail after 24 months once it is partitioned (step 2); rows about
  access and deletions stay. A trail that cannot be edited is the
  dogma; a trail that cannot be forgotten is not.

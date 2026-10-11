# ADR 0085: A jobs table and a worker

Status: accepted · Date: 2026-10-11 · Amends ADR 0039 (when races are read), ADR 0060 (what starts the reminder run) and ADR 0072 (when the teams page is refreshed)

## Context

Kadence did its background work in four different ways, each written for
one process:

- the reminder run on a `setInterval` in the app (ADR 0060), started by
  the instrumentation hook in every process that served pages;
- a ride Wahoo, Garmin or Polar said was saved, fetched and imported after
  the 200 with Next's `after()`. A deploy in that second lost the ride,
  and a provider down for a moment cost it too: the provider had its
  answer and never asked again (TECH-DEBT, "Wahoo and Garmin");
- readings from Cykling Danmark waiting in a list in memory
  (`src/modules/results/queue.ts`), filled by a coach's visit and lost in
  a restart (TECH-DEBT, "What is still per process"; ADR 0083 took the
  counts out of memory and left the line);
- the teams page refreshed behind a visitor's answer, one at a time by a
  promise held in the module, and the demos cleaned up when somebody
  opened a new one.

Martin approved step 1 of the plan for running Kadence as a service
(`docs/plan-alene-og-som-tjeneste.md` §5.1, backlog S-06) on 11 October
2026, with Kadence's own table rather than `pg-boss` (§10, answer 3): no
new dependency, and the queue is about two hundred lines we can read.

## Decision

- **A table, `jobs`** (drizzle/0047), with `id`, `kind`, `payload`,
  `org_id`, `run_at`, `attempts`, `max_attempts`, `locked_by`,
  `locked_until`, `started_at`, `done_at`, `last_error` and `created_at`.
  An installation table like `app_rate_limits`
  (ADR 0083): RLS enabled and forced with one policy for the application
  role, named in the meta-test's list of tables without an audit trigger.
  `org_id` says whose work a job is and cascades with the workspace, so a
  deleted team takes its jobs along. `started_at` is not in the plan's
  list; it is what "when did a worker last take a job" is read from.
- **Taking jobs is `claim_jobs(worker, limit)`**, a SECURITY INVOKER
  function only the application role may call: a lease that ran out is
  first counted as a try, then up to `limit` due jobs are locked with
  `FOR UPDATE SKIP LOCKED` and leased for five minutes. Two workers never
  take the same job and never wait for each other.
- **Putting work in is `enqueue(kind, payload, options)`**
  (`src/core/jobs/queue.ts`), the options being `runAt`, `delayMs`,
  `orgId` and `dedupeKey`. The payload passes its
  kind's zod schema first. A dedupe key is kept as `payload.key`, and a
  partial unique index on `(kind, coalesce(org_id, ''), payload->>'key')`
  over the undone jobs makes the same work wait once: the same rider read,
  the same ride fetched, the same team refreshed.
- **Payloads hold ids, days, counts and short words.** Every field is
  built from `field` in `src/core/jobs/payload.ts` (id, day, count, word,
  ref, file) and every payload is a closed object; a test walks every
  registered kind and fails a field built any other way, and another
  fails a kind declared in the code with no handler. Two sorts go beyond
  ids, both for a ride from a provider: `ref`, the https address the
  provider gave for the file, checked again against its hosts before
  anything is fetched; and `file`, the ride's file name as the device
  named it, which the import makes the ride's title a moment later under
  the rider's own policies. Never a person's name, an e-mail address, a
  token or a health fact — a Wahoo summary's heart rate stays out.
- **The worker** (`src/core/jobs/worker.ts`) takes up to five due jobs,
  runs them one after the other, renews the lease every minute while it
  holds them, and writes how each went: done; put back without a try
  counted (`later(ms)`, a reading when the minute's six are taken); or
  failed, tried again after 1, 5, 15, 60 and 240 minutes, and after the
  kind's last try left undone with its error as a short word, logged and
  counted as failed. A run longer than its kind allows is a failure. A
  handler that knows trying again will not help throws `GiveUp`. On
  SIGTERM it gives back what it took and did not start and waits eight
  seconds for the job it is running.
- **Recurring work is rows** (`src/core/jobs/schedule.ts`): one waiting
  row per recurring kind, key `recurring`, and when it has run — or given
  up — the next is written in the same transaction, due `every` later.
  Reminders every ten minutes, races hourly, the teams page daily, demos
  hourly, the sweep every fifteen minutes. `ensureSchedule` puts a missing
  row back at every start.
- **Where it runs.** `docker-compose.yml` gets a `worker` service: the same
  Dockerfile, source, production tree and environment as the app, run by
  `tsx scripts/worker.ts`, one replica, `restart: unless-stopped`.
  `WORKER=on` tells the app to only enqueue. Unset, the app starts the
  same worker in its own process from the instrumentation hook, a minute
  after it starts, exactly where the reminder timer was: an installation
  of one container still works as it did (dogma two).
- **Not the runner image.** Next's standalone output keeps only the files
  the server's routes trace, compiled into chunks a plain script cannot
  import; a bundle of `scripts/worker.ts` would need a bundler as a new
  dependency. `tsx` is already a production dependency — the migrator
  runs on it — so the Dockerfile's `worker` stage is the production
  dependencies, `src/`, `messages/` and the two scripts, run by `tsx`, as
  the app's user, with the teams volume's directory made the same way.
  "Same image" in the plan means the same Dockerfile, code and
  dependencies; the image is a sibling stage like the migrator.
- **What moved, and how each is idempotent:**
  - _Reminders_ (`push.reminders`): `runRemindersOnce()` as it was. Each
    reminder is written down before it is sent, with a check nobody wrote
    it first (ADR 0060), so a run repeated sends nothing twice. The timer
    is gone; `POST /api/push/tick` stays.
  - _Device webhooks_ (`device.fetch`, one job per event): the route
    verifies, enqueues and answers 200, or 503 when the queue cannot be
    written so the provider sends again. The handler is the old
    per-event work, as the rider. A download that failed because the
    provider was unavailable (timeout, network, 5xx, 429) is noted on the
    link and thrown, so it is tried again; any other outcome is final. A
    second run finds the ride by the provider's id and answers
    "duplicate".
  - _Readings from Cykling Danmark_ (`dcu.read_rider`, a team's job): a
    coach's reading runs `refreshRaces` as the coach, a rider's
    `refreshOwnRaces` as the rider, under the ordinary policies. Both read
    only a rider whose races are three hours old and write with upserts on
    the portal's reference, so a second run finds the rider fresh.
    Readings put in together are ten seconds apart, the installation's
    six a minute and one per rider stay in the counters, and a reading
    that finds them taken is put back for ten seconds. Someone no longer
    allowed (a coach removed) is an answer, not a failure.
  - _The hourly races_ (`dcu.races`): `dcu_teams_due()`, a definer
    function that answers a team with riders who have a UCI ID and one
    coach of it (owner first) — two ids, nothing else — and the stale
    riders of each are queued as that coach. A coach's visit, the
    calendar and a rider's page still queue theirs; `after()` remains
    there only for the putting in.
  - _The teams page_ (`teams.refresh`): daily, and once when a page finds
    the snapshot stale (key `stale`). One refresh at a time across every
    process is a place in the counters, where the module's promise was;
    a refresh reads only the sources that want reading. Only an empty
    snapshot is still read in the request.
  - _Demos_ (`demo.cleanup`): hourly. A new demo still cleans up first,
    because it counts the live demos against the ceiling right after; both
    stay. `delete_expired_demo()` does nothing for a demo already gone.
  - _The sweep_ (`installation.sweep`): the counters' and Better Auth's
    expired rows, and jobs done a day ago or given up a month ago.
- **Seen from outside.** `/api/health` adds `jobs` with `pending`,
  `failed` and `oldestPendingSeconds` when the database answers, never a
  reason for 503. The owner's Installation page shows the same and when a
  worker last took a job. `scripts/retry-jobs.ts` lists the jobs that gave up and
  gives them new tries.

## Trade-offs accepted

- **At least once, not exactly once.** A job is never lost — it is a row
  before anybody is told it will be done, and a lease that runs out gives
  it back — but a job can run twice: a worker that dies after the work
  and before writing it down, or a run longer than its timeout whose
  promise keeps going. Every handler above is written for that.
- **One worker, one job at a time.** A slow page at Cykling Danmark or a
  long reminder run holds up a ride's import by as long as it takes,
  bounded by the kind's timeout. A second worker would be safe and is one
  line in the compose file; it is not added until the queue's
  `oldestPendingSeconds` says it is needed (plan §5.5).
- **A worker container that is down is silent work.** With `WORKER=on`
  and no worker, the app enqueues and nothing runs. The health check and
  the Installation page show it within fifteen minutes; nothing pages
  anybody until Uptime Kuma is pointed at it.
- **A poll, not a notification.** The worker container looks every five
  seconds when idle, so a ride arrives up to five seconds after its
  webhook. The app's own worker is woken by an enqueue in its process.
  `LISTEN/NOTIFY` would take the wait away for a connection held open; not
  needed at this size.
- **A provider's file address in a table without an audit trigger.** The
  `ref` field holds what the provider sent, for as long as the job lives:
  done jobs are deleted after a day. It is the same address the work
  held in memory before, now on the database's disk for that day.
- **A worker image that compiles at start.** tsx transpiles `src/` when the
  worker starts, a second or two and a few megabytes of cache, instead of
  a build step that would need a bundler.

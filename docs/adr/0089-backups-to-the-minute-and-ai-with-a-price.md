# ADR 0089: Backups to the minute, and AI with a price

Status: accepted · Date: 2026-10-11 · Amends ADR 0009 (the installation's roof becomes an optional brake; a monthly budget per workspace takes its place) · Builds on ADR 0006, 0048, 0080, 0083 · Backlog S-10, plan §5.1 (approved by Martin on 11 October 2026)

Two decisions of the plan's step one, taken together because both are
about what it costs to keep many clubs on one installation: what is lost
when the disk goes, and what the AI spends.

## Context

**Backups.** Until now there was one backup: `scripts/backup-kadence.sh`,
a `pg_dump` once a night, encrypted with `age` and copied to an EU bucket.
It is a good second copy and a poor only copy: a disk lost at six in the
evening loses the day — every check-in, every ride, every session a coach
planned — for every club on the installation. Restoring to a minute needs
the database's write-ahead log kept continuously, which `pg_dump` cannot
do. The quarterly restore drill was a sentence in the deploy guide, not a
script.

**AI.** `ai_calls` counted calls: 60 per person an hour, 600 per workspace
a day, and the installation's roof of 2,000 a day across every workspace
(ADR 0009). The roof is shared: one busy club could close the AI for
everybody, and the sentence they got did not say why. And a call was a
call: nobody could see what the AI cost, per club or in total, which is
the number a hosted installation and a fee (plan §10, answer 7) hang on.
The adapters already returned the providers' token counts; nothing kept
them.

## Decision

### Backups to the minute: pgBackRest, beside the dump

- **pgBackRest in an overlay compose file.** `docker-compose.backup.yml`
  rebuilds the database as `postgres:16` with pgBackRest installed, adds
  `archive_mode=on`, `wal_level=replica`, `archive_timeout=60` and
  `archive_command=pgbackrest … archive-push`, and starts a `pgbackrest`
  sidecar from the same image that creates the stanza, checks archiving
  and takes a full backup every night (03:40 Copenhagen time). Compose
  cannot make a flag conditional on a profile, so the overlay repeats the
  database's command; `tests/meta/compose-backup.test.ts` fails if the two
  drift. `docker compose up` without the overlay is exactly what it was.
- **The image is ours, two lines on the official one.** pgBackRest has no
  official container image, and the community ones (`woblerr/pgbackrest`
  and others) carry only pgBackRest — but Postgres runs `archive_command`
  in its own container, so the binary must be in the database's image
  anyway. `docker/pgbackrest/Dockerfile` is `FROM postgres:16` plus
  `pgbackrest=2.59.3-*` from apt.postgresql.org, the repository the
  official image is built from and already trusts. One image for both
  services keeps them on the same pgBackRest version, which the
  repository format asks for, and adds no publisher to the chain. The
  version is pinned; a new one is read about before it is built.
- **Repository:** an S3-compatible bucket in the EU — Hetzner Object
  Storage, `fsn1` or `nbg1` — with every setting and key from the
  environment (`S3_BACKUP_*`), none with a default. **Encrypted** on the
  server with `aes-256-cbc` and `PGBACKREST_REPO_CIPHER_PASS`.
  **Retention** is time-based, 29 days of window: pgBackRest keeps the
  newest full backup older than the window, so nothing is older than the
  thirty days the terms promise.
- **The dump stays** as the independent copy: another tool, another key,
  another bucket. The self-hoster without the overlay has the dump.
- **The drill is a script.** `scripts/restore-drill.sh` starts a
  throwaway container from the sidecar's image with the sidecar's
  settings (handed over on a pipe, never written down), restores the
  newest point or `--target <time>` into scratch space, starts Postgres
  with archiving off so the drill can never push into the repository it
  tests, counts users, workspaces, riders, rides and migrations, prints
  the recovery point and is removed. `docs/deploy.md` §7 has the setup,
  the drill and point-in-time recovery of the real database.
- **What was run here:** with a posix repository in a volume instead of
  S3 (`PGBACKREST_REPO1_TYPE=posix`), the two compose files brought up the
  database and the sidecar, which created the stanza, passed `check` and
  took a full backup; Kadence's 46 migrations then on the branch were run and rows written
  after it; the drill restored the latest point (all rows, recovery point
  printed) and a point between two inserts (the first row only), and
  left the repository's WAL range unchanged; the deploy guide's
  point-in-time recovery restored the real database volume to a target
  and came back on timeline 2. Hetzner itself was not reachable from the
  development machine.

### AI with a price: tokens, micro-euro and a budget per workspace

- **Reserve, then record.** The call is still counted before the model is
  asked (ADR 0009's shape); `reserveAiCall` now answers the row's id, and
  `recordAiUsage` writes `tokens_in`, `tokens_out`, the answering `model`
  and `cost_micro` onto it afterwards, from the provider's own counts
  (Mistral's `usage`, Ollama's `prompt_eval_count`/`eval_count`). A
  failed call keeps nulls; a cost that cannot be written is logged and
  never fails the answer.
- **Money in micro-euro**, whole numbers in a `bigint`, so a month adds up
  without rounding.
- **A price list in the database, from a pure file.** `ai_prices
(provider, model, input_micro_per_mtok, output_micro_per_mtok,
valid_from, source)` is seeded by drizzle/0049 from
  `src/modules/ai/prices.ts`, where each number sits beside its source;
  a test keeps the two equal. Prices are **per million tokens**, the unit
  Mistral publishes, because per thousand Mistral Small's input would be
  127.5 micro-euro and not a whole number. Mistral's list was read on
  11 October 2026 at https://docs.mistral.ai/models/pricing: USD, shown in
  EUR by Mistral as USD × 0.85, which is what is stored. The EU endpoint
  costs 10 % more ("Regional inference (+10%)"); that belongs to the
  endpoint, not the model, so it is applied per call from
  `MISTRAL_BASE_URL`. Ollama costs 0. A model with no row, or a row with
  null prices (Mistral Large 4, listed at a sale price with no dates), has
  a null cost, and the Installation page says "pris ukendt" for those
  calls rather than guess. The table is the installation's — no `org_id`,
  SELECT for the application role and nothing else, its history the
  migration's history in git — and an owner who needs a new price before
  a release inserts a row with a later `valid_from`.
- **A monthly budget per workspace** replaces the shared roof as what
  stands between a busy club and everybody else: `AI_MONTHLY_BUDGET_MICRO`
  (default 5,000,000 — 5 € is a few thousand proposals on Mistral Small),
  counted per Copenhagen calendar month from what the **installation's**
  key spent. A workspace over it gets "AI'en holder pause til næste
  måned. Alt andet virker." and everything else works. The installation's
  owner gives a workspace another budget under Indstillinger →
  Installation (`team_settings.ai_budget_micro`, null = the default). A
  workspace on its own Mistral key (ADR 0006) pays its own bill:
  `ai_calls.billed_to` says whose key paid, and the budget counts only the
  installation's.
- **Only the owner moves a budget, and the database says so.** Coaches
  write `team_settings` (drizzle/0003), so a guard trigger refuses any
  change to `ai_budget_micro` by the application role, and
  `set_ai_budget()` — a definer function that refuses anyone but the
  installation's owner — is the one way in. The audit trigger on
  `team_settings` records the change under the workspace.
- **The other ceilings stay**: 60 calls per person an hour, 600 per
  workspace a day. `AI_DAILY_CALL_CAP` stays as an emergency brake across
  the installation, **off (0) by default** instead of 2,000.
- **The owner's overview** (`platform_overview()`, ADR 0048) gains
  `ai_cost_month_micro`, `ai_unpriced_month` and `ai_budget_micro`; the
  Installation page shows this month's AI per club against its budget,
  with the field to change it, persons as one line (ADR 0080), and one
  total for the installation. Settings → AI shows a workspace its own
  month.

## Trade-offs accepted

- **A second backup tool, and a database image of our own.** pgBackRest
  is a container image and an apt package, not an npm dependency, as
  Postgres is; but it is more to understand, upgrade and keep in step
  with Postgres, and with the overlay on, the database is no longer the
  stock `postgres:16` image. Kept because the dump cannot restore to a
  minute, and one tool for both jobs would make the second copy depend on
  the first.
- **Credentials and the passphrase live on the server.** The dump's
  private key never touches the server; pgBackRest's passphrase must,
  because the server encrypts as it archives. Someone with the server
  could read the backups — and has the database already. The bucket
  still holds only ciphertext, and the S3 key can only reach that
  bucket.
- **WAL waits on the database's disk when the bucket is away.** Postgres
  keeps every segment it could not archive; a long outage fills the disk
  under the database. The sidecar's ping and the weekly disk check
  (deploy guide §7b) are what notice.
- **A repeated command.** The overlay copies the database's flags; the
  meta-test is what keeps a tuning change in one file from silently
  missing in the other.
- **Prices go stale.** Mistral changes prices and adds models; the list is
  a file and a migration, read on one day. An unknown price is shown as
  unknown, not guessed, and a newer row can be added without a release;
  but a price that changed without anyone noticing is wrong until someone
  does. The EUR figures are Mistral's own conversion, not the invoice's.
- **Budgets are soft.** The cost is known only after the call, and two
  calls at once both read the month below the line, so a workspace can
  end a little over — by the calls in flight, a few cents. Serialising
  the AI to prevent it would cost everyone a queue.
- **A monthly sum per call.** Every call sums the workspace's month on
  `ai_calls (org_id, created_at)`; at 600 calls a day that is at most
  18,000 index rows. A running total would be cheaper and one more thing
  to keep right.
- **A shared roof no longer protects the installation by default.** With
  many workspaces, the installation's month is the sum of their budgets;
  an owner who wants a hard daily stop sets `AI_DAILY_CALL_CAP`.

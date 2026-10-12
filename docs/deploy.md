# Deploying Kadence

Target: a single EU VPS (Hetzner initially — the provider must stay
replaceable) running [Coolify](https://coolify.io), deploying
`docker-compose.yml` from this repository. Everything runs in Docker; moving
to another EU provider means restoring one Postgres dump on another box.

Kadence is built to share a server with the other Haij tools: its own
compose stack, its own database, its own domain, nothing in common at
runtime but the machine.

## 1. Server

- Create a VPS in an EU region (e.g. Hetzner Falkenstein/Nuremberg or
  Helsinki). 2 vCPU / 4 GB RAM is plenty to start, also next to Haij.
- Point DNS for your app hostname (e.g. `kadence.haij.dk`) at the server.
- Install Coolify (their one-line installer) and log in.

### Postgres settings

`docker-compose.yml` starts Postgres with settings for a 4 GB VPS shared
with the app (docs/adr/0083), not Postgres's defaults:

| Setting                               | 4 GB (as shipped)    | 8 GB  | 16 GB |
| ------------------------------------- | -------------------- | ----- | ----- |
| `shared_buffers`                      | 1GB                  | 2GB   | 4GB   |
| `effective_cache_size`                | 3GB                  | 6GB   | 12GB  |
| `work_mem`                            | 16MB                 | 32MB  | 32MB  |
| `maintenance_work_mem`                | 256MB                | 512MB | 1GB   |
| `max_connections`                     | 60                   | 60    | 60    |
| `shared_preload_libraries`            | `pg_stat_statements` | same  | same  |
| `log_min_duration_statement`          | 500 (ms)             | same  | same  |
| `idle_in_transaction_session_timeout` | 15000 (ms)           | same  | same  |

Change them in the `command:` of the `db` service; they take effect when
the database container is recreated, which a redeploy in Coolify does.
`max_connections` counts two pools of ten per app instance: 60 is room
for two instances, the migration step and a `psql` or two. Raise it by
twenty for each instance beyond the second, whatever the memory.
`shm_size: 256mb` is there because Docker's 64 MB of `/dev/shm` is too
little for a parallel query with this `work_mem`.

The runtime roles carry their own timeouts, set by the migration
(drizzle/0043): a statement is ended after 30 seconds and a transaction
left idle after 15. Statements slower than half a second are in the
database's log. To see which queries cost the most:

```bash
docker exec -it <kadence db container> psql -U postgres -d kadence -c \
  "select calls, round(total_exec_time) as ms, left(query, 80) from pg_stat_statements order by total_exec_time desc limit 20"
```

The rate limits and the other counters live in the unlogged table
`app_rate_limits`: shared by every instance, kept across a restart of
the app, emptied by a crash of the database, and left out of the nightly
backup (section 7). Nothing needs doing about it.

## 2. Create the application

1. In Coolify: **New resource → Docker Compose**, connect this Git
   repository, branch `main`. Coolify picks up `docker-compose.yml`.
2. Set the environment variables (Coolify → Environment Variables):

   | Variable                  | Value                                                                                  |
   | ------------------------- | -------------------------------------------------------------------------------------- |
   | `POSTGRES_PASSWORD`       | `openssl rand -hex 24`                                                                 |
   | `KADENCE_APP_PASSWORD`    | `openssl rand -hex 24`                                                                 |
   | `KADENCE_AUTH_PASSWORD`   | `openssl rand -hex 24`                                                                 |
   | `BETTER_AUTH_SECRET`      | `openssl rand -base64 32`                                                              |
   | `BETTER_AUTH_URL`         | `https://kadence.haij.dk` (public URL; passkeys bind to this origin)                   |
   | `LLM_PROVIDER`            | `mistral` hosted, `ollama` self-hosted, or leave unset for `none`                      |
   | `MISTRAL_API_KEY`         | only with `LLM_PROVIDER=mistral`                                                       |
   | `AI_MONTHLY_BUDGET_MICRO` | each workspace's AI budget per month in micro-euro (default 5 €); `0` for none         |
   | `AI_DAILY_CALL_CAP`       | optional emergency roof on model calls per day across the installation; off by default |

   Hex, not base64, for the three database passwords, and that is not a
   style preference. `docker-compose.yml` builds the connection strings by
   pasting the password into `postgres://user:PASSWORD@db:5432/kadence`, and
   `openssl rand -base64` emits `/`, `+` and `=`. A slash ends the
   authority part of a URL, so the app then fails to start with a
   complaint about `APP_DATABASE_URL` while the thing that is wrong is a
   password. 24 bytes of hex is 192 bits; nothing is lost but the trap.
   `BETTER_AUTH_SECRET` never goes into a URL, so base64 is right there.

   **Coolify pre-fills every one of these with the wrong value.** When it
   reads `docker-compose.yml` to create the resource, it takes the text
   after `:?` on each line (compose's "you forgot this" message) and
   stores it as the variable's value. You will find `POSTGRES_PASSWORD`
   set to `set POSTGRES_PASSWORD (openssl rand -hex 24)`, and the same for
   the other three. The stack starts happily on those, every service
   agreeing on a password anyone can read in this repository. Replace all
   four before the first deploy. If a deploy has already run on them,
   also remove the database volume, because Postgres only reads its
   password when it first initialises. The migration step and the
   application both refuse to run on placeholder text and name it, so a
   missed one fails loudly rather than quietly.

   These set the default every workspace inherits. A workspace can choose
   its own provider, model and key in Settings → AI; keys stored that way
   are encrypted with a key derived from `BETTER_AUTH_SECRET`, so rotating
   that secret means each such workspace must enter its key again (ADR
   0009).

   The deployed commit is not one of these. `KADENCE_COMMIT` is a build
   argument, not a runtime variable — step 3 below is where it goes, and
   a value set here would be ignored, because the commit is inlined into
   the bundle when the image is built.

   `SIGNUP` is deliberately absent: it defaults to `closed`, which is what
   an installation on the open internet should be. See section 5.

   Five parts of Kadence can be parked until a real winter with a real
   team has used the rest. Each is `on` unless you set it to `off`
   (ADR 0057): `COACHES_ROOM`
   (Trænerrummet), `CLUB_CHAMPIONSHIP` (the club championship; a team
   still turns it on for itself), `CALC_ENERGY` (the energy calculator),
   `GUIDE_FOOD` (the food guide, until a sports dietitian has read it) and
   `RULLE_WORLD` (Rulle's land, routes, people and sound; without it Rulle
   is the session alone). Off hides the menu item, the page, the actions
   and the demo's part at once; nothing is deleted, and turning one back
   on takes a restart. `DCU_RESULTS` is not one of these and works as
   before (ADR 0039).

   Every one of these is named in the `app` service's `environment:` block
   in `docker-compose.yml`, and that is not decoration. A variable set in
   Coolify reaches the compose file for `${...}` substitution; it does not
   reach the container unless the compose file forwards it. A setting that
   is not on that list is a setting the panel appears to accept and the
   application never sees. Adding an environment variable to Kadence means
   adding it in both places.

3. Build arguments (Coolify → Build): pass `KADENCE_COMMIT` and, if you like,
   `KADENCE_BUILT_AT`. `.dockerignore` excludes `.git`, so without them the
   About page and `/api/version` honestly report `unknown` rather than
   guessing. Coolify exposes the commit it is building; if it cannot be
   wired automatically, set it by hand at each release — it is one line and
   it is what makes "which version is running" answerable.
4. Attach the domain to the `app` service and let Coolify provision TLS.
   Health check path: `/api/health`.
5. Deploy. The compose order is enforced: `db` becomes healthy → `migrate`
   runs all Drizzle migrations (as the Postgres superuser, which the
   SECURITY DEFINER audit trigger relies on) and then gives the two runtime
   roles their login rights and passwords → `app` starts.

   Role provisioning belongs to the migration step, not to
   `docker/postgres-init`. That init directory is bind-mounted from the
   repository, and a build system that removes its working copy after
   building mounts an empty directory instead: the script never runs, the
   migrations create the roles as NOLOGIN, and the application is refused by
   its own database with nothing in any log to explain it. `/api/health`
   answers 503, the container is marked unhealthy, and the proxy never
   requests a certificate — which looks like a TLS problem and is not.
   `scripts/ensure-roles.ts` closes that hole and is idempotent, so it also
   repairs an installation that already went wrong.

## 3. Verify

```bash
curl https://kadence.haij.dk/api/health    # {"status":"ok","checks":{"db":"ok"}}
curl https://kadence.haij.dk/api/version   # the release you just deployed
```

Then log in and open **Indstillinger → Om**: version, commit and build time
should match what you deployed, and the schema card should say the database
has applied as many migrations as the code expects. If it says migrations
are pending, the `migrate` service did not run — fix that before using the
installation.

## 4. Bringing an existing database with you

Moving a working installation (or a local development database) onto the
server is a dump and a restore. On the machine that has the data:

```bash
pg_dump -Fc -U postgres kadence > kadence.dump
scp kadence.dump root@your-server:/root/
```

On the server:

```bash
DB=<kadence db container id>   # docker ps; a shared server has more than one "db"
docker cp /root/kadence.dump "$DB":/tmp/kadence.dump
# The roles are provisioned by the migration step; the dump carries the data.
docker exec "$DB" pg_restore -U postgres -d kadence --clean --if-exists /tmp/kadence.dump
docker exec "$DB" rm /tmp/kadence.dump
```

**Passkeys do not travel.** A passkey is bound to the origin it was created
for, so one registered on `http://localhost:3000` will not work on
`https://kadence.haij.dk`. Log in with your password and register a new
passkey there. That is WebAuthn working as designed, not a bug.

## 5. Who can create an account

`SIGNUP` defaults to `closed`: once the installation has its first user,
registration is refused, at the endpoint and not merely in the interface.
The first account on an empty installation is let through, which is how you
get in at all.

So on a fresh installation, register immediately after the first deploy —
that first registration is the one that closes the door behind it. On an
installation restored from a dump the door is already closed, because the
users came with the data.

Setting `SIGNUP=open` re-opens registration for anyone who finds the
address. That is for a demo instance, not for an organisation's own Kadence.

Setting `SIGNUP=individuals` opens one more door (ADR 0088): a person may
create their own workspace at `/register` without applying — for
themselves from the age of 15, or as a parent for their child — and a club
still applies there, one link away, and waits for you. It needs mail
(6b): the app refuses to start with `SIGNUP=individuals` and no SMTP
settings, and says why. The person ticks two boxes, the terms and their
explicit consent to health data, which are stored with the version of
their words; then they are in their workspace at once, with a stripe at
the top of every page, "Bekræft din adresse inden …", and a button to send
the mail again. A week on without the link opened, they see one page,
"Bekræft din e-mail", and nothing else of Kadence until they have. An
account that is not confirmed within thirty days is deleted by the
`signup.sweep` job (6e) with its workspace, leaving one line in the audit trail with the
account's id and no name or address. Five accounts an hour per network
address, as for applications. Before you open this door on an installation
you run for others, have the privacy policy, the DPIA and the consent texts
read by your adviser (`docs/jura/`).

### Letting people in one at a time

A closed installation still has a front door. `/register` shows a short
application (name, e-mail, organisation, a line about the team) instead
of a closed sign; nothing is created until you decide. The installation's
owner sees applications under Indstillinger → Adgang with a count in the
navigation, approves or declines, and gets a registration link to send
(you send it yourself, or press "Send linket" when the installation sends
mail, 6b). The link is a
single-use key bound to that e-mail address, valid for seven days; the
same page can mint a new one, which retires the old, and can invite
someone directly without an application. ADR 0004 has the reasoning.

The owner is the first account created on an empty installation, recorded
as `platform_role = 'owner'` on the user. To hand it to someone else, or to
a second person, use the maintenance script on a checkout
(`pnpm script scripts/grant-owner.ts you@example.dk --only`) or, on the
server, one statement as the migration role in the database container:

```sql
update users set platform_role = 'owner' where email = 'you@example.dk';
```

It is never set from a request, and it is not the same thing as owning a
workspace: it says who may admit new workspaces to this installation,
nothing more.

### Many clubs on one installation

When the installation hosts several clubs (ADR 0048), a club is a
workspace and comes in the same way: an application, your approval, and
the approved registration creates the club with its first coach as owner.
Only the installation's owner can create further workspaces; anyone else
can create one only while they belong to none.

Under Indstillinger → Installation the owner sees each club in figures:
coaches, riders, parents, when someone was last in, the space their files
take and the AI calls of the last day. Never a name, a session or a
check-in; the database function behind the page hands over nothing else.
There is no "sign in as". A club that wants help invites you as a coach
for a while, which shows in its member list and in the log.

A club's own owner deletes it from Indstillinger → Arbejdsrum. If that
owner has left and the club asks you in writing, delete it from a
checkout with `pnpm script scripts/delete-club.ts <org id> "<name>"
"<why>"`; the reason stays in the log, with how many rows each table
held. Either way the club's rows and its audit trail go; the trail keeps
one line that it happened (ADR 0084).

Each club takes its own data out under Indstillinger → Data: a
spreadsheet or JSON three times an hour, and its ride files as a ZIP
("Hent dine filer") twice an hour. Both are streamed and read a page or
a few files at a time, so a large club's download does not hold the
server's memory; a large club's ZIP can still take a while.

When you host for clubs, the club is the data controller and you are its
processor: have a data processing agreement in place before the first
rider's data arrives, and keep `/terms` and `docs/subprocessors.md` in
step.

## 6. The demo, if you want one

`DEMO` defaults to `off`, and while it is off `/demo` answers 404 and no
demo code runs at all. Set `DEMO=on` and every visitor to `/demo` gets
their own workspace with the default roles and tasks in it, signed in
as a throwaway account, deleted automatically after 24 hours.

That is a real workspace built by the real services, so what a visitor
sees is the product rather than a mock of it. Three things keep it
bounded: five demos an hour per address, two hundred live demos at once,
and an expiry on every one of them.

Cleanup runs every hour as a job (section 6e, ADR 0085), and before each
new demo, so there is nothing to schedule. To run it now:

```bash
pnpm script scripts/cleanup-demos.ts   # on a checkout; the app's image carries no scripts
curl -X POST https://kadence.haij.dk/api/demo/cleanup   # on the server
```

The endpoint needs no secret because it can only delete demos that have
already expired. A demo goes with its throwaway accounts and every audit
row about them (`delete_expired_demo()`, ADR 0084), so `DEMO=on` does not
make the audit trail grow.

Turn it on only where you mean it. A demo instance is not the same
installation as an organisation's own Kadence: `DEMO=on` hands out accounts,
which is exactly what `SIGNUP=closed` exists to prevent. Run the demo on
its own installation with its own database, or accept that anyone can
create a workspace on this one.

The terms page at `/terms` tells visitors what a demo is and asks them not
to put real personal data in one; if you host a demo, read that page and
make sure it says what you actually do.

## 6b. Mail, if you want it

Mail is optional (ADR 0086). Without it Kadence sends nothing: the owner
copies an approved application's link, a coach shares each invitation
with "Del", and a person who forgot the password asks a coach for a
link (ADR 0032). Everything works that way, and an installation without
mail has no mail provider on its subprocessor list.

With mail, Kadence sends four things and nothing else, each a short
plain-text mail with one link to the installation's own address and never
a word about training or health:

- a link to confirm an address (Indstillinger → Sikkerhed);
- a link for a new password, at "Glemt adgangskode?" on the login page;
- an invitation: "Send på mail" beside "Del" on the riders page, and "Send
  linket" on the owner's Adgang;
- for a parent who chose it under Indstillinger → Profil, "Der er nyt om
  ugen i Kadence" on Sunday evening, beside the push (6d).

kadence.haij.dk sends through **one.com** (one.com A/S, part of group.one,
Copenhagen; EU-hosted), the mailbox `kadence@haij.dk` on the domain that
already lives there, which is on `docs/subprocessors.md`. Any SMTP server
works for a self-hosted installation; put it on your own list. Scaleway
Transactional Email (Paris) is the alternative the day one.com's hourly
and daily limits, or its spam reputation, get in the way (ADR 0086).

### Setting up one.com

1. In one.com's control panel, make a mailbox for Kadence alone, for
   example `kadence@haij.dk`, so Kadence never holds the password of a
   mailbox a person reads. If the domain's mail already lives at one.com,
   SPF and DKIM are in place; if not, add one.com's SPF include to the
   domain's TXT record, or the mails land in spam.
2. Put the five variables into Coolify and redeploy:

   ```
   SMTP_HOST=send.one.com
   SMTP_PORT=587
   SMTP_USER=kadence@haij.dk
   SMTP_PASSWORD=<the mailbox's password>
   MAIL_FROM=Kadence <kadence@haij.dk>
   ```

   Port 587 upgrades with STARTTLS and Kadence refuses to send without
   it; 465 is TLS from the first byte. `MAIL_FROM` must be the mailbox
   itself: one.com refuses to send as anybody else. All five or none: the
   app refuses to start with some of them, and names what is missing.
   `SMTP_PASSWORD` is a secret: Coolify only, never in the repository.

3. Check it: sign in, open Indstillinger → Sikkerhed and press "Send en
   mail til bekræftelse". The mail should arrive within a minute, and the
   link should give the address its check mark. If it does not, the app's
   log says `mail: not sent` with the error's name (never the address).

one.com caps what one mailbox may send per hour and per day; the number
is in their help pages. Invitations, confirmations and the parents'
Sunday mail stay far under it for a handful of clubs. To move to Scaleway
(or another EU provider), add its row to `docs/subprocessors.md` first,
set the five variables to its values — for Scaleway: `smtp.tem.scaleway.com`,
port 587, the project's id as user and an API key's secret as password,
after the domain is verified with SPF, DKIM and DMARC in its console — and
redeploy.

### Mail while developing

`docker-compose.dev.yml` runs Mailpit beside the database: a catcher that
takes every mail on `localhost:1025` and shows it at
http://localhost:8025, and sends nothing on. Set in `.env`:

```
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=dev
SMTP_PASSWORD=dev
MAIL_FROM=Kadence <kadence@localhost>
```

That is the one case Kadence speaks SMTP without TLS: outside production,
and only to the machine itself. A development server must never send
through a real provider: the seeded addresses do not exist, and every
bounce counts against the installation's sender name. The test suite
refuses every real transport whatever `.env` says.

The test server on a machine of its own (a production build) may use the
real provider, for real addresses only.

## 6c. The map behind routes

A ride's route is drawn on a map of Denmark that Kadence serves itself
(ADR 0023): OpenStreetMap data in one PMTiles file, read by the browser in
small byte ranges from `/api/map/tiles`. No rider's position reaches a map
service. Without the file, routes are drawn on plain paper and nothing
else changes.

Fetch it once, on the server, into the `kadence-map` volume (about
500 MB; only Denmark is downloaded, from Protomaps' daily build):

```
scripts/fetch-map.sh compose
```

Run it again now and then to bring roads up to date; the app reads the
new file on the next request. For `pnpm dev`, `scripts/fetch-map.sh`
without an argument puts the file in `./data/map` and names the
`MAP_FILE` line for `.env`.

The map shows © OpenStreetMap contributors, as the data's licence (ODbL)
asks.

## 6c½. The teams page's cache

The open page of Danish U19 and U23 teams (ADR 0072) reads the UCI and
Cykling Danmark once a day and keeps what it read — a JSON file and a
few photographs — in the `kadence-teams` volume at `/data/teams`. The
image makes that directory owned by the app's user, so a volume made
after 8 October 2026 is writable from the start. The worker (section 6e)
does the daily refresh and shares the volume, as the same user.

A volume made **before** that (the first deploy of the page) is owned by
root, and the app cannot write into it. The page still works — it keeps
what it read in memory and says so in the log (`teams: snapshot not
written`) — but every restart reads the sources again. Fix it once,
on the server, with the project's name as Coolify prefixes volumes:

```
docker run --rm -v <project>_kadence-teams:/data/teams alpine chown 1001:1001 /data/teams
```

`TEAMS_DCU=off` in the environment stops the page reading Cykling
Danmark; `GUIDE_TEAMS=off` parks the page.

## 6d. Reminders by web push

Reminders (ADR 0060) are off until the installation has a key pair. Make
one on your own machine, once, and keep it: a new pair means everyone has
to turn reminders on again.

```bash
pnpm script scripts/push-keys.ts
```

Put the three lines it prints into Coolify: `PUSH_PUBLIC_KEY`,
`PUSH_PRIVATE_KEY` (a secret) and `PUSH_CONTACT` (a `mailto:` the push
services may write to). Redeploy, and Settings → Mig offers each person
"Påmindelser" on their own browser. The worker runs the reminders every
ten minutes (section 6e); there is nothing to schedule. If you would rather
drive them from cron, `curl -X POST https://kadence.haij.dk/api/push/tick`
does one run and is safe to call as often as you like.

The push carries nothing: the browser's push service (Apple's, Google's,
Mozilla's or Microsoft's) sees that a reminder went out and when, and the
words are fetched from Kadence. `docs/subprocessors.md` says so for the
people you host; on an iPhone, reminders work once Kadence is on the
home screen.

### Trying reminders on a real phone

A phone gets reminders only over https, so try them on an installation
with the key pair (kadence.haij.dk), not on a dev server reached by a
plain-http network name. Use a test team and test accounts
(`scripts/seed-test-teams.ts`), not the pilot team. Settings → Mig →
Påmindelser has "Send en prøve" (three an hour per person) and a status
line under the card that says how the device stands.

**iPhone or iPad (iOS 16.4 or later):**

1. Open the site in Safari and sign in.
2. Share → "Føj til hjemmeskærm". Open Kadence from the new icon and sign
   in again if asked: the home-screen app keeps its own cookies apart
   from Safari's.
3. Settings → Mig → Påmindelser → "Slå påmindelser til på denne enhed",
   and allow notifications when iOS asks.
4. The status line should read "tilladelse givet · service worker
   registreret · abonnement siden … · åbnet fra hjemmeskærmen". "Ikke
   åbnet fra hjemmeskærmen" means you are in Safari, not in the app; the
   card then says reminders need the home screen.
5. Tap "Send en prøve" and lock the phone. Within seconds a notification
   says "Sådan ser en påmindelse fra Kadence ud"; tapping it opens
   Påmindelser.
6. Nothing came: iOS Settings → Notifications → Kadence must allow
   notifications, and a Focus mode holds them back. "Tilladelse afvist"
   can only be undone in iOS Settings, or by removing the icon, adding it
   again and allowing.

**Android (Chrome):**

1. Open the site in Chrome and sign in. Installing it is optional; it
   works in a tab.
2. Settings → Mig → Påmindelser → turn on, and allow notifications.
3. The status line should read "tilladelse givet · service worker
   registreret · abonnement siden …".
4. Tap "Send en prøve", leave Chrome or lock the phone, and the
   notification arrives.
5. Nothing came: Android Settings → Apps → Chrome → Notifications, and
   Chrome's site settings for kadence.haij.dk, must allow them; battery
   saving can delay a push by minutes.

When the toast says "Prøven kom ikke af sted", the app's log has a line
`reminders: push refused <push service> <status>` or `push failed`; the
address itself is never logged. The test says "Prøven er sendt" as soon
as the push service has taken the push; what happens after that is
between the push service and the phone.

**The coach's wellbeing reminder.** Sign in on the phone as a coach on
the test team, turn reminders on and keep "Trivsel" chosen. As a rider on
the same team, save today's check-in with pain at the top step ("Smerte
under træning"), or as ill. Within ten minutes, at any hour, the coach's
phone says "En rytter har brug for en snak", and tapping it opens the
points of attention under Kalender. Saving the same check-in again sends
nothing more that day.

## 6e. The worker

Some of Kadence's work happens with nobody waiting for it: the reminder
run every ten minutes, a ride Wahoo, Garmin or Polar says was saved,
races from Cykling Danmark, the teams page once a day, the demos past
their 24 hours, the accounts made through door 2 and never confirmed
(section 5, once a day), and the tidying of the counters. Each is a row in the
`jobs` table (ADR 0085), written before anybody is told it will be done,
and the **worker** takes them one at a time. A deploy or a crash in the
middle of a job loses nothing: the job's five-minute lease runs out and
it is taken again. A job may therefore run twice, and every kind is
written so that a second run changes nothing.

**What runs where.** `docker-compose.yml` has a `worker` service beside
`app`: the same Dockerfile (its `worker` stage), the same source, the
same production dependencies and the same environment, run with
`node_modules/.bin/tsx scripts/worker.ts` instead of Next. It answers no
HTTP and publishes no port, shares the `kadence-teams` volume with the
app, and restarts by itself. `WORKER` is `on` for both, which tells the
app to only put jobs in the queue. Coolify builds and starts it with the
rest; there is nothing to set.

An installation that wants one container leaves the worker out
(`docker compose up -d --scale worker=0`) and sets `WORKER=off`: the app
then runs the jobs itself, the way it ran the reminder timer before.
Never leave the worker out with `WORKER` on, or nothing runs the jobs —
the health check and the Installation page both show it within minutes.

**Seeing that it works.** `GET /api/health` reports, beside the
database, `jobs: { pending, failed, oldestPendingSeconds }`: jobs due
and not yet run, jobs that gave up, and how long the oldest due job has
waited. A worker that keeps up keeps `oldestPendingSeconds` under a
minute; a number that only grows means the worker is down or stuck
(`docker logs` on the worker container, or Coolify's log viewer).
Settings → Installation shows the same, and when a worker last took a
job — at least every fifteen minutes while one runs, because the sweep
is a job too. Uptime Kuma (section 7b) can watch `oldestPendingSeconds`
with a keyword or JSON-query monitor.

**When a job gives up.** A failed job is tried again after 1, 5, 15, 60
and 240 minutes; after the fifth try it stays in the table with its last
error (a short word: `DeviceHttpError:status`, `timeout`, …, never a
message) and is logged as `jobs: gave up`. A provider down for a few
minutes is what the tries are for; a job that gave up waits for a person.
See them, and try them again once the cause is mended, with:

```bash
docker compose exec worker node_modules/.bin/tsx scripts/retry-jobs.ts          # lists them
docker compose exec worker node_modules/.bin/tsx scripts/retry-jobs.ts <job id> # that one, now
docker compose exec worker node_modules/.bin/tsx scripts/retry-jobs.ts --all    # every one, now
```

(In Coolify, the worker's terminal runs the same command without
`docker compose exec worker`.) Jobs that are done are deleted after a
day and jobs that gave up after thirty, by the sweep.

**Locally**, `pnpm dev` runs the jobs itself unless `.env` says
`WORKER=on`; then `pnpm script scripts/worker.ts` in a second terminal is
the worker.

## 6f. File storage: in the database, or in an EU object store

Every ride's original file is in the database unless you say otherwise
(ADR 0087), and for a club on its own server that is the right place:
nothing to run, and a backup of the database is a backup of the files.
`FILES_STORAGE` is `db` by default; a self-hoster leaves this section
alone.

**When to switch.** When the files are what makes the database big: the
plan's own line says trin 1 is due at 10 GB of files (plan §5.5), and
Installation shows every club's files. On kadence.haij.dk, with many
clubs, the files go to Hetzner Object Storage.

**How.** A bucket of its own, never the backups' (section 7.1 says how
to make one): private, in Falkenstein or Nuremberg, with its own S3
credentials. Then, in Coolify:

```
FILES_STORAGE=s3
S3_FILES_ENDPOINT=https://fsn1.your-objectstorage.com
S3_FILES_REGION=fsn1
S3_FILES_BUCKET=kadence-files
S3_FILES_ACCESS_KEY=…
S3_FILES_SECRET_KEY=…
```

All five or none; the app refuses to start on half. Deploy. From now on
every new file is an object under `<workspace>/<rider>/<sha256>.fit`,
and the files already in the database still read from there. Then move
them, once, from the worker's terminal:

```bash
docker compose exec worker node_modules/.bin/tsx scripts/migrate-files.ts            # puts the job in
docker compose exec worker node_modules/.bin/tsx scripts/migrate-files.ts --status   # how many are left
```

The worker moves fifty files at a time, checks each object's hash
against the row before it empties the row, and runs again until none is
left; a deploy in the middle costs nothing, run it again. Settings →
Installation says the files are in the store; `--status` says how many
rows still hold bytes.

**Check the encryption once.** Kadence writes every object with
`x-amz-server-side-encryption: AES256`. Hetzner Object Storage says it
encrypts at rest; after the first upload, look at one object's metadata
in the Cloud Console (or `HEAD` it with any S3 client) and confirm the
header came back. If the store ignores it, the files are still only
readable with the installation's keys, as the database is — but
`docs/subprocessors.md` says "encryption at rest", so know which it is.

**What the self-hoster has.** The same code, `FILES_STORAGE=db`, the
files in Postgres, and the quotas: 20 GB per club and 2 GB per person
by default (`FILES_QUOTA_CLUB_BYTES`, `FILES_QUOTA_PERSONAL_BYTES`;
`0` is no quota), which Installation lets the owner change per club. A
file past the quota is refused with a plain sentence and everything else
works.

**Deleting.** The database cannot delete from a store, so a deleted
ride, rider or workspace leaves its keys in `file_tombstones`, and the
job `files.tombstones` deletes the objects every fifteen minutes, after
a five-minute grace. The deletion page says "within the hour"; the
terms' thirty days for backups are unchanged, since a bucket of objects
is not backed up by pgBackRest and holds no copy of a deleted object.

**Going back.** Set `FILES_STORAGE=db` again and new files go to the
database; the objects already written still read, and stay until a job
moves them back, which does not exist: an installation that goes back
keeps the bucket. Nothing is lost either way.

## 6g. Billing: a price, a trial and an invoice by hand

Off by default (ADR 0090): every workspace is free and nothing about
prices shows anywhere. A self-hoster leaves this section alone. On
kadence.haij.dk, when clubs and persons are to pay:

**The three settings.** In Coolify, beside the mail settings it needs:

```
BILLING=on
TRIAL_DAYS=30   # 0 is no trial: free until you decide otherwise
SIGNUP=individuals   # if persons may also create their own (section 5)
```

`BILLING=on` refuses to start without the five SMTP variables (section
6b), because the owners are reminded by mail. The worker reads the same
settings; the daily job `billing.expire` does the moving and the mails.

**Who pays what.** Prices are rows of `price_plans`, seeded with the
plan's numbers: a rider alone 290 kr. a year, a club 1,200 kr. a year
for up to 20 riders and 50 kr. for each rider beyond, a rider alone who
is at most U19 free. A person who creates their own workspace gets a
trial of `TRIAL_DAYS` days. A club you admit is free for its **first
season**: from your approval until the coming 30 September, after which
it gets the same trial, with a mail a week and a day before it ends.
Workspaces that existed before you turned billing on stay free until
you say otherwise, and so does your own and every demo.

**The price table.** Indstillinger → Installation → Priser shows each
plan with its names in Danish and English, its price a year, the riders
it includes and the price per rider beyond, its AI budget in € a month,
its file space in GB and whether VAT is in it, and works out what a club
of 12, 20, 21 and 40 riders pays as you type. A change applies from the
day you choose, today or later; the old price stays as history, and a
price set for a later day waits for it. A plan's AI budget and file space
are what the workspaces on it get, unless you gave a workspace its own
number on the Installation page.

**The price page.** With `BILLING=on` there is an open page at
`/priser` (`/en/prices` in English) with the two plans, what is free,
the trial, how one pays (an invoice from Haij, bank transfer, a year in
advance) and that the code is open source. The front page links to it in
its top and bottom, and Viden og hjælp has a card for it. With
`SIGNUP=individuals` the front page says "Opret konto" first, with a line
for a team that applies, and the price in one line under the buttons:
"Gratis i 30 dage, derefter fra 24 kr. om måneden" — the trial and the
cheapest paid plan, as the table has them — or "Gratis at komme i gang"
with `TRIAL_DAYS=0`. With `BILLING=off` the page answers 404 and nothing
links to it.

**Registering a payment.** You make the invoice in your own bookkeeping
— Indstillinger → Installation → Betaling lists every workspace with
its riders and the price, a person as "Enkeltperson" and a short
reference to put on the invoice. When the bank transfer has come in,
press "Registrér betaling" on its row: the amount with VAT, the VAT, the
invoice number and the period it pays for. The workspace is paid
through the period's last day, and its owner gets a mail 14 days before
that day. "Sæt gratis" makes a workspace free, with a reason and, if it
is for a while, a last day.

**What expired means.** A workspace past its trial or its payment can
be read and taken out, and nothing new can be added: no session, no
ride, no upload, no AI. Its people see a stripe at the top saying so,
and its owner gets one mail. Nothing is ever deleted for it; register a
payment and everything works as before, at once.

**Turning it off again.** `BILLING=off` makes every workspace free
again, whatever its row says, and stops the job and the mails. The
plans stay in the database for the day you turn it back on.

## 7. Backups: to the minute, and a second copy

Kadence has two backups, and they are independent on purpose
(docs/adr/0089). Each one alone can bring the installation back.

| Backup                                             | What it is                                                                                         | Loses at most  | Needs                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------- |
| **pgBackRest** (`docker-compose.backup.yml`)       | A full backup every night and every WAL segment at least once a minute, encrypted, in an EU bucket | about a minute | the overlay, a bucket and a passphrase |
| **The nightly dump** (`scripts/backup-kadence.sh`) | `pg_dump` once a night, encrypted with `age` to a public key, on the VPS and in an EU bucket       | up to a day    | cron on the VPS, `age`, `rclone`       |

A self-hoster who runs only `docker compose up` has neither by default
and loses nothing by it: the dump is one cron line (below) and is
enough for a club on its own server. The minute-by-minute one is for an
installation that holds many clubs.

Both keep thirty days, because the terms promise that what is deleted in
Kadence is gone from the backups within thirty days. Change either and
you have changed a promise — change the sentence in `terms.leaving.body`
with it.

### 7.1 Hetzner Object Storage

One bucket per backup, so the two do not share a key or a fate:

1. In Hetzner's Cloud Console: **Object Storage → Create Bucket**, in
   Falkenstein (`fsn1`) or Nuremberg (`nbg1`), private, named for
   example `kadence-pgbackrest` (and `kadence-dumps` for the dump).
2. **Security → S3 credentials → Generate credentials.** Copy the access
   key and the secret key at once; the secret is shown one time. Put them
   in the password manager.
3. The endpoint is `<location>.your-objectstorage.com`, for example
   `fsn1.your-objectstorage.com`, and the region is the location, `fsn1`.

Hetzner Object Storage is on `docs/subprocessors.md`. Another
S3-compatible store in the EU works the same way; it gets a row there
first.

### 7.2 pgBackRest: backups to the minute

The overlay builds the database with pgBackRest beside it (the official
`postgres:16` image plus pgBackRest from apt.postgresql.org,
`docker/pgbackrest/Dockerfile`), archives every finished WAL segment to
the bucket — at least once a minute while anything is written
(`archive_timeout=60`) — and starts a `pgbackrest` sidecar that takes a
full backup every night at 03:40 Copenhagen time. Everything is encrypted
on the server with a passphrase before it is sent; the bucket holds
ciphertext.

Set these in Coolify, all required, none with a default:

| Variable                      | Value                                                             |
| ----------------------------- | ----------------------------------------------------------------- |
| `S3_BACKUP_BUCKET`            | the bucket, e.g. `kadence-pgbackrest`                             |
| `S3_BACKUP_ENDPOINT`          | `fsn1.your-objectstorage.com` or `nbg1.your-objectstorage.com`    |
| `S3_BACKUP_REGION`            | `fsn1` or `nbg1`                                                  |
| `S3_BACKUP_ACCESS_KEY`        | from 7.1                                                          |
| `S3_BACKUP_SECRET_KEY`        | from 7.1                                                          |
| `PGBACKREST_REPO_CIPHER_PASS` | `openssl rand -base64 48`; **also in the password manager**       |
| `BACKUP_PGBACKREST_PING_URL`  | optional: an Uptime Kuma push monitor for the nightly backup (7b) |

Without the passphrase the backups cannot be read by anyone, you
included. It has to be on the server, because the server encrypts; that
is the price of a backup that runs by itself (the dump's private key, by
contrast, never is).

Then deploy with both files. In Coolify, set the compose file locations
to `docker-compose.yml` and `docker-compose.backup.yml`; by hand:

```bash
docker compose -f docker-compose.yml -f docker-compose.backup.yml up -d --build
```

The first start rebuilds the database's image and restarts the database
(a minute), then the sidecar creates the repository, checks that WAL
arrives, and takes the first full backup. Its log says each step:

```bash
docker logs <kadence pgbackrest container>     # "full backup done", "next full backup at …"
docker exec <kadence pgbackrest container> pgbackrest --stanza=kadence info
```

`info` lists the full backups and the WAL range: the newest WAL is the
newest minute you can restore to. pgBackRest expires what the thirty days
no longer need after each night's backup (`repo1-retention-full=29`,
time-based: it keeps the newest full backup older than the window, so
nothing is older than thirty days).

If archiving stops — the bucket is unreachable, a key was revoked — the
database keeps its WAL on its own disk until it can send it, and the
sidecar's ping (if set) goes down at the next backup. Watch the disk
(7b) on a day the bucket is out.

### 7.3 The nightly dump: the second copy

The dump is independent of pgBackRest: another tool, another key,
another bucket. If pgBackRest's repository were ever unreadable, the dump
still is. The script lives at `scripts/backup-kadence.sh`. On the VPS:

```bash
# Generate the key pair on your own machine, not on the server.
age-keygen -o kadence-backup.key            # keep this in your password manager
grep 'public key' kadence-backup.key        # the public half goes on the server

install -m 700 scripts/backup-kadence.sh /root/backup-kadence.sh
echo 'age1...' > /root/kadence-backup.pub   # the public key from above
rclone config                             # configure an EU remote named eu-storage
/root/backup-kadence.sh                     # run it once by hand
```

```
# crontab -e
25 2 * * * DB_CONTAINER=<kadence db container id> BACKUP_PING_URL=<push monitor URL> /root/backup-kadence.sh
```

Name the container explicitly: on a server that also runs Haij there is
more than one database container called `db`, and the script's fallback
picks the first one it finds.

`BACKUP_PING_URL` is optional and the backup runs the same without it,
but a cron job that silently stops running is the usual way a backup
dies unnoticed. Point it at an Uptime Kuma push monitor (7b) and the
script hits it plain on success, or with `?status=down&msg=<why>` on
failure — including the two checks above (no container, no recipient
key) and anything the dump, the encryption or the upload itself fails
on.

The script keeps thirty days at both ends: `KEEP_DAYS` prunes the dumps
on the VPS and `rclone delete --min-age` prunes the bucket.

Keep the age private key offline, never on the server: a backup an
attacker on the server can decrypt is not a backup, it is a second copy
of the leak. To read a dump:

```bash
age -d -i kadence-backup.key kadence-2026-01-01.dump.age | pg_restore -d kadence_restore
```

### 7.4 The quarterly drill

An untested backup is a hope, not a plan. Once a quarter, on the VPS:

```bash
scripts/restore-drill.sh
```

It starts a throwaway container from the sidecar's image with the
sidecar's settings, restores the newest point in the repository into
that container's own scratch space, starts Postgres there with archiving
off, and prints what it found and where it got to:

```
restore-drill: users:          41
restore-drill: workspaces:     3
restore-drill: riders:         28
restore-drill: rides:          1904
restore-drill: migrations:     47
restore-drill: last change:    2026-10-11 14:04:51+00
restore-drill: recovery point: 2026-10-11 14:04:51+00
restore-drill: ok
```

The recovery point should be within a few minutes of now. Then the
container is removed. The running database is never touched, nothing is
written to the bucket, and no secret is written to disk or shown on a
command line. It needs free disk about the size of the database.

Read one dump the same quarter (7.3), so both copies are known to work.
Write the date and the two recovery points in the operations log.

### 7.5 Back to a minute: point-in-time recovery

When something was deleted or broken at a known time — "the club's
season plan was there at 14:05" — the database can be put back to just
before it. Everything after that point is lost for every workspace on
the installation, so try the drill first, to the same point, and look:

```bash
scripts/restore-drill.sh --target "2026-10-11 14:05:00+02"
```

If that is the state you want, restore the real database to it. In
Coolify, stop the application (or on the VPS):

```bash
docker compose -f docker-compose.yml -f docker-compose.backup.yml stop app pgbackrest db
docker compose -f docker-compose.yml -f docker-compose.backup.yml run --rm --no-deps \
  --user postgres --entrypoint pgbackrest db \
  --stanza=kadence --delta --type=time --target="2026-10-11 14:05:00+02" \
  --target-action=promote restore
docker compose -f docker-compose.yml -f docker-compose.backup.yml up -d
```

`--delta` rewrites only the files that differ, so it is quick on a
database that is still there; the database replays WAL to the target on
start and goes on from there on a new timeline, which pgBackRest keeps
apart from the old one. Take a full backup at once rather than waiting
for the night, so the new timeline has one of its own:

```bash
docker exec <kadence pgbackrest container> pgbackrest --stanza=kadence --type=full backup
```

To restore the latest point instead (a lost disk), leave out `--type`,
`--target` and `--target-action`. This procedure was run end to end
against a local repository when it was written (docs/adr/0089).

To move to another machine, the same `restore` into an empty
`kadence-pgdata` volume on the new server, with the same environment,
is the whole move; the dump (7.3, section 9) works too.

Any new storage, mail or model provider goes into `docs/subprocessors.md`
first.

## 7b. Monitoring

Nothing above tells you when it stops working. [Uptime Kuma](https://github.com/louislam/uptime-kuma)
closes that gap, open source and EU-hosted the same way Kadence is: by
running on your own server, as its own Coolify service, with its own
subdomain (e.g. `status.haij.dk`) and its own tiny Postgres-free
storage. It is a separate application from Kadence; it has no row in
`docs/subprocessors.md` because it sends nothing outside the server it
runs on, besides the alert it sends you.

1. In Coolify: **New resource**, point it at Uptime Kuma's own Docker
   image (`louislam/uptime-kuma`), give it a subdomain, deploy.
2. Add an **HTTP(s) monitor** on `https://kadence.haij.dk/api/health`
   (the readiness check — no `?live=1`), checked every minute. This is
   what Docker's own healthcheck already asks the container, from
   outside the server instead of inside it, so a monitor still fires
   when the whole VPS is unreachable.
3. Add a **passive/push monitor** for the nightly backup: Uptime Kuma
   gives you a URL the moment you create one; put it in `BACKUP_PING_URL`
   on the VPS's crontab line (section 7.3, above) and set the monitor's
   expected interval a little over 24 hours, so a backup that silently
   stopped running is itself an alert, not just a backup that failed
   loudly. With pgBackRest (7.2), a second push monitor of the same kind
   goes in `BACKUP_PGBACKREST_PING_URL`.
4. Point the monitors' notifications at whatever you read daily — email
   is built in; a phone push needs a service of its own (ntfy, Pushover),
   which would need a row here first if it is not EU-hosted.

**Docker's own logs** are capped, not silenced: the `logging:` block on
`db`, `migrate`, `app` and `worker` in `docker-compose.yml` keeps at most 100 MB
per service (five files of 20 MB, rotated) instead of growing without a
limit until the disk under the database is the thing that runs out.
Read them with `docker logs <container>` on the VPS, or in Coolify's own
log viewer for the service — both read the same rotated files, so
restarting a container does not lose the last few hours the way an
in-memory buffer would. Every line the app writes through
`src/core/log.ts` is one JSON object with `ts`, `level`, `event` and a
`requestId` that ties one request's lines together (read off the
`x-request-id` header Coolify's proxy can set, or one `src/proxy.ts`
makes up when nothing in front of it did) — `grep` or `jq` reads it the
same as `docker logs` does.

**What to look at weekly**, by hand, until something above pages you
instead:

- **Disk.** `df -h` on the VPS. The database, the map tile file, the
  teams page's snapshot and the rotated container logs all live on the
  same disk; none of them is monitored for size yet.
- **The nightly dump's size** (`ls -lh /root/backups`). A sudden jump or
  a sudden drop both mean something changed that is worth knowing about
  before the next restore drill, not after.
- **Slow queries**, when the flags that enable it are set (a separate
  story adds `pg_stat_statements` and `log_min_duration_statement` to
  `docker-compose.yml`'s Postgres `command:`): `select query, calls,
mean_exec_time from pg_stat_statements order by mean_exec_time desc
limit 10;` in `psql`, as the migration role. Nothing on
  kadence.haij.dk today turns this on; the paragraph is here so the next
  deploy that does turn it on has somewhere to say how to read it.

**What this installation does not have yet: error reporting.** A model
or a database call can fail in a way that answers the person politely
("noModel", "generic") and tells nobody that it happened, beyond the one
log line above. A hosted error-reporting service (Sentry and the like)
would see every stack trace, and with it whatever was in scope when it
was thrown — which, for a tool that holds health data about minors, is
not a decision to make by installing the first SDK that offers a free
tier. Dogma four means the real candidate is a self-hosted, EU-run one
such as [GlitchTip](https://glitchtip.com) on this same server, which is
left for a later story rather than decided here. Until then, reading the
logs above is the error reporting there is.

## 8. Updating

Push to `main` → Coolify redeploys. The `migrate` service runs before the
new app container starts, so migrations are always applied first. Keep
migrations backwards compatible with the previous app version (expand →
migrate → contract) once real users are on the installation.

A migration that builds an index on `audit_log` (drizzle/0042 builds
three) holds writes to it while it builds, and every write in Kadence
writes to it. At a pilot's size that is seconds. On a trail of many
millions of rows, build the indexes by hand first with
`CREATE INDEX CONCURRENTLY` and the same names; the migration's
`IF NOT EXISTS` then skips them.

After each deploy, the About page is the check: if the commit shown is not
the one you pushed, the deploy did not do what you think it did.

## 9. Moving provider (exit plan)

1. Provision a VPS at the new EU provider, install Coolify, connect the repo.
2. Set the same environment variables.
3. Restore the latest dump into the new `db` service (section 4).
4. Flip DNS. Everything is Docker + Postgres; nothing is provider-specific.

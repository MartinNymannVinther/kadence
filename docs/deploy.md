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

   | Variable                | Value                                                                |
   | ----------------------- | -------------------------------------------------------------------- |
   | `POSTGRES_PASSWORD`     | `openssl rand -hex 24`                                               |
   | `KADENCE_APP_PASSWORD`  | `openssl rand -hex 24`                                               |
   | `KADENCE_AUTH_PASSWORD` | `openssl rand -hex 24`                                               |
   | `BETTER_AUTH_SECRET`    | `openssl rand -base64 32`                                            |
   | `BETTER_AUTH_URL`       | `https://kadence.haij.dk` (public URL; passkeys bind to this origin) |
   | `LLM_PROVIDER`          | `mistral` hosted, `ollama` self-hosted, or leave unset for `none`    |
   | `MISTRAL_API_KEY`       | only with `LLM_PROVIDER=mistral`                                     |
   | `AI_DAILY_CALL_CAP`     | model calls per day across the whole installation; `0` for no roof   |

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
curl https://kadence.haij.dk/api/health    # {"status":"ok"}
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

### Letting people in one at a time

A closed installation still has a front door. `/register` shows a short
application (name, e-mail, organisation, a line about the team) instead
of a closed sign; nothing is created until you decide. The installation's
owner sees applications under Indstillinger → Adgang with a count in the
navigation, approves or declines, and gets a registration link to send
(Kadence sends no mail yet, so you send it yourself). The link is a
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
"<why>"`; the reason stays in the log.

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

Cleanup runs on each visit, so an installation that gets visitors needs no
scheduler. If yours is quiet, or you would rather not rely on that, use
either:

```bash
pnpm script scripts/cleanup-demos.ts   # on a checkout; the images carry no scripts
curl -X POST https://kadence.haij.dk/api/demo/cleanup   # on the server
```

The endpoint needs no secret because it can only delete demos that have
already expired.

Turn it on only where you mean it. A demo instance is not the same
installation as an organisation's own Kadence: `DEMO=on` hands out accounts,
which is exactly what `SIGNUP=closed` exists to prevent. Run the demo on
its own installation with its own database, or accept that anyone can
create a workspace on this one.

The terms page at `/terms` tells visitors what a demo is and asks them not
to put real personal data in one; if you host a demo, read that page and
make sure it says what you actually do.

## 6b. Mail: there is none

Kadence sends no mail. Admission links and workspace invitation links
(Settings → Workspace, ADR 0008) are shown to the person who made them,
who sends them the way they talk to their colleague anyway. There is no
SMTP setting; reminders, when you turn them on, go by web push (6d), and
an installation needs nothing beyond what section 2 lists.

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
after 8 October 2026 is writable from the start.

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
"Påmindelser" on their own browser. The app runs the reminders itself
every ten minutes; there is nothing to schedule. If you would rather
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

## 7. Nightly encrypted backups (EU object storage)

Per the family's dogmas: nightly encrypted dumps to EU-owned object storage
(e.g. Hetzner Object Storage or a Storage Box). The script lives in this
repository at `scripts/backup-kadence.sh`. On the VPS:

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
25 2 * * * DB_CONTAINER=<kadence db container id> /root/backup-kadence.sh
```

Name the container explicitly: on a server that also runs Haij there is
more than one database container called `db`, and the script's fallback
picks the first one it finds.

Thirty days is what the terms page promises a workspace whose data has
been deleted, so the script keeps thirty at both ends: `KEEP_DAYS`
prunes the dumps on the VPS and `rclone delete --min-age` prunes the
bucket. Change one and you have changed a promise — change the sentence
in `terms.leaving.body` with it.

Keep the age private key offline, never on the server: a backup an attacker
on the server can decrypt is not a backup, it is a second copy of the leak.
Test a restore at least quarterly — an untested backup is a hope, not a
plan:

```bash
age -d -i kadence-backup.key kadence-2026-01-01.dump.age | pg_restore -d kadence_restore
```

Any new storage, mail or model provider goes into `docs/subprocessors.md`
first.

## 8. Updating

Push to `main` → Coolify redeploys. The `migrate` service runs before the
new app container starts, so migrations are always applied first. Keep
migrations backwards compatible with the previous app version (expand →
migrate → contract) once real users are on the installation.

After each deploy, the About page is the check: if the commit shown is not
the one you pushed, the deploy did not do what you think it did.

## 9. Moving provider (exit plan)

1. Provision a VPS at the new EU provider, install Coolify, connect the repo.
2. Set the same environment variables.
3. Restore the latest dump into the new `db` service (section 4).
4. Flip DNS. Everything is Docker + Postgres; nothing is provider-specific.

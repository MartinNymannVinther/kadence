# Maintenance scripts

One-off tools, run by hand against a Kadence database. None of them is
reachable from the application, and that is the point: each one does
something the running app must refuse to do.

Run them with `pnpm script <file> [arguments]`.

## set-password.ts

Sets a password on an existing account.

```
pnpm script scripts/set-password.ts <email>          # asks, without echo
... | pnpm script scripts/set-password.ts <email>    # reads from stdin
```

For the one situation the application has no way out of: an owner who
signs in only with a passkey, and who needs to reach the same account
from a different origin. Passkeys are bound to the origin they were
created for, by design, so moving an installation from localhost to a real
domain locks a passkey-only owner out of their own system — and there is
no "forgot password" to fall back on, because Kadence sends no mail.

It is a script and not a feature because setting someone else's password
outside the login flow is exactly the capability an attacker wants. It
belongs on the machine that already has database credentials.

## delete-club.ts

Deletes a club when its own owner cannot: the owner has left, and someone
the club answers for has asked in writing (ADR 0048).

```
pnpm script scripts/delete-club.ts                                   # lists the clubs
pnpm script scripts/delete-club.ts <org id> "<the club's name>" "<why>"
```

The name must be typed exactly. Everything the club owns goes, with the
audit rows about it, as when its owner deletes it; one line stays in the
log saying the installation did it, and why.

## grant-owner.ts

Names the installation's owner: the one account that may admit new
workspaces (Indstillinger → Adgang).

```
pnpm script scripts/grant-owner.ts                 # shows who holds the role
pnpm script scripts/grant-owner.ts <email>         # gives the role to that user
pnpm script scripts/grant-owner.ts <email> --only  # ... and takes it from everyone else
```

The first account on an empty installation gets the role by itself. That
is right for a fresh install and wrong for a development database full of
test users, which is what this script is for. ADR 0004 explains why it is
a script and not a setting.

## migrate-files.ts

Moves the ride files already in the database out to the object store,
after `FILES_STORAGE` was switched to `s3` (ADR 0087, docs/deploy.md
"File storage").

```
pnpm script scripts/migrate-files.ts            # puts the job files.migrate in the queue
pnpm script scripts/migrate-files.ts --status   # how many files still sit in rows
```

It only puts a job in; the worker moves fifty files at a time, verifies
each object's sha256 and then empties the row. Run it again at any time.
It refuses to put the job in where `FILES_STORAGE` is not `s3`, since the
job would only give up.

## ensure-roles.ts

Gives the two runtime database roles their login rights and passwords.
Runs as part of `pnpm db:migrate` and on every deploy; see docs/deploy.md
for why it exists.

## cleanup-demos.ts

Deletes demo workspaces that have expired. The application runs the same
cleanup on every visit to `/demo`; the script is for a quiet installation
or a scheduler that would rather not rely on visitors. Safe to run twice.

## push-keys.ts

Prints a fresh key pair for reminders by web push (docs/adr/0060) as
`PUSH_PUBLIC_KEY`, `PUSH_PRIVATE_KEY` and a `PUSH_CONTACT` to fill in,
ready for `.env` or Coolify. node:crypto makes the pair, so no web-push
package is needed. Make one per installation and keep it; a new pair
means every browser turns reminders on again.

```
pnpm script scripts/push-keys.ts
```

## reread-activities.ts

Reads every team's stored FIT files again, so rides imported before
Kadence kept the route, the laps, the climbs and the power curve show them
too. Only those details change; load, zones, RPE and notes stay. Runs as a
coach of each team, through RLS. Safe to run twice.

```
pnpm script scripts/reread-activities.ts
```

## migrate.ts

Applies the checked-in migrations and, unlike `drizzle-kit migrate`, says
what went wrong when it cannot. `pnpm db:migrate` is this script followed
by `ensure-roles.ts`; the container runs it before the application
starts.

## send-rides.sh

Not a maintenance script but a helper for a rider's own computer: sends
the ride files in a folder, a bike computer's drive for one, to Kadence
with the rider's upload key, newest first, and only the ones it has not
sent before (`--all` sends everything). It needs a shell and curl and
nothing from this repository, so it can be copied out on its own.
[docs/upload-keys.md](../docs/upload-keys.md) has the how and the why.

```
KADENCE_URL=https://kadence.example sh scripts/send-rides.sh /Volumes/GARMIN
```

## fetch-map.sh

Fetches the map behind routes (ADR 0023, 0099) from Protomaps' daily
OpenStreetMap build: the world to zoom 8 and the regions in
`map-regions.geojson` (Denmark and the training camps) to zoom 14, about
1.2 GB together.

```
scripts/fetch-map.sh            # into ./data/map, for pnpm dev
scripts/fetch-map.sh compose    # into the kadence-map volume
```

Production without the repository on the server: docs/deploy.md 6c.

## fetch-map-fonts.sh

Fetches the glyphs the map's place and road names are drawn with (ADR
0100): Noto Sans Regular and Medium from Protomaps' basemaps-assets, the
Latin ranges only, with the SIL Open Font License, into
`public/map/fonts`. The files are checked in, so run it only to refresh
or widen them; `public/map/fonts/README.md` says how.

```
scripts/fetch-map-fonts.sh                 # the pinned commit
FONTS_REF=main scripts/fetch-map-fonts.sh  # the newest
```

## backup-kadence.sh

Nightly encrypted dump of the database to EU object storage. Runs on the
VPS from cron, not in a container; docs/deploy.md section 7.3 has the
setup. It is the independent second copy beside pgBackRest.

## restore-drill.sh

The quarterly restore drill for pgBackRest (docker-compose.backup.yml,
docs/adr/0089). On the VPS, beside the running stack:

```
scripts/restore-drill.sh                                  # the newest point
scripts/restore-drill.sh --target "2026-10-11 14:05:00+02"   # a point in time
```

Restores into a throwaway container from the sidecar's image, counts
users and Kadence's other tables, prints the recovery point and removes
the container; the running database and the bucket are not touched.
docs/deploy.md section 7.4 has the rest.

## icons.ts

Draws the web app's PNG icons from the three bars in `src/app/icon.svg`.

```
pnpm script scripts/icons.ts
```

Writes `public/icon-192.png`, `public/icon-512.png`,
`public/icon-maskable-512.png` and `public/apple-touch-icon.png`, which
`src/app/manifest.ts` and the root layout point to. It touches no
database; it lives here because it is run by hand, once, when the mark
changes. Node's own zlib writes the PNGs, so no image library is needed.

## rulle-land.ts

Fetches the land round a route that comes with Rulle and writes it beside
the route's GPX file, as `<route>.land.json` (ADR 0035).

```
pnpm script scripts/rulle-land.ts public/rulle/routes/bu-dm-2026-vejle.gpx [--buildings 650|all]
```

The ground's heights every 40 m for 2.6 km round the road come from
Mapzen's terrain tiles (Terrarium; EU-DEM and SRTM in Denmark), the
woods, water, fields, towns, hedges, streams, turbines and the buildings
within 650 m of the road (`--buildings` says otherwise; `all` takes every
building in the land, and Rulle then makes none up, ADR 0046), and the
roads round it but the route's own (drives and paths only within 700 m,
ADR 0046) from OpenStreetMap's Overpass API. For a city (ADR 0036) it keeps what the map
says of a building's height, the height it starts at, its roof's shape
and colour, the parts a tower or a spire is drawn in, every tall building
and church in the land for the skyline, the street trees along the road
and the cemeteries. Both are sent
a box round the road and nothing else. Run it when a route is added or
its file changes, check the file in, and credit the sources on the route
(`rulle.credits`); the file is OpenStreetMap's data under the ODbL. It
touches no database and is never run at build or ride time: Rulle reads
the file, and without it draws the land it makes up. `rulle-land/` holds
its PNG reader for the tiles and its geometry.

## manual-pdf.ts

Renders the user manual, `public/brugervejledning/index.html`, to the
PDF beside it (docs/adr/0079).

```
pnpm dev                                              # or any running Kadence
pnpm script scripts/manual-pdf.ts http://localhost:3000
```

Uses a Chrome of this machine's — `CHROME=/path/to/chrome`, else Google
Chrome or Playwright's cached Chromium on a Mac — over the DevTools
protocol, so nothing is added to the app. Run it, and commit the PDF,
whenever the manual's text or pictures change; the pictures are taken by
hand from a team with sessions in it (the seed in `seed-test-teams.ts`
gives one).

## worker.ts

The worker that runs the background jobs (ADR 0085): reminders, rides
from Wahoo, Garmin and Polar, races from Cykling Danmark, the teams page
and the demos' clean-up.

```
pnpm script scripts/worker.ts
```

In production it is the `worker` service in `docker-compose.yml`, and
the app only puts work in the queue (`WORKER=on`). Locally, `pnpm dev`
runs the jobs itself unless `.env` says `WORKER=on`; then run this
beside it. docs/deploy.md, section 6e, has the rest.

## retry-jobs.ts

The jobs that gave up after their last try, and new tries for them once
the cause is mended.

```
pnpm script scripts/retry-jobs.ts               # lists them
pnpm script scripts/retry-jobs.ts <job id>      # tries that one again, now
pnpm script scripts/retry-jobs.ts --all [kind]  # every one, or every one of a kind
```

In the container: `docker compose exec worker node_modules/.bin/tsx scripts/retry-jobs.ts`.

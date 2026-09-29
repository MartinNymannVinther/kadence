# ADR 0030: A Strava archive in one move

Status: accepted · Date: 2026-09-29 · Builds on 0027 · Amends 0019 (a day's budget for an archive), 0022 (a whole archive is read, in the browser)

## Context

Most riders keep their rides on Strava, and Strava's API cannot be used
for what Kadence is (ADR 0027): a rider's data may be shown to the rider
alone. What Strava does guarantee is the rider's own export, and ADR 0027
named the two slices that would make it one move: a guide, and an upload
that takes the whole archive. Neither was built. A zip gave its first
ride only (ADR 0022), a Strava archive is far larger than the upload's
25 MB, and the hour's sixty rides (ADR 0019) made a season's history an
afternoon of pressing. The history matters most at the start: fitness is
a 42-day average, so a rider who comes in without it starts the winter
at zero.

## Decision

- **The browser reads the archive.** The zip Strava sends, dropped on the
  upload as it is, or the folder it unpacks to, picked with "Hent fra
  enheden". Kadence knows it by `activities.csv` at the top. A zip is
  read through slices of the file: its directory, then each ride asked
  for, unpacked with the browser's own `DecompressionStream`, so an
  archive of gigabytes is never held in memory whole and nothing but the
  rides leaves the device (`src/modules/files/zip-index.ts`,
  `src/components/activities/read-archive.ts`). ZIP64 is read, since
  years of photos pass 4 GB. A zip that is not a Strava archive goes on
  to the ordinary upload.
- **What the archive holds is shown before anything is sent**: how many
  activities have a file, and how many the list says are not rides. The
  rider chooses the rides or every activity.
- **The rides keep their names.** `activities.csv` gives what the rider
  called each activity on Strava; that name wins over a name inside the
  file and over the file's own. A ride the list does not name is named
  by its sport on the page, never by Strava's number.
- **Only the new rides are sent**, newest first, three at a time: every
  ride is hashed in the browser, Kadence is asked which it has
  (`/api/activities/known`), and a run that stops starts where it left
  off the next time. The original is kept as it came, `.fit.gz` and all.
- **"Only rides" is the file's word, not the list's.** The list's types
  are a hint: a type that is plainly not a ride is left out before it is
  read, anything else is sent, and the import refuses what the file says
  is not a ride (`not_bike`) before a row is written.
- **A door with a day's budget of its own**: `POST /api/activities/archive`,
  on the session like the upload, refusing another site's pages like it.
  Counted per day for the person and the rider: 500 rides kept, 1,000
  files read, and 1,000 requests for the person. A ride already here
  costs nothing kept. The hour's sixty for every other door stay as they
  were.
- **A guide, "Fra Strava til Kadence"**, in the help: why there is no
  connection, how to ask Strava for the archive (on the website only),
  what happens when it is dropped, a single ride by Export Original, and
  that new rides come most easily from the device.
- **No schema change.** An archive's ride is an uploaded file
  (`source = 'fit'`, ADR 0022).

## Trade-offs accepted

- **A person may keep 500 more rides a day.** The hour's sixty already
  allowed 1,440 a day to a client that kept at it; the archive's budget
  lets a history arrive in one sitting instead. It is keyed on the person
  and the rider, so nobody can use up another person's day by naming
  their rider, and the rider's access is checked before anything is
  counted.
- **The layout is known from others.** Strava's own help says how to ask
  for the archive, not what it holds; `activities.csv`, its column names
  and the `activities/` folder are as others describe them, and as the
  files ADR 0022 was built on. A list that cannot be read costs the
  names, never the rides. A real archive has not been tried yet
  (TECH-DEBT.md).
- **The page must stay open.** There is no job on the server; the browser
  does the work. A run that is stopped, by the rider, a closed lid or the
  day's budget, says how many are left and goes on from there the next
  time.
- **Types in another language are not told apart.** The list's types are
  read in English. Anything else is sent and the file decides; a GPX
  without a type is a ride (ADR 0022).
- **A ride Kadence has from the device is recognised by its start, not
  its hash**: the archive's `.fit.gz` is not the device's `.fit`. It is
  sent, read and answered "already there", which costs a read of the
  day's budget and nothing else.
- **The archive's other contents are ignored**: photos, routes, kudos,
  gear. Kadence takes the rides and nothing about anyone else.

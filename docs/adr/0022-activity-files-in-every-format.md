# ADR 0022: Activity files in every common format

Status: accepted · Date: 2026-09-28 · Builds on 0018 · Amended by 0030 (a whole Strava archive is read, in the browser) and 0096 (a device on smart recording is moving through its silences)

## Context

Kadence read only FIT. Riders' rides live in many places: a Garmin
Connect export is a zip with the FIT inside, Strava's bulk export gzips
every ride and gives GPX for many, Komoot and watch apps give GPX, Polar
Flow and TrainingPeaks give TCX. A rider who could not upload the file
they have would type the ride in by hand, losing the route, the curves
and the load.

## Decision

- **FIT, TCX and GPX, bare, gzipped or in a zip**, through the one upload
  and the one import (`src/modules/files`). The format is told from the
  bytes, not the name. TCX and GPX are read into the shape of a FIT file,
  so the summary, laps, climbs, zones, power curve and load read every
  format alike.
- **Kadence's own readers, no dependency** (CLAUDE.md): a small XML
  scanner that refuses any DTD — so no entity can expand and none can
  point at a file (billion laughs, XXE) — and caps elements and nesting;
  gzip and zip through Node's zlib with a cap on the unpacked size that
  refuses a bomb while it inflates; archives read at most two deep. Every
  refusal has a code the upload names.
- **GPS fills what the file lacks**: distance and speed from the
  positions (haversine, over a few points) when a GPX or TCX has none, so
  moving time and pauses come out right.
- **No schema change.** An upload keeps `source = 'fit'`, which now means
  "an uploaded file"; the stored file name says the format, and the page
  shows it. The original is kept as it came and downloads in its format.
- PWX (TrainingPeaks) is not read: rare, and TrainingPeaks exports FIT
  and TCX.

## Trade-offs accepted

- **`source = 'fit'` is a misnomer** for a GPX upload. A migration to
  rename the value would touch every row and every consumer for a word;
  the file name carries the truth.
- **GPX has no laps and often no power**; the page shows what the file
  has and no more. Distance from GPS is a little shorter than a wheel
  sensor's on twisty roads.
- **An unlabelled GPX is taken for a bike ride.** Kadence is for
  cyclists; a run exported without a type counts toward DCU's hours until
  the rider deletes it.
- **Zip is read, not trusted**: only stored and deflate entries, none
  encrypted, the first activity file only.

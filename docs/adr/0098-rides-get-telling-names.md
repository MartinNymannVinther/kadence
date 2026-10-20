# ADR 0098: Rides get telling names

Status: accepted · Date: 2026-10-14 · Builds on 0029–0032 (rides in from Garmin, Wahoo, Polar and a Strava archive), 0054 (every feature in the demo), 0063 (Today and a ride's page)

## Context

A rider opened "Mine ture" and read "23456789012", "23456700001_ACTIVITY"
and "2026-09-20-11-16-25". The import keeps a file's own name as the
ride's title when nothing better came with it (`importFit`), and Garmin's
download, Strava's archive and an Edge's own files are named by an id or
a time stamp. A ride from Polar's API is always "Polar", and one from
Wahoo or Garmin without a workout name "Wahoo" or "Garmin" — Kadence's
own stand-ins. A file's name says little to a rider.

## Decision

- **Worked out when shown, not stored.** A pure function
  (`src/modules/activities/ride-name.ts`) names a ride from what the row
  already holds. No migration, and every ride stored so far gets its name
  at once. The stored title is left as it came; **the export carries the
  stored title**, untouched.
- **What counts as a file's name** (`file-name-title.ts`), conservatively —
  shapes a person would not type: empty; Kadence's stand-ins "Wahoo",
  "Garmin", "Polar"; a file ending (.fit, .tcx, .gpx, .gz, .zip, also
  .fit.gz); six or more digits ("23456789012"), also with Garmin's
  `_ACTIVITY` or `activity_` and Garmin's full-export `mail_id`; a date,
  alone or with the time, in the ways devices write it
  ("2026-09-20-11-16-25", "2026-09-20 11.16.25", "20260920_111625",
  ISO); Wahoo ELEMNT's "2026-09-20-111625-ELEMNT …"; anything ending in a
  full time stamp (Polar's "Navn_2026-09-20_11-16-25"); older Garmin
  devices' eight characters ("B9K91234"); a UUID or a long hex digest. A
  browser's " (1)" is ignored. "Morning Ride", "Zwift - Watopia",
  "Indendørs cykling", "Fri tur" are names and are kept.
- **The name**, in order:
  1. a name a person or a device gave the ride is kept;
  2. else the planned session the ride was ridden for ("Løbetur 30 min");
  3. else `strength` is "Styrketræning"; a bike ride from a file with
     samples and not one position is "Indendørs tur"; otherwise the part
     of the day it started, Copenhagen time — 05–10 "Morgen", 10–12
     "Formiddag", 12–17 "Eftermiddag", 17–22 "Aften", else "Nat" — and
     the sport: "Morgentur", "Eftermiddagstur" on the bike,
     "Morgentræning", "Aftentræning" for anything else;
  4. an entry by hand starts at noon by convention, so its hour is not
     read: "Cykeltur" or "Træning".
     English under the same keys (`activities.names`): "Morning ride",
     "Late morning ride", "Indoor ride", "Strength session", …
- **Indoors is asked only where the name turns on it.** Whether a ride
  had a position is in `streams`, the largest column on the row, so the
  loaders read it (`jsonb_path_exists` on `streams.lat`) only for bike
  rides with no name of their own and no session
  (`src/modules/activities/names.ts`), inside the caller's transaction and
  RLS. A row whose samples never carried positions is not called indoors.
- **Used wherever a ride is named**: "Mine ture", the ride's page and the
  comparison, the calendar's unplanned rides, Today's "Hvor hårdt føltes
  turen", "Kørt sammen", the records, the threshold proposal's sources,
  the parent's conversations, the coach's "Nyt fra rytterne", and a
  reminder on the lock screen (which shows only a given name or the
  session's, never a time-of-day word, and otherwise says "a comment"
  plainly). The AI's comment reads the session's title only, never a
  ride's, so nothing changes there.
- **The demo.** The first ridden file in the demo comes as
  "24720018916_ACTIVITY.fit" and goes by its session's name.

## Trade-offs accepted

- **A run is "…træning", not "…løb".** Kadence stores only bike,
  strength and other; the FIT file's sport is not kept on the row. Telling
  a run would take a column for the file's sport (or sub-sport), set on
  import and once for the stored rides from their files — a migration this
  change avoids.
- **The name is worked out on every read.** A few microseconds a ride, and
  one more small query per list; the price of no migration and no stale
  stored names.
- **An outdoor ride with the GPS off is "Indendørs tur".** No position is
  the only cheap sign; a smart trainer with a virtual route (Zwift) has
  positions and is named by the time of day, which is right enough.
- **A title that only looks like a file's name is replaced on the pages.**
  Someone who names a ride "20260920" sees "Formiddagstur"; the stored
  title stays, and the export has it.
- **The title cannot be edited** on a ride's page today; this does not add
  it.

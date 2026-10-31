# ADR 0110: Rides from Garmin say so, and the rider says yes first

Status: accepted · Date: 2026-10-31 · Builds on 0018 (devices act as the rider), 0088 (consents), 0080 (a person alone)

## Context

Garmin's Connect Developer Program opened again in October 2026 with a
free Starter tier for organisations. The Garmin adapter from ADR 0018
has waited, inert, for a key since September. Before a single rider's
Garmin rides reach Kadence, two things must hold.

First, Garmin's public API Brand Guidelines (V 6.30.2025) ask every app
that shows data from Garmin's API to say so: "Garmin [device model]"
directly beneath or beside the title of anything that shows a ride, in
lists on each entry or once in the header, and a line such as "Insights
derived in part from Garmin device-sourced data" wherever such data is
combined with other data or used for derived numbers. Never in a
tooltip, a footnote or a fold. Kadence shows rides on a dozen pages, and
nearly every number on the calendar, the rider's page, Today and the
parents' page is derived in part from rides.

Second, connecting Garmin sends things both ways: Garmin sends the
rider's rides, and a coach's "send" puts a session in the rider's Garmin
account. A rider should know that before they leave for Garmin, see
Garmin's privacy notice, and say yes in Kadence.

## Decision

- **One line, one source.** `garminAttribution()`
  (`src/modules/devices/attribution.ts`, pure) turns a ride's `source`
  and the new `activities.device_name` into "Garmin Edge 1030 Plus", or
  "Garmin" when the device is unknown, and into nothing for any other
  source. A FIT file from a Garmin that the rider uploads is the rider's
  own file and keeps saying which file it came from.
- **On every ride.** The ride's page has the line under its title, where
  the source line was. The rider's list of rides, the calendar's
  unplanned ride cards and a session's "Udført" box carry it on each
  ride. The line wraps; it is never cut short.
- **Under every heading built from rides.** `GarminDerivedNote` stands
  under the calendar's week, month and season navigation, and under the
  heading of the rider's page, Mig, I dag and the parents' page, when a
  ride from Garmin is among what the page is built on.
  `garminRidesIn()` answers that with one `exists` under the reader's
  own policies, so the note says nothing about a rider the reader cannot
  see. The rider's pages look back 120 days, because the fitness curve
  carries a ride for weeks.
- **The export keeps it.** The rider's export writes `device_name`
  beside `source` on each ride.
- **The rider says yes in Kadence.** "Forbind Garmin" opens a dialog: what
  goes each way, that Garmin keeps and may use what it gets, a link to
  garmin.com/privacy/connect, a word to a rider who may not put data in
  their Garmin account, and a box to tick. The yes is a row in
  `consents` (`kind = 'garmin'`, its own version, the language it was
  read in), written when the connect route sends the browser on; the
  route refuses to go on without it. Disconnecting withdraws it. A
  second kind, `garmin_ai`, is in the schema for the rider's own yes to
  letting the AI read their Garmin rides. The AI does not yet tell the
  rides apart; that comes, with the rider's yes and the words for it,
  before the adapter is switched on.
- **The demo shows no Garmin ride.** Its rides are made up, and the
  attribution would claim they came from Garmin.
- **The checklist.** CONTRIBUTING.md gets a Garmin checklist, so a new
  page that shows rides carries the line or the note.

## Consequences

- A rider, a coach and a parent can always tell which rides came from
  Garmin and which numbers rest on them. The note shows on a page as
  soon as one ride from Garmin is in it, even when it moved the numbers
  little; that is what the guidelines ask, and it is honest.
- The note is a query per page on the pages that carry it; it is an
  `exists` on an indexed rider and date, and it costs nothing visible.
- A new place that shows rides has one more thing to remember. The
  checklist and the two components keep it to one import.
- The yes is recorded before the rider reaches Garmin, so a rider who
  turns back at Garmin's own page leaves a standing yes with no link.
  It says only what they agreed to; the next connection is a new row,
  and a disconnect withdraws every standing one.
- The adapter itself, moved to the way Starter delivers data, comes in
  its own change.

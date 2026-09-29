# ADR 0027: Strava stays a file source

Status: accepted · Date: 2026-09-28 · Builds on 0018, 0022 · Its two slices built in 0030

## Context

Riders use Strava, and a coach asked whether their rides could come into
Kadence from there, preferably automatically. Strava's API Agreement and
API Policy of 1 June 2026 (docs/research/strava.md, read against the
texts themselves) say that a user's Strava data may be shown only to
that user (Policy §2.3, §6.2), kept for at most seven days (§6.2), not
analysed or combined with other data (§5.4, §5.5, §5.7), and never used
with an AI model, a local one included (§5.3). Every installation would
need its own registered app under a paying adult subscriber, reviewed by
Strava beyond ten riders (Agreement §1.1–1.2, Policy §3.3, §3.6, §5.16).
The coaching tolerance some tools rely on rests on a phone call from
November 2024, contradicted by the written text and revocable.

## Decision

- **No Strava API adapter.** The coach's view, the parents' view, the
  season-long load and records and the Monday brief are each barred by
  the written terms; a tool for health data about minors, run by
  volunteer clubs, does not stand on tolerance. Dogmas 1 and 2 (1:1
  self-hosting, nothing walled behind a fee, works with the internet cut)
  could not be kept either.
- **Strava's export is the way in**, and it is guaranteed by Strava's own
  Policy (§6.6): "Export Original" per ride, or the whole archive, both
  read by Kadence since ADR 0022 (`.fit.gz`, `.gpx`, zips).
- **The device is the automatic path.** Garmin, Wahoo and Polar are
  upstream of Strava; connected directly (ADR 0018, 0020) they deliver
  the original file to Kadence the moment the ride ends.
- Revisit only if Strava publishes, in writing, that a rider's data may
  be shown to their coach and guardians, lifts the retention cap, and
  offers a route for small open-source, self-hosted apps without a
  per-installation subscription. All three are needed.

## Trade-offs accepted

- **Riders who record only in the Strava app upload by hand**, per ride
  or as one archive. A guide "Fra Strava til Kadence" and a drop zone
  that takes the whole archive are the slices that make it one move.
- **No Strava badge in the window.** Some riders will ask; the answer is
  in the help text, with the reason.

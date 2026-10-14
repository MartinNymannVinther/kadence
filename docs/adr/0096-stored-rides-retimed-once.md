# ADR 0096: Smart recording read as moving, and the stored rides corrected once by a job

Status: accepted · Date: 2026-10-14 · Amends ADR 0022 (how a file's moving time is read) · Builds on 0016 (load on one scale), 0085 (jobs and a worker)

## Context

A watch or computer on smart recording writes a record every one to nine
seconds. The timeline (`src/modules/fit/timeline.ts`) held a record only
until the next one came within five seconds and read every longer silence
as a pause, so Martin's 31-minute run on 14 October 2026 was stored as 20
minutes moving, and the averages, zones, work and load computed from those
seconds were off with it. Every ride from such a device is stored that way.

## Decision

- **The rule.** A silence of up to `MAX_TRAVEL_GAP_SECONDS` (60) holds the
  record through it when the device's distance, or without one the
  position, advanced at walking pace or more (`travelledThrough`). A
  silence where the rider stood still, or a longer one, is still a pause.
  New imports read it so.
- **The stored rides are corrected once, by a job, on the first deploy.**
  Migration 0057 puts one `activities.retime` job in the queue (payload
  `{}`, key `once`, guarded so it is never queued twice), and the worker
  container — or the app's own worker on an installation without one —
  runs it; nobody runs a script. The job asks the new definer
  `workspaces_with_files()` for each workspace with stored files and one
  coach of it (two ids, owner first, refused from inside a workspace, as
  `dcu_teams_due()`), and reads every stored file again as that coach,
  under RLS, one transaction per file (`src/modules/devices/retime.ts`).
  A ride whose moving time read again differs from the stored by more
  than 30 seconds and more than 1 % gets its moving seconds, average
  power, weighted power, average heart rate and cadence, work, zones,
  fastest second, power curve, heart-rate drift, streams and load
  rewritten. A load by power or heart rate takes the load read again; a
  load from the rider's RPE stays RPE's, recomputed from the new minutes
  with the same calibration as the rider's feedback; a ride with an RPE
  whose file gives nothing better falls back to it. Title, RPE, feel,
  note, the matched session, the start and the elapsed time are not
  touched. The log has counts only. Running it again changes nothing.

## Trade-offs accepted

- **A corrected load uses the rider's current thresholds**, not the ones
  that stood on the day of the ride: Kadence does not keep a history of
  thresholds. A rider whose FTP has risen since sees a corrected ride a
  little lighter than it would have been on the day. Only rides that are
  corrected are recomputed; every other ride keeps its load as stored.
- **The audit log names the coach** the job ran as for each corrected
  ride, as `scripts/reread-activities.ts` does, not "the system".
- **One long job.** On a large installation the run holds the worker for
  as long as it takes to decode every stored file, bounded at 30 minutes
  and tried three times; a ride arriving meanwhile waits for it.

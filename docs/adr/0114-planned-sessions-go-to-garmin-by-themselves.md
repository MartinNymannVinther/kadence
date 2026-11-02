# ADR 0114: Planned bike sessions go to the rider's Garmin by themselves, are kept in step with the plan, and are taken off when they go

Status: accepted · Date: 2026-11-01 · Builds on 0018 (devices act as the rider), 0031 (sessions by cable), 0085 (jobs), 0110 (Garmin says so), 0113 (Garmin on Starter)

## Context

Rides come in from Garmin by push (ADR 0113). The other way, "Send til
Garmin" put one session in the rider's Garmin Connect calendar on the
paths of the Training API's first version, as a copy: pressed twice, it
made two workouts; changed afterwards, the old one stayed. Garmin's
current Training API is version 2, with a workout made of segments,
schedules addressed by their own id, and a step limit.

Martin decided:

1. A rider with Garmin connected, who let Garmin take workouts
   (`WORKOUT_IMPORT`), gets their planned bike sessions for the next seven
   days on their Garmin by themselves. The rider can turn it off and on
   on the Garmin card; it is their setting, not a coach's or a parent's.
   "Send til Garmin" on a session keeps working, also when it is off.
2. Targets in fixed watts from Kadence's own threshold, as before; heart
   rate when there is no power threshold; cadence as the secondary target
   where the step has one; open otherwise.
3. Bike sessions only. Strength and other sports are never sent.
4. Routes and courses are not part of this.

## Decision

- **Version 2.** A workout is created on Garmin's workout portal path and
  read, replaced and deleted on the Training API's version 2 path; a
  schedule puts it on a day and is moved and deleted by its own id
  (`garmin-training.ts`). The workout is one `CYCLING` segment
  (`garmin-workout.ts`, pure): steps and repeats numbered through, a
  repeat of one written as its steps, durations in seconds, the
  description cut to 1024 characters and a step's to 512, `Kadence` as
  the provider. A session with more than 100 steps, counting repeats, is
  not sent, and the rider and coach are told so in words.
- **Targets.** Watts from the zone's band or the share of FTP at the
  rider's FTP. Without an FTP, a power step falls back to heart rate:
  the same zone of Kadence's one zone model on the pulse side, at the
  threshold heart rate. A share of threshold heart rate is beats. A
  cadence range is the secondary target beside power or pulse, and the
  target on a step with nothing else, since Garmin takes a secondary
  target only beside a primary one. An RPE is open, with its words in the
  step's description, as on the files of ADR 0031.
- **Remembered.** A new table, `device_workouts` (drizzle/0062): the
  workspace, the rider, the session, the provider, Garmin's ids for the
  workout and its schedule, the day it is on, a hash of the workout as
  sent, when it was sent and the last error. It is a row about a rider:
  forced RLS, read by whoever may read the rider's training
  (`app_can_read_rider`), written by the rider or a coach
  (`app_can_write_rider`), naming only the rider's own session; an audit
  trigger; a place in the history move after the sessions and the link;
  left out of the export, which has the sessions and the trail. Every
  write is made in the rider's name, as ADR 0018 has it. A deleted
  session sets the row's session to null rather than taking the row, so
  the workout can still be taken off.
- **One path** (`workout-sync.ts`), for the job and for a press: no row,
  the workout is created and scheduled; its hash changed, it is replaced
  in place, after reading it for the owner's id Garmin wants in a
  replacement, and recreated if the rider deleted it in Garmin Connect;
  only its day changed, the schedule is moved; nothing changed, nothing
  is called, so a press twice makes no copy. A session deleted, moved out
  of the window or no longer a bike session with steps has its schedule
  and its workout deleted at Garmin and its row dropped. The hash covers
  the workout as sent — title, description, steps and the targets worked
  out from the thresholds — so a new FTP re-sends; the day is the row's
  own column, so a move costs one call instead of three.
- **What Garmin answers.** 401: the link is in "error" for the rider to
  connect again, as G2's calls leave it. 403: noted on the link as
  `workouts_refused`, while the link stays connected and rides go on; the
  job leaves the link until the rider connects again or a press gets
  through. 412: the permission is missing, and the rider's permissions
  are read again from Garmin. 429: busy; the job's run ends. Another
  refusal is remembered against the workout's hash, so the job does not
  send the same thing again; a press does. Anything else is tried again
  on the next run.
- **The job.** `device.workouts`, every quarter of an hour.
  `device_links_to_sync()` (a definer that answers three ids and whether
  to send, for the links `device_link_owner` would also name, and
  refuses from inside a workspace) names the connected Garmin links whose
  rider sends by themselves and granted workout import, and those still
  holding rows for days that have passed. As each rider, the job drops
  the past rows without a call, then compares the bike sessions from
  today through the sixth day after (Copenhagen days) with the rows
  (`calendar-plan.ts`, pure) and syncs the difference. A workout sent
  ahead by a press is left until the window reaches it. A workspace that
  may only be read sends nothing.
- **Garmin's limits.** Every call takes one from two budgets first
  (`calendar-budget.ts`): 40 a minute for the installation and 80 a day
  for each rider, fixed windows well under Starter's rolling 100 and 200,
  leaving the rest to rides and renewals. One sync per rider at a time,
  whoever starts it, by a lease, so the job and a press cannot both
  create the same session.
- **The rider's switch.** `device_links.auto_send`, true by default, set
  by a server action only the link's own rider may run; the database lets
  nobody else write the link anyway. Off sends nothing more by itself and
  leaves what is there. The Garmin card holds the switch and says plainly
  when Garmin has not been allowed to take workouts, and what to do.
- **On the session**, for the rider and their coaches: it is in the
  rider's Garmin calendar and since when, it will come within a quarter
  of an hour, or why not — too many steps, Garmin turned it down, the
  permission is missing, Garmin refuses Kadence — above "Send til
  Garmin".
- **Leaving.** Before Garmin is told to forget a rider — disconnecting,
  erasure, account deletion, a deleted workspace — the workouts for today
  and later are deleted at Garmin with the token that still works, every
  one at once, within three seconds (`calendar-exit.ts`), and the rows go
  with the link. A confirmed deregistration only drops the rows.
- **The rider's yes says so.** The words before connecting, the privacy
  page, the devices page and the help now say that the planned bike
  sessions for the next seven days go to Garmin by themselves unless the
  rider turns it off; the yes is written against a new version of them,
  `2026-11-01`.

## Trade-offs accepted

- **On by default for riders already connected.** Their yes was given to
  "the sessions I or my coach choose". A planned session is the coach's
  choice for the rider, and the rider can turn it off; it is still a
  wider reading than the words had, and it is Martin's to confirm.
- **The past is left alone.** A workout whose day has passed is never
  changed or deleted at Garmin; Kadence forgets it. A session moved from
  the past into the window gets a new workout, and the old one stays on
  its old day.
- **Off is not a clean-up.** Turning the switch off leaves the sessions
  already on Garmin, and they are no longer kept in step; a press sends
  one again.
- **A 403 is not a broken link.** Treating it as the token's refusal
  would stop every rider's rides if the app itself lacked the Training
  API; the link is noted instead, and the job stops sending to it.
- **A replacement costs two calls.** Garmin wants the owner's id in a
  replacement. Reading it first, rather than keeping it, also finds a
  workout the rider deleted in Garmin Connect.
- **A schedule whose id Garmin does not say** is found by its day. If it
  cannot be found, the next run schedules it again, which can leave a
  second schedule.
- **Up to a quarter of an hour.** A deleted or changed session stays as
  it was on the rider's Garmin until the next run; the first run after a
  deploy sends every rider's week 40 calls at a time.
- **The converter is part of the hash.** A change to how a session
  becomes a workout re-sends every upcoming session once.
- **Garmin's documentation does not say** whether deleting a workout
  deletes its schedules; Kadence deletes the schedule first.
- **Later.** Routes and courses, strength and other sports as Garmin
  workouts, and Wahoo kept in step the same way.

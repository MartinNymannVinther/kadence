# ADR 0031: Sessions onto a Garmin by cable

Status: accepted · Date: 2026-09-29 · Builds on 0018 · A Connect IQ app, the next step, is its own decision

## Context

A rider should be able to ride the session a coach planned with its
steps, targets and countdown on the bike computer. Garmin's partner
route, which puts workouts in the Garmin Connect calendar, has taken no
new applicants since 25 March 2026 and was for businesses with
credentials per operator before that; Garmin Connect takes no workout
file; the push to Garmin (ADR 0018) is dormant. Garmin documents one
route that needs nobody's permission: a FIT workout file in the device's
`Garmin/NewFiles` folder, taken in when the device is ejected
(docs/research/workouts-to-devices.md).

Kadence already wrote FIT workouts, but for a folder on a computer: named
by the title alone, although a Garmin shows a workout's first 15
characters and lets workouts that begin alike overwrite each other; with
no serial number, although a Garmin tells files apart by type, maker,
product and serial; with no cadence and no word of the RPE.

## Decision

- **The FIT workout is written for a device.** Its name begins with the
  day, "29.09 Tempo", and "29.09-2 …" for the day's second bike session
  with steps; the file is named by the day, "2026-09-29-tempo.fit". The
  `file_id` carries a serial for this version of the session, from its id
  and when it last changed. The session's description is the workout's.
  Every step is named: the coach's label, or else its target in short
  ("Z3", "90-95% FTP", "RPE 7"). What the device cannot hold is in the
  step's notes: the RPE, a pulse without a threshold. A cadence range is
  the secondary target beside power or pulse, and the target where there
  is nothing else. Every field number is checked against Garmin's FIT
  profile. The trainer formats are named by the day too.
- **"Send til cykelcomputer"** on a session, and **"Send ugens pas til
  cykelcomputeren"** on Today for the next seven days' bike sessions with
  steps. Where the browser can write to a folder the rider picks (the
  File System Access API: Chrome and Edge on a computer, Chrome on
  Android), one press asks for the device and writes the files into
  `Garmin/NewFiles`. The picker is the first thing the press does, since
  the browser allows it only then, and it remembers the device. Kadence
  finds NewFiles from the drive, the Garmin folder or NewFiles itself,
  makes it in a Garmin folder that has none, reads nothing on the device
  but folder names, and writes and deletes nothing else. Elsewhere
  (Safari, Firefox, an iPhone) the press shows the files to download and
  says where they go.
- **The export route is counted**: 300 files an hour per person. A week
  is seven.
- **Nothing is automatic, and nothing new is stored.** A session reaches
  the device when the rider presses, which is the promise
  `docs/subprocessors.md` makes. No schema change, no new route.

## Trade-offs accepted

- **A cable and a press.** The way without either is a Connect IQ app on
  the Edge that fetches the day's session from Kadence; it needs a store
  account, a key that may read, and a device in hand, and is its own
  decision.
- **The newer Edges are out of the browser's reach.** The 540, 550, 840,
  850, 1040, 1050, Explore 2 and MTB speak MTP: a browser cannot write to
  them, and a Mac cannot see them at all. The rider downloads the files
  and copies them with File Explorer on Windows.
- **Untried on a device.** That NewFiles is taken in, the 15 characters,
  the serial, the notes and the secondary target are Garmin's
  documentation and profile, read, not seen on an Edge (TECH-DEBT.md).
- **A changed session sent again** is a new file under the same name, and
  the device's own rule about names decides what it keeps. If the change
  was to the first characters of the title, the old version may stay
  beside the new until the rider removes it.
- **One date format for every reader**: day and month, the Danish way.
- **Power stays power.** A zone or a share of FTP is a power target in
  percent of FTP for every rider; one without a power meter sees a target
  the device cannot measure, with the zone or RPE in the step's name. A
  heart-rate target in place of power for such a rider is a later
  decision.
- **Chrome asks the first time** whether Kadence may see and edit the
  device. A rider who says no is told so, in words.

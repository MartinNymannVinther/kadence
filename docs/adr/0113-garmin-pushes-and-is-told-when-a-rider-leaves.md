# ADR 0113: Garmin pushes, a file is kept once it arrives, links stay alive, and Garmin is told whenever a rider leaves

Status: accepted · Date: 2026-10-31 · Builds on 0018 (devices act as the rider), 0085 (jobs), 0087 (file storage), 0110 (Garmin says so), 0112 (the AI and Garmin)

## Context

The Garmin adapter from ADR 0018 was written before Kadence had keys, to
what Garmin then said in public. Garmin's Connect Developer Program now
has a free Starter tier, and Kadence is on it. On Starter, Garmin sends
everything by push: Kadence asks for nothing on its own, there is no
history to fetch and no button to press. Several things the adapter
assumed did not hold:

- The account's id, the rider's permissions and the deregistration live
  on Garmin's partner gateway, not where the adapter asked.
- A push carries no signature. The adapter let a push without Garmin's
  client header through.
- A ride's file can be downloaded once, for a day. A job that downloaded
  the file and then failed to import it would get nothing the second
  time.
- A push may hold many events. The webhook worked through the first 50
  and dropped the rest after answering 200, so Garmin would never send
  them again.
- Nothing wrote the device a ride was recorded on, so the attribution
  of ADR 0110 could only ever say "Garmin".
- A refresh token runs out some months after it was issued, and only a
  refresh hands out a new one. A rider who rides nothing all winter makes
  no call that refreshes it, and the link would die quietly, taking with
  it Kadence's means of telling Garmin to forget the rider.
- Garmin must be told whenever a rider leaves in any way. Only the
  rider's own "Afbryd" told it; deleting a workspace, erasing a rider and
  deleting an account took the link away by cascade, token and all.
- A rider chooses on Garmin's page what to share, and may change it
  later. Kadence did not know what the rider had chosen.

Martin decided that every type of activity comes in, not only rides on
a bike.

## Decision

- **Paths.** `user/id`, `user/permissions` and `DELETE user/registration`
  go to `apis.garmin.com/partner-gateway/rest/`.
- **A push is believed only from Garmin.** It must carry the
  `garmin-client-id` header with this installation's client id
  (compared in constant time) and come from one of Garmin's address
  ranges (`garmin-ip.ts`, pure and tested), as the installation's proxy
  saw it (`clientAddress()`, `TRUSTED_PROXY_HOPS`). Anything else is a
  401, logged by provider and nothing more. What gets through anyway can
  still do no more than ADR 0018 allowed: fetch from Garmin's own file
  path as the rider the push names.
- **Three kinds of push**, read entry by entry so one malformed entry
  costs only itself (`garmin-push.ts`): `activityFiles`,
  `deregistrations` and `userPermissionsChange`. Every other key is
  ignored. Every event within the 256 KiB body cap becomes a job before
  Garmin gets its 200; the cap of 50 is gone.
- **Every activity comes in.** Garmin's activity type decides the sport
  over the file's own, as a Strava archive's list does for a GPX (ADR
  0030): every kind of bike is `bike`, strength training is `strength`,
  everything else is `other`, which the calendar shows without counting
  it as riding. Without a type the file decides, as for any upload.
- **The rider's yes says so.** The words a rider agrees to before
  connecting (ADR 0110) said "rides"; they now say rides and other
  activities, such as runs and strength training, and the yes is written
  against a new version of them, `2026-10-31`. A yes given to the old
  words stays what it was.
- **The device all the way in.** `deviceName` is made plain
  (`device-name.ts`: letters, digits, spaces, a little punctuation, 80
  characters; nothing for an activity entered by hand or a device Garmin
  calls unknown), carried in the job's payload as a new field sort,
  `device`, and written to `activities.device_name`, where the
  attribution reads it.
- **Downloaded once, kept.** A new table, `device_inbox` (drizzle/0061),
  holds a ride's bytes between the download and the import, as the
  rider, under the same policies as a ride's file. The next try imports
  from it instead of asking Garmin again. The row goes in the import's
  own transaction, or as soon as the ride is refused for good; on the
  job's last try it goes and the link says `import_failed`. A file Garmin
  answers 410 for is `download_gone` on the link and is not tried again.
  The bytes stay in the database whatever `FILES_STORAGE` says: they live
  minutes, and an object store would need its own clean-up for them.
- **Links stay alive.** `device_links` gains `refresh_expires_at` and
  `permissions`. A recurring job, `device.refresh`, runs once a day:
  `device_links_to_renew()` (a definer that answers three ids and two
  booleans, for the links `device_link_owner` would also name, and
  refuses from inside a workspace) lists the Garmin links whose refresh
  token runs out within 14 days or whose end is unknown, and those whose
  permissions were never read; the job renews and reads them as the
  rider. Neither asks Garmin for any data. A link Garmin will not renew
  is left in "error" for the rider to connect again.
- **Permissions.** Read with the rider's token after connecting, by the
  daily job when they are unknown, and whenever Garmin pushes that they
  changed — never taken from the unsigned push itself. The Garmin card
  says plainly when the rider does not share activities, and what to do.
  "Send til Garmin" is offered, and accepted, only when the rider granted
  workout import.
- **Garmin is told on every exit** (`exit.ts`). Before a workspace is
  deleted (by its owner), before a coach erases a rider, and before an
  account is deleted — including the person's links on teams they left,
  which `own_device_links()` names for the caller alone and which are
  then deleted with their tokens. Every rider at once, each with a short
  deadline; a failure is logged by its code and never with a token, and
  the deletion goes on.
- **A deregistration push** is believed when Garmin refuses the rider's
  token, either asked whose account it is or asked to renew it. The link
  then loses its tokens and permissions and stays "revoked" with
  `deregistered`, so the devices page says what happened, and both of
  the rider's yeses to Garmin (`garmin`, `garmin_ai`) are withdrawn in
  the same transaction, as the rider.

## Trade-offs accepted

- **A new table for minutes of life.** `device_inbox` carries the whole
  checklist of a table about a rider — forced RLS, an audit trigger
  without its bytes, isolation tests, a place in the history move — for
  rows that exist between a download and an import. The alternative was
  losing a ride to every deploy or database hiccup in that window.
- **The address ranges are a list in the code.** A range Garmin adds is
  refused until it is written here. The refusal is logged, and Garmin
  tries a refused push again for days, so a new range costs a delay, not
  rides, if it is noticed.
- **A proxy that is not counted refuses Garmin.** With a CDN in front of
  the installation's own proxy, `TRUSTED_PROXY_HOPS` must count it, or
  every push looks like it came from the CDN. docs/deploy.md says so.
- **A real deregistration whose token still works is not believed.** If
  Garmin went on accepting a token after deregistering the rider, the
  link would stay "connected" with no rides coming in. Believing an
  unsigned push instead would let anyone who got past the address check
  disconnect a rider. Garmin is asked to confirm how its tokens behave.
- **The sport follows Garmin over the file.** A rider who mislabels a
  ride in Garmin Connect gets that label in Kadence too; it is the
  rider's last word, and the same rule ADR 0030 chose.
- **Every activity counts as something.** Runs, swims and walks fill the
  rider's week as `other`. It was Martin's choice; the calendar already
  keeps them apart from riding.
- **The bearer token goes with the one-time download.** Garmin's file
  address carries its own token; whether the rider's is needed as well
  is asked of Garmin. Sending it is harmless and keeps a download
  working whichever way Garmin answers.
- **Later.** Sessions to the device on Garmin's current Training API,
  courses, Garmin's download rate on Starter, TCX and GPX files, and a
  count against Starter's ceiling on connected users come in their own
  changes. Until the Training API moves, "Send til Garmin" uses the paths
  it always used.

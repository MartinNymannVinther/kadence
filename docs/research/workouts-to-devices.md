# Planned sessions onto the rider's device, without Garmin's partner programme

Research of 2026-09-29, for the question: how does a session a coach
planned in Kadence reach the rider's bike computer, so the rider can
ride it with targets and a countdown on the screen? The other direction,
rides into Kadence, is `garmin-without-partner-access.md` and ADR 0029.

Four tracks were run in parallel from primary sources where they could
be had: Garmin's own documentation and terms, API specifications, source
code, store listings. Garmin's support site refuses automated reading,
so its FAQs were read from Wayback snapshots, dated below. Nothing was
tried on a device. The web-search budget ran out in every track; what
was not looked into is listed at the end, and "not found" there means
"not looked for".

## 1. What Kadence has today

- **A FIT workout encoder of its own** (`src/modules/workouts/export/fit-workout.ts`):
  file type 5, `workout` and `workout_step`, power as percent of FTP,
  heart rate as bpm from the threshold, repeats. Beside it `.zwo`,
  `.erg` and `.mrc`, all behind `GET /api/sessions/[id]/export`.
- **A push to Wahoo and Garmin** (`src/modules/devices/push.ts`), dormant
  without partner keys. It stores nothing about what it sent, has no
  update or delete, so a second press adds a copy, and runs only when
  someone presses.
- **No scheduler**, and a promise in `docs/subprocessors.md` that "a
  session goes out only when a person presses send". Anything automatic
  changes that promise.

## 2. Garmin

**The partner route is shut.** Garmin's access form has held nothing but
"System Maintenance – Garmin Connect Developer Program … Stay tuned"
since 2026-03-25 (the page's own CMS data). The programme was "only for
business use" before that, with credentials per operator, so it could
never have been 1:1 on every installation anyway.
<https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/>,
<https://developer.garmin.com/gc-developer-program/program-faq/>

**Garmin Connect takes no workout file.** Import Data is for activities
(.fit, .gpx, .tcx); courses have an Import button and "open with Garmin
Connect" on a phone; workouts have only "Create a Workout". There is no
share link for a workout: Garmin Share is device to device within three
metres. (FAQs `Ht3ZP52Kju075uKvqTqu99`, `wZ52AaLbLG2GC1Lxu2l4k7`,
`Oyqt6jUjOF8L1Rnuc9Sms8`, `GBq0V1Kalj0Aukq44RJXWA`, Wayback 2026-05 to
2026-08.) Browser extensions that post to Connect's internal
`/gc-api/workout-service` exist, break when Garmin changes its web app
(twice in 2026), and fall under the Terms of Use clause against access
"through any means not purposely made available". Not for Kadence.

**The cable is Garmin's own documented route.** The FIT SDK cookbook:
plug in, open `Garmin/NewFiles`, put the files there, disconnect; the
workout is under Menu › Training › Workouts. An Edge keeps 200 workouts,
a watch 25. <https://developer.garmin.com/fit/cookbook/encoding-workout-files/>

- Garmin's FAQ: most devices show a workout's first 15 characters, and
  workouts whose first 15 characters are alike overwrite each other.
  Kadence's names today are the session's name only; the date should
  come first. The `file_id` should carry a serial number per version.
- The profile has a secondary target (cadence beside power) and a
  `notes` field per step; Kadence writes neither.
- A web page can write to the drive with the File System Access API
  (`showDirectoryPicker({ mode: "readwrite" })`): Chrome and Edge on a
  computer from 86, Chrome on Android from 132; not Safari, not Firefox.
  Chromium's blocked-folder list does not block a removable drive
  (read in the Chromium source; untried).
- The newer Edges (540, 550, 840, 850, 1040, 1050, Explore 2, MTB) speak
  MTP. On Windows a browser can open files on an MTP device but not a
  folder to write into; a Mac has no MTP at all. For them the file is
  downloaded and copied by hand (Explorer on Windows).

**A Connect IQ app can put a native workout on the Edge from Kadence's
own server.** Connect IQ is a separate, open programme, the SDK is free
(9.2, 2026-08-25), and publishing is free for free apps.

- `Communications.makeWebRequest` with
  `HTTP_RESPONSE_CONTENT_TYPE_FIT` downloads a FIT workout and "store[s]
  the contained data in the device"; `PersistedContent.Workout.toIntent()`
  with `System.exitTo()` starts Garmin's own workout player (API 2.2.0).
  From API 5.2.0 a data field can also load a workout into the running
  activity (`DataField.setWorkout`, permission `ActivityControl`).
  <https://developer.garmin.com/connect-iq/core-topics/downloading-content/>
- Devices: Edge 530, 830, 1030, 1030 Plus (device app or widget) and
  540, 550, 840, 850, 1040, 1050 (device app with a glance). **Not** the
  Edge 130 and 130 Plus (data fields only), Explore, Explore 2 or MTB
  (not on the `PersistedContent.Workout` list). Watches from Forerunner
  55 and fēnix 6 up. (Garmin's device reference and API device lists.)
- It needs the phone with the Garmin Connect app over Bluetooth, or the
  Edge's own Wi-Fi in sync mode. HTTPS with the full certificate chain
  is required; Garmin's phone app does not follow redirects.
- Known on hardware, from open-source code: the import does not happen
  while an activity is recording; HTTP 200 does not prove the file was
  taken; errors may reach the app as code 0, so errors go as JSON with
  200; the app should remove its old workouts.
- Store: a developer account aged 18 or over, a privacy policy of its
  own, review "usually within 72 hours". The app can be open source (MIT,
  Apache and BSD apps are in the store); whether AGPL sits well with the
  store's terms is a decision of its own.
- Precedents: TrainAsONE (BSD-2, watches) downloads its next workout as
  FIT and starts it with `exitTo`; gimporter (Apache-2.0, every Edge)
  does the same for courses; PowerTimeline+ loads workouts into an
  activity on Edge 540–1050 with `setWorkout`. No open-source example of
  a cycling workout started this way on an Edge was found.
  <https://github.com/TrainAsONE/trainasone-connectiq>,
  <https://github.com/gimportexportdevs/gimporter>

**The EU gives no right to write to a device.** The Data Act is about
access to data and sharing it outwards (art. 4, 5); Garmin is no DMA
gatekeeper.

## 3. Relays: services that pass a workout on to the device

| Service       | Writes planned workouts                                                                        | Reaches                                                               | Rider pays                                                                                                     | Age                                  | Where                    |
| ------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------ |
| intervals.icu | Yes: create, upsert on `external_id`, update, delete (`CALENDAR:WRITE`)                        | Garmin, Wahoo, COROS, Suunto, Zwift; Karoo pulls. Next 7 days         | Free                                                                                                           | **18+**                              | UK Ltd; Germany, Finland |
| Nolio         | Yes: create, update, delete by `id_partner`, OAuth, a coach may write for athletes             | Garmin (≈40 intervals), Wahoo, Karoo, Zwift, COROS, Suunto; not Polar | API access is Premium (EUR 6.90/month) or a coach plan; per-installation approval; a personal app has 5 riders | Minors with a parent's authorisation | France, AWS Paris        |
| Tredict       | **Not on a date**: a plan in "My Plans" the rider must apply; move and retitle only; no delete | Garmin, COROS, Suunto, Wahoo, Zwift, Karoo                            | Writes need paid access (DKK 399/yr)                                                                           | 14+                                  | Germany                  |
| TrainingPeaks | Partner only; Garmin-owned since 2026-07-22                                                    | —                                                                     | —                                                                                                              | —                                    | US                       |

Sources: <https://intervals.icu/api/v1/docs>,
<https://github.com/NolioApp/NolioAPI-Documentation/wiki>,
<https://www.tredict.com/skills/workouts.md>,
<https://www.tredict.com/blog/mcp_server_docs/>,
<https://github.com/TrainingPeaks/PartnersAPI/wiki>. Final Surge, Xert,
JOIN, Today's Plan (closed 2024), Runalyze and Strava offer no public
way to write a workout.

A relay needs what Kadence lacks today: a record of what was pushed
(session, service, the service's ids, when, the last error), update and
delete in the adapter, and a way to retry without a scheduler. Every
relay is a controller of its own and passes the session on to the device
makers the rider connected there; `docs/subprocessors.md` must say so.

## 4. Other destinations

- **Wahoo**: Kadence's adapter exists. Wahoo grants API access "to those
  who request it"; one platform had it within weeks.
- **Hammerhead Karoo**: a self-serve API, `POST /workouts/file` (.fit or
  .zwo); no RPE targets.
- **COROS**: an MCP server with `createScheduledWorkout`, built for AI
  assistants; whether a platform may use it is unknown.
- **Polar**: nothing can be written.
- **Indoor**: `.zwo`, `.erg` and `.mrc` already download.

## 5. What was not researched

The fourth track (Wahoo's current terms, Karoo sideloading, COROS, Zwift
on iPad and Apple TV, Apple WorkoutKit, the file formats in detail) did
not report back. Also open: whether a workout FIT opened in the Garmin
Connect phone app becomes a course; whether a FIT schedules file fills
the Edge's calendar; whether a Connect IQ background task may download a
workout; everything that needs a device in hand.

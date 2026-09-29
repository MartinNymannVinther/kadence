# Upload keys: handing rides to Kadence without signing in

A rider's upload key lets a program hand ride files to Kadence by
itself: a script on the family's computer, an app on the phone. Nothing
has to be set up on the installation, no provider's keys are needed, and
it works with the internet cut as long as the program can reach the
server (dogma 2). The decision and its trade-offs are in ADR
[0029](adr/0029-an-upload-key-per-rider.md); why it was built is in
[the research note](research/garmin-without-partner-access.md).

A key is a door, not a courier. Kadence takes the file; something else
has to bring it. What can bring it today is written in section 6, and
what has and has not been tried is kept apart there on purpose.

## 1. What a key is

- **Made by the rider**, under Settings → Devices (Indstillinger →
  Enheder), with a name that says where it is used: "Fars computer". A
  coach or a parent cannot make one. A rider has at most five.
- **Shown once.** Kadence keeps only the key's hash and cannot show the
  key again. A key that was not copied is removed and made anew.
- **Good for one thing**: handing a ride file to that rider. Nothing can
  be read with it: not the rider's rides, not their name. An answer says
  what became of the file and nothing else.
- **Removed by the rider or a coach**, and dead at once, also for a file
  that was on its way. It is removed with the rider's archiving, and it
  answers nothing while the rider is off the team.
- **Remembered on the ride.** Every ride knows which key it came with,
  also after the key is gone, so the rides a lost key added can be found:
  in the team's export, where a ride has the column `upload_key_id`, and
  in the audit trail. The app has no page that lists them.
- **Seen by the rider and the coaches** with its name, its last four
  characters, when it was last used, and whether the last file could be
  read. A parent and a teammate do not see that a key exists.

A key looks like `kad_` followed by 43 letters, digits, `-` and `_`.
Treat it like a password: give it to the one program that is to use it,
keep it in a file only you can read, never paste it into a chat or an
e-mail, and never put it in an address.

Whoever has a key and a ride file can also learn whether Kadence has
that file: the answer to a ride that is there is "already there". It
says nothing about rides the asker does not hold.

## 2. Sending a ride

One request, one ride. The key goes in the `Authorization` header; the
file is the body.

```sh
curl -H "Authorization: Bearer $KEY" \
     --data-binary @2026-09-28-17-02-11.fit \
     "https://kadence.example/api/ingest?name=2026-09-28-17-02-11.fit"
```

The file can also be the `file` field of a form, which is what most
programs that upload files send:

```sh
curl -H "Authorization: Bearer $KEY" -F "file=@2026-09-28-17-02-11.fit" \
     https://kadence.example/api/ingest
```

These examples put the key on the command line, where other programs on
the same computer can see it while curl runs. That is fine for trying a
key on a machine of your own. A helper that runs by itself hands the key
to curl on standard input, the way the script in section 3 does.

- **Formats**: FIT, TCX and GPX, bare, gzipped or in a zip, at most
  25 MB. The format is told from the bytes, not from the name.
- **The name** is what the ride is called until someone renames it. For a
  bare body it comes from `?name=` or from a `Content-Disposition`
  header; for a form, from the file's own name. A GPX that names its
  track is called what the track is called, whatever the file is named.
  Without a name the ride has no title and the pages name the sport.
- **Asking whether a key works**, without sending anything:
  `curl -H "Authorization: Bearer $KEY" https://kadence.example/api/ingest`
  answers `200 {"status":"ok"}` or `401`.

### What the answer means

| Status | Body                                                        | What a helper does                                  |
| ------ | ----------------------------------------------------------- | --------------------------------------------------- |
| 201    | `{"status":"imported"}`                                     | Done.                                               |
| 200    | `{"status":"duplicate"}`                                    | Done: Kadence has this ride.                        |
| 400    | `{"status":"refused","reason":"no_file"}` and similar       | Do not send it again as it is.                      |
| 401    | `{"status":"refused","reason":"unauthorized"}`              | Stop. The key is wrong or was removed.              |
| 408    | `{"status":"refused","reason":"too_slow"}`                  | The file did not arrive within a minute. Try again. |
| 413    | `{"status":"refused","reason":"too_large"}`                 | Do not send it again.                               |
| 422    | `{"status":"refused","reason":"unknown_format"}` and others | Do not send it again: Kadence cannot read the file. |
| 429    | `{"status":"refused","reason":"rate_limited"}` or `"busy"`  | Wait the seconds in `Retry-After`, then go on.      |
| 500    | `{"status":"refused","reason":"generic"}`                   | Try again later.                                    |

### Limits

Counted for the person, not the key: a new key starts nothing afresh.

- Sixty rides kept an hour, counted together with what the person
  uploads in the browser. A ride Kadence already has is not counted, so
  a helper that sends a folder again uses nothing up.
- 120 files read an hour, whatever they turned out to be: a ride, a file
  that was no ride, a ride Kadence has under other bytes.
- 600 requests an hour, and two files at a time.
- From one address, 600 requests in ten minutes. After twenty requests
  with a key Kadence does not know, such requests wait, ten minutes at
  the most; a key Kadence knows is served all the same.

## 3. The script

`scripts/send-rides.sh` sends the ride files in a folder that Kadence
has not answered for before. It needs a shell and curl, which a Mac and
a Linux machine have, and nothing from this repository: it can be copied
out on its own.

```sh
# Once: the key, in a file only you can read.
umask 077 && printf '%s\n' 'kad_…' > ~/.kadence-key

# Every time: the bike computer's drive, or any folder with rides.
KADENCE_URL=https://kadence.example sh scripts/send-rides.sh /Volumes/GARMIN

# Everything again, whatever was sent before.
KADENCE_URL=https://kadence.example sh scripts/send-rides.sh --all /Volumes/GARMIN
```

- Pointed at a bike computer's drive it sends only the activities folder
  (`Garmin/Activities`, `GARMIN/Activity` on a watch). The courses,
  workouts and settings beside it are `.fit` files too, and no rides.
  Hidden files and folders, a drive's wastebasket among them, are passed
  by, and so are empty files and folders that cannot be read.
- **Newest first.** The ride somebody is waiting for goes first, and when
  Kadence asks for a pause it is the old rides that wait.
- **It remembers what Kadence has answered for**, by the file's name and
  size, in `~/.kadence-key.sent` (`KADENCE_SENT_FILE` names another): the
  rides that were taken, the ones that were there already, and the files
  Kadence could not read. The next run sends only what is new. `--all`
  sends everything once more, which is the way to bring back a ride that
  was deleted in Kadence, or to try a refused file after an upgrade. The
  memory is a list of file names and holds no key.
- The key is never an argument to a program, so it is not in the list of
  running programs. `KADENCE_KEY_FILE` names another file than
  `~/.kadence-key`, and the script says so when others on the computer
  can read the file.
- It sends the key over https and nothing else; only `localhost` is
  reached without.
- It stops at a 401, waits at a 429 as long as Kadence asks (up to three
  times, and never more than a quarter of an hour), tries a file that
  did not arrive in time (408) three times more, and ends with
  `4 sent, 0 already there, 0 refused, 140 sent before and left alone.`
- A first run on a drive with more than sixty rides is told to pause
  when the hour's sixty are kept. Run it again an hour later: it goes on
  where it stopped.

## 4. In the browser instead

Two ways need no key, because the rider is signed in.

**"Hent fra enheden"**, beside the upload. Plug the bike computer in with
a cable, press the button and pick the device as a folder. Kadence reads
the activities folder, works out in the browser which rides it does not
have, and fetches those, newest first, at most sixty at a time.

| Where                        | Reads a folder | Notes                                                                          |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------ |
| Chrome or Edge on a computer | Yes            | The picker opens where it was last, so the second time is one press and a yes. |
| Safari on a Mac, Firefox     | Yes            | Through the file dialog, which hands over every file in the folder.            |
| Chrome on Android (from 132) | Yes            | The phone has to show the device as a drive.                                   |
| Safari on iPhone (from 18.4) | Yes            | The same.                                                                      |
| Anything older               | No             | The button is not shown. Picking files by hand works.                          |

The button is shown wherever the browser can hand over a folder. That
the button is there does not mean the device shows up as one.

Which rides Kadence has is worked out in the browser, and that takes a
page served over https. Where it cannot be done, the newest rides are
sent as they are, the page says so, and Kadence passes over the ones it
has when they arrive.

Whether a phone shows the device as a drive is the device's doing, not
Kadence's. The older Garmin Edges (130, 530, 830, 1030) are plain
storage. The newer ones (540, 840, 1040, 1050) speak MTP, which a Windows
computer reads and a phone does not read reliably.

**Sharing from the phone.** With Kadence installed on an Android phone
(Chrome → "Add to Home screen"), Kadence is in the share sheet: share a
ride file from a file manager or another app, and it lands on the ride
in Kadence. Only a rider's own rides; a coach uploads on the rider's
page. Safari has no share targets, so an iPhone does not offer this.

## 5. For whoever writes a helper

- One ride a request. Treat 200 and 201 alike: the ride is there.
- Stop at 401 and tell the person. Do not try again with the same key.
- At 429, wait as long as `Retry-After` says. Never loop.
- At 408 and 500, try again a little later, a few times and no more.
- A 400, 413 or 422 is about that file. Go on with the next, and do not
  send the file again as it is.
- Send the newest ride first, and remember what has been answered for.
- Keep the key where the system keeps secrets. Never log it, never put
  it in an address, never send it anywhere but to the `Authorization`
  header of the installation it was made on.
- Send the original file, as the device wrote it. Kadence recognises a
  ride it has by the file's hash first and by the ride's start second.
- Kadence is free software under AGPL-3.0, and so is this door: the
  code is `src/modules/devices/ingest.ts`.

## 6. What brings the file, and what has been tried

Kadence runs one real winter before anything is put in the window
(dogma 7). Until then this list says plainly what has been run and what
has only been read about.

**Tried against a running Kadence (2026-09-29):**

- `curl`, with a bare body and with a form.
- `scripts/send-rides.sh` on a Mac, with a folder laid out like a Garmin
  Edge's drive. On Linux (with GNU's tools and with BusyBox's) it was run
  against a stand-in that answers like Kadence, not against Kadence.
- "Hent fra enheden" in Chrome (both ways of reading a folder) with such
  a folder on the computer's own disk, and that the button is offered in
  WebKit, which is Safari's engine.
- The share target's route, with a signed-in rider, a coach and nobody,
  and with what a browser is expected to say about where a share comes
  from (`Sec-Fetch-Site: none`).

**Not tried with a device in hand:**

- A Garmin Edge on a cable to an Android phone or an iPhone.
- Sharing a file to the installed app on an Android phone.
- A Windows computer. The script is a shell script; Windows needs its
  own, and none is written.

**Read about, not run** (docs/research/garmin-without-partner-access.md):

- Nothing sold today sends a ride to an address of the rider's choosing
  with a key in a header: no bike computer, and no app that was found.
- Gadgetbridge (Android, open source) fetches the original file from a
  Garmin over Bluetooth and can export it to a folder. Its upload to
  servers is for two named services so far; a general one is being
  worked on. It takes the place of the Garmin Connect app.
- A Hammerhead Karoo is an Android device and can run a sideloaded app
  that reads its ride files. No such app for Kadence is written.

## 7. For the operator

Nothing to switch on. The address riders are shown is built from
`BETTER_AUTH_URL`. Behind a proxy, `TRUSTED_PROXY_HOPS` decides which
address the limits count by (src/core/rate-limit.ts); set wrongly, every
helper shares one bucket. A proxy that caps request bodies must allow
25 MB and a little on `/api/ingest`, which takes one file, and 75 MB and
a little on `/api/share` and `/api/activities/upload`, which take three
in one form.

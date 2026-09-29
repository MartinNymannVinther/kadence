# ADR 0029: An upload key per rider

Status: accepted · Date: 2026-09-29 · Builds on 0018, 0022 · Amends 0019 (how the hour's files are counted)

## Context

Most riders record on a Garmin Edge, and Garmin has taken no new
partners since 25 March 2026: the Garmin adapter (ADR 0018) is complete
and dormant. The routes around that were researched one by one
(docs/research/garmin-without-partner-access.md). The ones that log in
to Garmin as the rider were turned down: they need the rider's password,
break Garmin's terms, and end in a token over the rider's whole account.
Every route that was left — a script on the family's computer, an app on
the phone, a cable and a browser, a share from the phone — needs one
thing Kadence did not have. A ride entered through a signed-in upload or
a provider's notification, and nothing else: no file could arrive with
nobody signed in.

## Decision

- **A key the rider makes** (`upload_keys`, drizzle/0014), under
  Settings → Devices, with a name that says where it is used. It is 32
  random bytes behind `kad_`, shown once and stored only as its sha256,
  the way an invitation key is; the last four characters are kept to tell
  two keys apart. A rider has at most five.
- **A key hands over ride files, and does nothing else.**
  `POST /api/ingest` with `Authorization: Bearer kad_…` and the file as
  the body, or as the `file` field of a form; `GET` answers whether the
  key works. Nothing can be read with a key, and nothing about the rider
  is in any answer: an answer is a status and, for a refusal, the
  reason. It names neither the ride the file became nor the session it
  landed on.
- **The ride comes in as the rider** (ADR 0018). One definer,
  `upload_key_owner(hash)`, answers whose key a hash is — the key's id,
  the team, the rider, the rider's account — and nothing for a rider
  without an account, one who is archived, or one who has left the team.
  Everything after it runs as the rider, through the ordinary import and
  the ordinary policies: the same decoders, the same recognition of a
  ride that is there, the same match to the planned session.
- **The same security as a device link.** The rider makes and removes
  their own keys; a coach sees that a key exists, when it was last used
  and whether the last file could be read, and can remove it; a parent
  and a teammate see none. A trigger keeps a key what it was made as: the
  hash, the hint, the rider, the team and who made it never change. Every
  change is audited, and the trail never holds the hash.
- **The application cannot read a hash.** The application role is
  granted every column of the table but `key_hash`: it writes the hash
  when a key is made and never sees it again, so a query gone wrong has
  no hash to give away.
- **A key belongs to the person who made it, while they are the rider.**
  `upload_key_owner` answers only while the account that made the key
  holds the rider row. A rider who is archived, or whose row passes to
  another account, loses their keys there and then (a trigger on the
  rider row), so a key never wakes with a rider who comes back and never
  works for the next person.
- **A ride remembers the key it came with** (`activities.upload_key_id`),
  also after the key is gone: the day a key has gone astray, the rides it
  added can be told from the rider's own, in the team's export and in
  the audit trail.
- **One request, one ride, and the status says what became of it**: 201
  imported, 200 already there, 400 no file, 401 no key Kadence knows, 408
  the file did not arrive within a minute, 413 too large, 422 not a ride
  Kadence can read, 429 wait, 500 try again. A helper can act on the
  number alone.
- **The key is looked at before the body is read**, so a stranger cannot
  make Kadence hold a file, and looked at again in the transaction that
  keeps the ride, so a key removed while a file was on its way brings
  nothing in. The key is taken from the header and nowhere else, never
  from the address, where a proxy would log it.
- **Limits, counted for the person and not the key**, so that removing a
  key and making a new one starts nothing afresh: 600 requests an hour;
  120 files read an hour, whatever they turned out to be, because reading
  is the work; sixty files kept an hour, through whichever door; two
  files at once; ten keys made an hour. From one address, 600 requests in
  ten minutes, and twenty with a key Kadence does not know before that
  address is told to wait. A key Kadence knows is served from an address
  that has guessed: a club house shares one.
- **The hour's files are counted when they are kept** (amends ADR 0019).
  The upload counted a file when it arrived, so the same ride sent twice
  used the hour up. Now a ride Kadence has is recognised by its hash
  before it is decoded, answered, and not counted; a helper that sends a
  folder again uses nothing up.
- **Two ways in for a person, on the same import.** "Hent fra enheden"
  beside the upload reads a plugged-in bike computer as a folder: only
  the activities folder where there is one, each file hashed in the
  browser, the server asked which it has (`/api/activities/known`), the
  new ones sent, newest first. And the installed app is a share target:
  the phone's share sheet posts a ride file to `/api/share`, which
  imports it for the rider who is signed in and lands on the ride.
- **The routes that stand on the session refuse another site's pages**
  (`src/core/same-site.ts`): the share target, the question and the
  upload. The cookie is SameSite=Lax, but every tool in the family is the
  same site to a cookie; `Sec-Fetch-Site` tells a sibling's page from
  Kadence's own, and a page cannot forge it.
- **What Kadence does not do.** It asks for no Garmin password and holds
  no Garmin token, and it ships and describes nothing that logs in to
  Garmin as the rider. A key is for files.

## Trade-offs accepted

- **A key does not run out.** A helper that stops in March without a
  word is worse than a key that lives until it is removed. What a stolen
  key can do is add rides to one rider; it is removed by the rider or a
  coach, its last use shows on the page, and it is gone the moment the
  rider is archived.
- **A key sleeps while its rider is off the team, and wakes if the same
  person returns.** Leaving the team is a membership that ends, in
  tables that are Better Auth's; the key answers nothing meanwhile. The
  person who comes back is the person who made it.
- **What a share looks like to the server is not yet seen.** A share
  from the phone is expected to arrive as `Sec-Fetch-Site: none`, the
  person and not a page. If a browser says otherwise, the share is
  refused, and the phone that shows it is the one to learn from.
- **The key is a door, not a courier.** Nothing sold today sends a ride
  to an address of the rider's choosing with a key in a header: no bike
  computer, and no app on a phone that was found. What uses the key on
  the day this is written is a script (`scripts/send-rides.sh`). The
  automatic path for a rider with an Edge and a phone is still a relay
  adapter, which is its own decision.
- **"Already there" is an answer too.** Whoever holds a key and a ride
  file learns whether Kadence has that file. A helper needs the answer
  to stop sending, and it says nothing about a ride the asker does not
  hold.
- **The rides a lost key added have no page.** They are found in the
  export and the audit trail, by a coach who goes looking. A page is
  built the day a key is lost, not before.
- **Senders that cannot set a header are not served.** A webhook that
  signs with a shared secret, or wants the key in the address, would
  need another way in. None is built before a rider needs one.
- **The rider is the actor.** The trail names the rider for what their
  helper sent, as it does for what their device sent (ADR 0018).
- **"Last used" is a minute wide.** A use is noted when the outcome
  changed or a minute has passed, so a folder sent in one go is one row
  in the trail, and the page may be a minute behind.
- **A phone and a cable are not yet proven.** The folder is read where
  the browser can hand one over: Chrome, Safari and Firefox on a
  computer, Chrome on Android, Safari on iPhone from 18.4. Whether a phone shows a given Edge as a
  drive is the device's doing: the older ones are plain storage, the
  newer ones (540, 840, 1040, 1050) speak MTP, which phones do not read
  reliably. Sharing to the installed app is Chrome's on Android; Safari
  has no share targets. Neither has been tried with a device in hand;
  both wait for the winter (TECH-DEBT.md).
- **A file without a name has no title.** The page names the sport in
  the reader's language instead of a word Kadence made up.
- **The browser works out what is new only over https.** Hashing a file
  in the browser needs a secure page. Without one the newest rides are
  sent as they are and the server passes over the ones it has; the page
  says which of the two happened.
- **The limits count in memory**, per process, like every limit on a
  public route (TECH-DEBT.md, "Rate limiting is per process").

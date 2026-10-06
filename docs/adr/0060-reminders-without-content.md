# ADR 0060: Reminders without content

Status: accepted · Date: 2026-10-06

## Context

The first winter is measured by three numbers (docs/plan-fokus-vinter.md),
and two of them — riders who check in at least four days a week, and
sessions with a receipt — depend on a rider remembering. Kadence said
nothing unless it was opened. The plan asks for four reminders: the
check-in in the evening, a new comment, a changed plan, and the parents'
week on Sunday.

Kadence sends no mail, and the hosted installation has no mail provider
(docs/deploy.md, docs/subprocessors.md). Every way of reaching a phone from
a web app goes through somebody: a mail provider, an SMS gateway, or the
push service of the person's own browser — Apple's for Safari, Google's
for Chrome and most of Android, Mozilla's for Firefox, Microsoft's for
Edge on Windows. None of the browsers' services is in the EU's hands, and
the browser, not Kadence, decides which one is used.

## Decision

- **Web push, not e-mail.** A reminder is worth something at 19.00 on the
  phone in the rider's pocket, not in an inbox a fifteen-year-old does not
  read. Mail would also need a mail provider on the subprocessor list and
  an address for every rider; a push needs neither, and works the same on
  a self-hosted installation.
- **The push carries nothing.** It has no payload at all. It only wakes
  the service worker (`public/sw.js`), which asks `GET /api/push/latest`
  with the person's own cookies and shows what Kadence answers. So the
  push service sees an opaque address, a time, the installation's public
  key and a token naming the installation's contact — and not a title,
  a name, a team or a word of what the reminder is about. That keeps
  dogma four: what crosses to a US service is that a reminder went out,
  never what it said. The text is computed as the signed-in person under
  the ordinary policies (`src/modules/push/latest.ts`), in their
  language, from messages/\*.json; somebody else signed in on the same
  browser gets their own answer, never the owner's.
- **No new dependency.** Without a payload there is nothing to encrypt
  (RFC 8291), so only VAPID (RFC 8292) is needed: an ES256 token signed
  with node:crypto (`src/modules/push/vapid.ts`) and one `fetch` per push
  with `TTL` (six hours), `Urgency: normal` and `Topic`, so a phone that
  was off wakes to one reminder, not a pile. `scripts/push-keys.ts`
  prints the key pair; `PUSH_PUBLIC_KEY` and `PUSH_PRIVATE_KEY` turn the
  feature on, and without them nothing about reminders is shown or runs.
- **What, and when** (Copenhagen time, `src/modules/push/due.ts`):
  - check-in: a rider who has not checked in today, once a day from 19.00;
  - comment: a comment by someone else in a thread the person can read —
    a coach hears from riders and parents, not from the other coaches;
  - plan: a session in the rider's next seven days laid or changed by
    someone else;
  - week: a parent, on Sunday from 18.00, "Emmas uge er klar".

  **Quiet hours** from 21.30 to 7.00: nothing is sent, and what is due
  waits for the morning (the check-in and the week do not; their evening
  is over).
  **One push per person per run**: when several are due, news first, then
  the check-in, then the week, and the rest on the next run. A person
  chooses per browser in Settings → Mig, among the reminders their roles
  on the team offer.

- **The job** runs in the app's own process every ten minutes, started
  from the instrumentation hook, and on `POST /api/push/tick` for an
  installation that would rather drive it from outside (throttled, safe
  to call, 404 without the keys). It starts with nobody signed in, so
  the one thing it reads across people is `push_subscriptions_due()`:
  which subscriptions exist and whose, for members of the team. Everything
  else is read as the owner. The reminder is written down before it is
  sent, with a check that nobody wrote it first, so two runs at once send
  it once. A push service that answers 404 or 410 has the address
  deleted; one that is busy (429, 5xx, no answer) has the mark taken back
  for the next run.
- **Where a push may go.** The address comes from the browser, so a
  signed-in person could otherwise aim the server at any https host. It
  is taken, and posted to, only at the browsers' push services
  (`src/modules/push/endpoint.ts`), and it never appears in a log or in
  the audit trail.
- **The service worker** handles `push` and `notificationclick`, takes
  over at once when it is updated, and does nothing else: no fetch
  handler, no cache, no offline pages. When Kadence
  cannot be asked or has nothing to say, it shows "Der er nyt i Kadence",
  because Safari withdraws the permission from a site whose pushes show
  nothing. That fallback is the one text outside messages/\*.json, and a
  test holds it to the catalogue.
- **Data and rights.** A subscription is its owner's alone (drizzle/0028):
  no coach reads or changes it. It goes with the account and with the
  team by cascade, and leaving a team deletes it. It is **not in the
  export**: it is a technical address for one browser, a capability that
  could wake that browser, and says nothing about training — the same
  reason sealed device tokens and upload-key hashes stay out. That
  reminders were turned on and off is in the audit trail, without the
  address. The push services are listed in docs/subprocessors.md.

## Trade-offs accepted

- **On an iPhone only from the home screen.** Safari on iOS gives web
  push only to a web app installed to the home screen, from iOS 16.4.
  Settings → Mig says so in one sentence; Android and computers work in
  the browser.
- **A fetch on wake.** The notification needs the network and a live
  session at the moment the push arrives. Without either — an expired
  session, a dead zone — the person sees the plain "Der er nyt i
  Kadence", and the reminder still does its work: Kadence gets opened.
- **The push services still learn something.** Not the content, but the
  metadata: that this browser got a push from this installation, when,
  and how often. For a rider that is a rhythm of evenings. It is the
  price of reaching a phone at all without a native app; it is opt-in,
  per person and per browser, and nothing reaches a push service for
  anyone who has not turned reminders on.
- **"Someone else" is "laid by someone else".** Kadence records who laid a
  session, not who changed it last, and a rider cannot read the audit
  trail. So a rider who moves a session the coach laid hears once that the
  plan changed, a session the coach removes is not told, and matching a
  ride to a session is not a change. No column was added for it.
- **The text follows the newest reminder.** `latest` reads back which
  reminder went out last from the marks the job wrote, on the person's
  most recently told browser. A push that arrives late, after the person
  changed their choices on another browser, may show the plain words.
- **One process.** The timer is in-process, which fits Kadence's one
  server. Several app instances would each run it; the marks keep that
  from sending twice, and `POST /api/push/tick` lets an installation use
  its own scheduler instead.
- **A member removed by a coach** keeps a dormant row until their account
  or the team is deleted: only the owner may delete it, and they are no
  longer on the team. The job never reads it, because
  `push_subscriptions_due()` returns only members.

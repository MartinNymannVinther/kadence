# ADR 0060: Reminders without content

Status: accepted · Date: 2026-10-06 · Amended 2026-10-06: a coach's
wellbeing reminder (P1-02) and a test push (P1-05) · Amended 2026-10-07:
a check-in that turns red later (P2-17), plan changes that know their
sender (P2-12) and reminders that leave the audit trail alone (P2-13)

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
  - plan: a session in the rider's next seven days laid, changed or
    deleted by someone else (see the amendment below);
  - week: a parent, on Sunday from 18.00, "Emmas uge er klar";
  - wellbeing: a coach, when a rider checks in in the red zone (see the
    amendment below).

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
- **"Someone else" was "laid by someone else"** until 2026-10-07: Kadence
  recorded who laid a session, not who changed it last, so a rider who
  moved a session the coach laid heard that the plan changed, and a
  session the coach removed was not told. Both are closed by the
  amendment on plan changes below (P2-12). Matching a ride to a session is
  still not a change.
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

## Amendment: a rider in the red zone (P1-02)

A coach who has chosen **Trivsel** gets one push the same day a rider on
the team saves a check-in in the red zone, so a conversation can happen
while it matters.

- **Which check-ins.** The check-in's own zone
  (`src/modules/load/wellbeing.ts`): pain 3, ill, or mood at the bottom
  of the scale. The status's escalation after three yellow weeks is not a
  trigger: it is a pattern, not something that happened today, and it
  stays on the attention list.
- **As the coach.** The job reads today's check-ins inside the coach's own
  `withOrgContext` (`src/modules/push/wellbeing.ts`), so the policies
  decide: the team's riders, still on the team, never the coach's own,
  and nothing from another team. Only a coach is offered the kind, and
  the job decides it only for a coach, whatever a row says; a rider or a
  parent never gets it.
- **Once each time a check-in turns red.** A check-in is one row per
  rider per day, changed in place when the rider saves again. It carries
  `red_since` (drizzle/0036, amended 2026-10-07, P2-17): the check-in
  service sets it when the check-in turns red, keeps it while it stays
  red, and clears it when it is put right, by the one rule the reminder
  goes by as well (`isRedCheckin` in src/modules/load/wellbeing.ts). The
  reminder counts from `red_since`, and its mark moves `told_up_to` to the
  newest told check-in's `red_since`, not to now. So saving a red
  check-in again is not news, one saved green and changed to red later in
  the day is, and a comment written after the check-in is still told on
  the next run. A check-in put right and then red again the same day is
  told again; it said something new.
- **Quiet hours do not apply.** They keep evenings and nights free of what
  can wait. A rider who is ill, in pain during and after training, or at
  the bottom of the mood scale has said something that should not wait
  for the morning, and the coach chose to hear it. It goes before news,
  the check-in and the week, and it is still a reminder (`Urgency:
normal`), not an alarm; the coach decides what to do. The job therefore
  runs through the night too, sending nothing else.
- **No name in the text.** "En rytter har brug for en snak", with a link
  to `/calendar#opmaerksomhed`. A lock screen is read by whoever holds the
  phone, and a rider's check-in is health data about a young person (ADR
  0011). Who it is, and what they answered, stays behind the coach's
  login, on the attention list, under the same policies. The service
  worker keeps the anchor when it opens the page.
- **What the text says** is read back from the mark: `told_up_to` equal,
  to the millisecond, to the `red_since` of a red check-in the coach can
  see.

### Trade-offs accepted

- **A check-in that turns red later in the day** was told only if no
  other reminder went to that coach since it was first saved, because
  without a column a change from green to red could not be told from a
  red check-in saved twice. The gap is closed (2026-10-07, P2-17):
  `checkins.red_since` says when it last turned red, and the reminder
  counts from it. The column rides with the check-in, under its policies,
  its audit trigger and its place in the export; the check-ins already
  red when it came got their first save as the moment, so none was told
  twice. A check-in written past the service, which nothing in Kadence
  does, has no `red_since` and is not told.
- **News waiting in the quiet hours** from before the red check-in is
  folded into its reminder, as news always is.
- **A coach who also rides or is a parent on the team** and gets a
  wellbeing reminder and then a check-in or week reminder within a
  quarter of an hour of the red check-in may see the wellbeing words on
  both.
- **A coach who saves a check-in for a rider** after a conversation is
  told of it too: a check-in does not record who saved it.

## Amendment: a test push (P1-05)

"Send en prøve" under Settings → Mig → Påmindelser lets a person see on
the phone itself that reminders arrive, before the first real one is
due.

- **What it sends.** A server action, as the person (`runAction`, zod,
  `src/modules/push/test-push.ts`), sends one empty push to each of the
  person's own browsers on the team. It reads the rows inside the
  person's own context, so the policy leaves nobody else's in reach. Three
  an hour per person, counted in the in-process limiter like other
  per-person limits. A browser the push service no longer knows is
  forgotten, as the run does.
- **What it says.** The push is as empty as any other, so the service
  worker asks `latest`, which answers "Sådan ser en påmindelse fra Kadence
  ud" until a real reminder goes out after the test. The server keeps the
  moment of the test in memory, for the six hours a push can wait, and
  writes nothing: a test is not a reminder, and a mark in `push_runs`
  would move the run's marks for nothing.
- **The status line** under the card is worked out in the browser: the
  notification permission, whether `/sw.js` is registered, whether the
  browser holds a subscription, and on an iPhone or iPad whether Kadence
  was opened from the home screen. The one thing from the server is when
  the person's own subscription on this team was made. Nothing about
  anyone else, and nothing is sent anywhere.

### Trade-offs accepted

- **Memory, not a mark.** After a restart, or with several app processes,
  a test still arrives but shows the plain "Der er nyt i Kadence".
- **The test goes to every browser** the person has on the team, not only
  the one they pressed it on, so a person with reminders on a phone and a
  computer sees it on both.

## Amendment: plan changes know their sender (P2-12)

A rider's "Planen er ændret" is about a session in the next seven days
that somebody else laid, changed or deleted, so a rider is not told of
their own change and is told when the coach takes a session away.

- **Who last changed a session** is `planned_sessions.updated_by`
  (drizzle/0037). The database stamps it, from the caller in the
  transaction's context, whenever the app writes the row: a trigger before
  insert, and before every update that moves `updated_at`, which drizzle
  does on every update the app makes. So every path is covered — create,
  edit, move, copy, a group, a series, copy week, a block, a programme,
  done and undone, a ride matched on import — and no caller can name
  somebody else. An update that does not move `updated_at` is the database
  itself (a template or a ride removed, an account deleted) and leaves it
  as it was; an account's deletion still sets it to null. There is no
  backfill: a session last written before has none, and who laid it
  stands in, which is what the reminder went by until then.
- **The rule** (`newestPlanChange`, src/modules/push/facts.ts): a session
  in the rider's next seven days, not yet ridden, last written by
  somebody other than the rider, since the last reminder. A coach who
  rides on the team is a rider here like any other.
- **A deleted session** leaves no row, so the session service writes one
  down as it deletes (`planned_session_deletions`, src/modules/training/
  deletions.ts): the rider, the day, the title, who deleted it and when.
  Only what a reminder could tell: a session not yet ridden, from today
  through the seventh day (the week, and the day it reaches by the
  morning after the quiet hours), deleted by somebody other than the
  rider, on an installation with reminders. The table is the rider's
  training: forced RLS through `app_can_read_rider(rider_id, 'training')`
  to read and `app_can_write_rider` to write, only in the writer's own
  name; nobody changes or removes a row; every row is audited; it goes
  with the rider (erase_rider) and the workspace by cascade. The reminder
  reads it as the rider, like the sessions.
- **Seven days.** Each reminder run calls
  `planned_session_deletions_sweep()`, which removes the rows past seven
  days across workspaces and returns only a count; it is the one thing the
  run does with nobody signed in besides `push_subscriptions_due()`.

### Trade-offs accepted

- **A session moved out of the week** by the coach is a change to a
  session that is no longer in the week the reminder reads, so it is not
  told; only a deletion is written down. The calendar shows it where it
  went.
- **A deleted session's title** is kept for seven days beyond the session.
  It is not in the export's sheets, being short-lived; the deletion and
  this record of it are in the audit trail, which is.
- **An installation that turns reminders off** keeps the rows it had until
  reminders are on again and a run sweeps them; it writes no new ones.
- **The sweep writes the audit trail.** A row's insert and its removal
  are each an audit row, the removal as the system. Deletions in the next
  days are few.

## Amendment: reminders do not fill the audit trail (P2-13)

Every reminder moved `told_up_to`, `checkin_reminded_on` or
`week_told_on` on `push_subscriptions`, and the table's audit trigger
wrote a row for each: a coach reading the trail for changes to the
training found a row per rider per evening.

- **The run's marks have a table of their own,** `push_runs`
  (drizzle/0038): one row per subscription with the three marks and
  `told_at`, the moment the last reminder went out, which `lastTold` and
  `latest` read where they read the subscription's `updated_at` before.
  The run makes a subscription's row the first time it reads it, starting
  at the subscription's own making, and it goes with the subscription by
  cascade. Its policy is the subscription's: its owner's alone, in that
  team, and only for a subscription that is theirs; no delete.
- **`push_runs` has no audit trigger**, the one exception this amendment
  makes. Its rows are technical timestamps the job writes: no personal
  data beyond whose subscription it is, which the audited subscription
  already says, and nothing a person changes. Auditing them recorded the
  job, not anybody's change, and buried the changes the trail is for. The
  exception is named, with this reason, in the migration and in the list
  of tables without an audit trigger in tests/rls/tenant-isolation.test.ts,
  beside the auth machinery and the other markers.
- **Turning reminders on, choosing which, and turning them off** stay on
  `push_subscriptions`, audited as before, without the address.
  tests/push/isolation.test.ts proves both: a run that sends a reminder
  writes no audit row, and a subscription made, changed and removed
  writes one each.

Option (a), an audit trigger that skips an update touching only the
three marks, was not chosen: it would make the audit trigger on one table
decide what is worth recording, where every other table records every
change; a table that is not audited, named and argued for, is easier to
see and to check.

### Trade-offs accepted

- **When a reminder went out is not in the audit trail.** It never said
  more than that a push went out; the push services' own metadata is the
  same fact (see above), and the person's own phone shows it.
- **Not in the export,** like the subscription: when a reminder went out
  is about a browser, not about training.

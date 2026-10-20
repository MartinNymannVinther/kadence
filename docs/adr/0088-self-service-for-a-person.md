# ADR 0088: Door 2 — a person creates their own workspace, with a confirmed address and consent to health data

Status: accepted · Date: 2026-10-11 · Amended 2026-10-12 (in at once, locked after a week, swept after thirty days) · Builds on 0004 (admission), 0011 (riders separated), 0080 (a person alone), 0083 (counters and nonces), 0085 (jobs), 0086 (mail) · docs/plan-alene-og-som-tjeneste.md §2.5 and §6, backlog S-08

## Context

ADR 0080 let one person use Kadence without a team, but only through the
owner: an application, the owner's yes, a link. The plan's door 2 (§2.5)
lets a person in by themselves once Kadence sends mail (ADR 0086), while
clubs still apply. Martin approved the plan on 11 October 2026.

A person alone is not a club's rider. For a club the club is the data
controller and has its own basis for health data; for a person alone Haij
is the controller, and the basis for check-ins, pain, illness and heart
rate (GDPR art. 9) is the person's explicit consent (art. 9(2)(a)), which
must be as easy to withdraw as to give (art. 7(3)). The legal drafts
(`docs/jura/` on the `docs/jura` branch, A-08) ask for that consent at
sign-up, for its withdrawal under Indstillinger → Data, for the age of 15
(databeskyttelsesloven § 6, stk. 2 and 3) and for a confirmed address
before door 2 opens.

## Decision

- **`SIGNUP=individuals`**, a third value beside `closed` and `open`
  (`src/core/env.ts`). A person may create a personal workspace — for
  themselves from 15, or for their child — without an application. Clubs
  apply and are admitted by the owner as before; the first account on an
  empty installation, the owner's invitations, a team's invitations and
  the demo are unchanged. It needs mail: the app refuses to start with
  `SIGNUP=individuals` and not all five SMTP variables, and says why.
  `SIGNUP=open` stays the demo's setting.
- **The gate stays the gate** (ADR 0004). Better Auth's sign-up endpoint
  admits a door-2 attempt only when it carries door 2's key and the
  attempt is personal. The key is an HMAC-SHA256 under
  `BETTER_AUTH_SECRET`, like the demo's (ADR 0083), over the kind of
  workspace, the address and the UTC day (today's and yesterday's
  accepted), set as a header by `registerSelf`
  (`src/core/auth/register-self.ts`) and by nothing else. A browser
  calling the endpoint gets 403 with or without a header of its own; a
  key seen once opens nothing for another address or for a club. Every
  registration path drops the caller's own copies of Kadence's headers
  before setting its own (`withoutOurHeaders`).
- **The account is marked at creation.** `users.self_signup` (drizzle/0050)
  is declared to Better Auth with `input: false` and a default, so a
  request body cannot set it, and is set by the user-create hook from the
  same key. It is what the rest of this ADR keys on: an account from a
  team's link, an approved application or before door 2 is never asked to
  confirm first and never swept.
- **`/register` under individuals** shows the person's own form: name,
  address, password, S-01's "Det er til mig" / "Det er til mit barn" with
  the birth year (and the child's name and, optionally, address), and two
  boxes that must both be ticked, with the link "En klub eller et hold?
  Ansøg her" to the application (`?apply=1`). Under 15 for oneself the
  form says so as S-01 does, and the server asks the same rule again
  (`src/core/access/age.ts`). The workspace is named after the rider's
  first name as an approved application is. Honeypot as ADR 0004; five
  accounts an hour per network address, counted in the database
  (`self-signup:<address>`, ADR 0083).
- **The two boxes.** "Jeg har læst vilkårene og privatlivspolitikken"
  (linking to `/terms`), and the explicit consent to health data: what is
  stored (check-ins with sleep, pain and illness, measurements and the
  heart rate from rides), that it can be withdrawn under Indstillinger →
  Data, and that withdrawing switches check-in and measurements off while
  the calendar, the rides, the season plan and Rulle keep working. For a
  child the parent consents on the child's behalf and the words say so.
  The texts follow the legal draft's paragraph "Samtykke til
  helbredsoplysninger, når du er alene"; the draft has no wording for the
  boxes themselves.
- **Consent is a row with its version.** The table `consents` holds
  `org_id`, `user_id`, `rider_id`, `kind` ('terms' or 'health'),
  `given_at`, `withdrawn_at`, `version` and `locale`, with forced RLS and
  one policy: the person's own rows in the active workspace, read and
  written by them alone, coaches included (in a personal workspace the
  person is its only coach). No DELETE grant; a
  trigger lets an UPDATE write `withdrawn_at` once and nothing else, so a
  consent is evidence of what was agreed to and when. Giving it again is
  a new row. An audit trigger puts both in the workspace's trail. The
  version is `CONSENT_VERSION = "2026-10"` in
  `src/modules/consent/service.ts`, raised whenever the words change. A
  consent stays with its workspace when the rider's history moves (ADR
  0081). The export has a "Samtykker" tab, which shows each person their
  own rows.
- **Confirm first.** The account is created and signed in, and a "Bekræft
  din adresse" mail (ADR 0086) is sent with a link that lands on
  `/today`. Until the address is confirmed the person sees one page,
  `/verify`: the mail is on its way, it can be sent again three times an
  hour, they can sign out, and an unconfirmed account goes after seven
  days. The app's layout and Rulle's send them there, and
  `getOrgContext()` answers no team, so no service, action or route acts
  for them either (`src/core/auth/verify-first.ts`). The session's cookie
  cache may say "unconfirmed" for five minutes after the link was opened,
  so an unconfirmed door-2 session asks the database; nobody else pays a
  query.
- **Withdrawal switches wellbeing off.** Under Indstillinger → Data the
  owner of a personal workspace with a consent sees when it was given and
  "Træk samtykket til helbredsoplysninger tilbage", behind one question.
  From then on `saveCheckin` and `addMeasurement` refuse
  (`forbidden:consentWithdrawn`) for everyone in the workspace — a child
  riding in a parent's workspace too, answered by the definer
  `app_health_consent_withdrawn()` as one boolean without reading the
  parent's row. Today's check-in card says plainly that check-in is off
  because the consent was withdrawn, and the one who holds the consent
  gets "Giv samtykke igen" with the same words. A club has no consent
  rows and is never switched off: its riders rest on the club's basis.
- **Nothing stored is deleted by a withdrawal.** The page says the
  check-ins and measurements already stored stay, can be taken out with
  the export and deleted with "Slet min konto og alt om mig". Whether
  art. 17(1)(b) requires deleting them when consent was the basis is the
  legal draft's open question for the adviser (its note (1) under
  "Samtykke til helbredsoplysninger"), as is whether a ride's heart rate
  must go too (its note (2)); both are the adviser's to decide, and the
  code is written so that either answer is a small change.
- **Unconfirmed accounts are swept.** A daily job, `signup.sweep`
  (`src/modules/signup/job.ts`, ADR 0085), deletes door-2 accounts
  unconfirmed for seven days through `delete_unverified_signup()` on the
  auth role (drizzle/0050): the workspace, then the account, in the order
  "Slet min konto" takes them, in one transaction in the database as
  `delete_expired_demo()` does, and every audit row about either — the
  logins with their addresses, the account's row with its name and
  address — leaving one line, `signup.expired`, with the account's id and
  nothing else. It refuses, by doing nothing, an account not made through
  door 2, a confirmed one, the installation's owner, one younger than
  seven days by the database's clock whatever the code's clock says, and
  one that is anything but the only member of its own personal workspace.
  "Slet min konto" itself still runs through `delete_workspace()` as the
  person; the sweep could not, because that path leaves the account's
  name and address in the trail (S-13's subject), and an account nobody
  confirmed should leave nothing but that it went.
- **The demo** "Prøv alene" carries the two consents, so a visitor finds
  them under Data and can withdraw and give again (ADR 0054).

## Trade-offs accepted

- **An unconfirmed account exists for up to seven days.** It holds a name,
  an address, a password hash, a birth year and an empty workspace, can do
  nothing but ask for the mail again, and is deleted by the sweep. Seven
  days is the plan's number: long enough for a parent who registers on a
  Sunday and reads mail on Friday.
- **A parent's consent for a child is self-declared.** Kadence cannot know
  that the person who ticks "Det er til mit barn" is the child's parent.
  GDPR art. 8(2) asks for "reasonable efforts"; a confirmed address of
  the parent's own and the parent owning the workspace are the efforts
  here. Whether that is enough is in the DPIA (R14) for the adviser.
- **No CAPTCHA.** A CAPTCHA is a third party in front of every sign-up
  (dogma four) or a puzzle that fails people with disabilities. The
  counters (five an hour per address, plus Better Auth's own limiter), the
  honeypot, the confirmation mail and the sweep are the defence; a flood
  of fake accounts costs the flooder mail they cannot open and costs
  Kadence seven days of empty rows.
- **The form tells whether an address has an account.** "Der findes
  allerede en konto med denne e-mail" is the existing registration's
  answer and stays: answering as if it worked would need a fifth mail
  ("someone tried to sign up with your address"), which ADR 0086 kept
  out. The answer is behind the per-address count.
- **A failure after the account exists** (the workspace not made) leaves
  an account that cannot get past `/verify` with a workspace; the person
  is told to try again, and the sweep removes it after seven days. Rare
  enough not to build a compensating delete for.
- **The terms and the privacy policy are still one page.** The legal
  draft splits `/terms` into Vilkår and Privatlivspolitik before door 2
  opens; that split is the adviser's text to approve and is not built
  here. The box links to the present page, and the consent's version is
  what to raise when the words change.
- **The consent is checked in the services, not in the policies.** The
  check-in and measurement policies (ADR 0011) are unchanged; the services
  refuse before they write. A policy would hold against a bug in a
  service too, at the price of rewriting two policies the rider
  separation tests stand on; done if the adviser says withdrawal must be
  as hard a wall as separation.

## Amended 2026-10-12: in at once, locked after a week

Martin's answer 4 to docs/plan-konto-og-priser.md (§2.2, §9): a person
who creates their own workspace through door 2 is in it at once, and the
address must be confirmed within a week. Built in backlog S-12b:

- `mustVerifyFirst` (src/core/auth/verify-first.ts) is true only for a
  door-2 account that is unconfirmed **and** older than
  `VERIFY_GRACE_DAYS = 7` (src/core/auth/verify-days.ts), by the
  account's `created_at` as the database has it. Until then
  `getOrgContext` gives the workspace as to anyone, and a stripe at the
  top of every app page says "Bekræft din adresse inden {date}" with
  "Send mailen igen" — the /verify page's own action, three an hour. The
  sign-up form lands on Today, not on /verify.
- After the week nothing changes from before: the app's layout and
  Rulle's send the person to /verify, `getOrgContext` answers no team,
  and every service, action and route refuses, until the link is opened.
  Nothing they made is lost; the page says so.
- The sweep deletes an unconfirmed door-2 account after **thirty** days,
  not seven (`UNVERIFIED_DAYS`, src/modules/signup/sweep.ts), and
  `delete_unverified_signup()` (drizzle/0053) refuses anything younger by
  the database's own clock.

Why: the person who wants to try Kadence should see something before they
have to switch to their mail. Why the lock stays: an address that does not
exist cannot receive "Glemt adgangskode", and an account nobody can reach
is an account nobody owns — so a week is the most it may be used
unconfirmed, and thirty days the most it is kept.

Trade-offs: for a week an unconfirmed address holds a workspace with
whatever its holder typed in, health data included, under the same RLS and
consent as any other; a typo in the address costs its owner the account
after a week unless they notice the stripe. A flood of fake accounts now
costs Kadence thirty days of empty rows instead of seven, still behind the
five-an-hour count and the honeypot.

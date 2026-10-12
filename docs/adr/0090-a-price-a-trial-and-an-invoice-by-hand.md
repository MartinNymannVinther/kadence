# ADR 0090: A price, a trial and an invoice by hand — what a workspace may do when it has not paid

Status: accepted · Date: 2026-10-12 · Amended 2026-10-12 (S-12b: the price page, prices with a history, a plan's budget and quota applied) · Builds on 0048 (the owner's installation), 0080 (a person alone), 0082 (Kadence as a service, a fee allowed), 0085 (jobs), 0086 (mail), 0087 (quotas), 0088 (door 2), 0089 (AI budgets) · docs/plan-konto-og-priser.md, Martin's answers in §9, backlog S-12a

## Context

kadence.haij.dk is to be a service clubs and single riders pay a little
for (ADR 0082), while the code stays one AGPL codebase that a club can
run on its own server without paying anybody (dogma one). The plan
(docs/plan-konto-og-priser.md) proposed prices, a trial, what happens
when a trial or a payment runs out, and invoices made by hand. Martin
answered on 12 October 2026 (§9): the prices in §3.3, yes; a club's first
season free from the owner's approval until 30 September, then a trial;
expiry is read and export, nothing deleted; a new person in at once; and
no account number in Kadence — it is on the invoice.

## Decision

- **Two settings.** `BILLING` (`off` by default, `on`) and `TRIAL_DAYS`
  (30 by default, 0 for none) in `src/core/env.ts`. `BILLING=on` refuses
  to start without mail, since owners are reminded by mail
  (`src/core/env-rules.ts`). With `off` every workspace is free whatever
  its row says, nothing about prices shows, the pages answer 404, no mail
  goes and the daily job does nothing: the installation behaves as before.
- **Four states** on `organizations.plan` (drizzle/0052): `free`, `trial`
  until `trial_ends_at`, `paid` until `paid_until`, `expired`. A free
  workspace may carry `free_until` and a `free_reason`; when the date
  passes it becomes a trial. The columns are never set from a request:
  Better Auth's before-hook refuses a body that names them, as it refuses
  `kind` (`src/core/auth/workspace-fields.ts`), the application role has
  no UPDATE on organizations, and only our registration code (on the auth
  role) and the definers below write them.
- **Where a workspace starts** (`src/modules/billing/start.ts`). A person
  alone, through door 2, an approved application or leaving a team with
  their training: a trial of `TRIAL_DAYS` days, or free with no date when
  it is 0. A person alone who is at most U19 in the season by DCU's
  birth-year rule (`src/modules/billing/which-plan.ts`,
  `src/modules/dcu/classes.ts`) rides free on the `youth` plan through
  30 September of the year they turn 18, then gets the trial, priced as a
  person. A club the owner admitted (its registration with the owner's
  invitation, `src/core/auth/register.ts`): free with the reason
  `first-season` through the coming 30 September, then the trial. The
  installation's own first workspace, a workspace the owner creates, and
  every demo stay free.
- **Prices are data.** `price_plans` (drizzle/0052), the installation's
  table: `person` 290 kr. a year, `club` 1,200 kr. a year for up to 20
  riders and 50 kr. for each beyond, `youth` 0 kr., VAT included, with an
  AI budget and a file quota per plan. Every runtime context reads it;
  only `set_price_plan()`, which checks the installation's owner, writes
  it, and its changes are audited. A workspace's plan is its `price_plan`
  or the one its kind gives; `workspace_price()` computes the yearly
  price from the plan and the riders the workspace has now, and
  `which-plan.ts` holds the same sum for the pages, kept equal by a test.
  Whole kroner; a month is the year divided by twelve, rounded. A plan's
  AI budget and file quota are written beside its price; a workspace still
  gets the installation's defaults (ADR 0087, 0089) or the owner's own
  number for it until the plans are wired to them (TECH-DEBT).
- **Expired is read and export.** `runAction` (`src/core/action.ts`)
  refuses every server action for an expired workspace with
  `forbidden:planExpired`, except those that pass `STILL_ALLOWED`: the
  previews and loads that only read, the search, leaving a team with or
  without one's training, withdrawing consent to health data, erasing a
  rider, removing a parent's access, disconnecting a device, removing an
  upload key, deleting a ride, and the reminders' own state and
  unsubscribe. `tests/billing/allowlist.test.ts` names every one. The
  actions outside `runAction` that add — inviting a member, changing a
  role, the model setting — ask the same question; exporting, deleting
  the workspace or the account, leaving and signing out never did go
  through it and are untouched. Every door a ride comes in by refuses
  inside the import (`assertWritableIn`), answered as the quota is: the
  word `planExpired` on the upload and the archive, `402` with
  `reason: "planExpired"` at the upload key's door, a device's job gives
  up and the link says why, and the club's picture is refused. Every
  model call is refused in the AI's one door (`reserveAiCall`), before
  anything is counted. Reading works everywhere. A stripe at the top of
  every page says the trial or the subscription has ended, what still
  works, and, for a coach, the way to Abonnement; a trial shows a quiet
  line with its days under Indstillinger and the stripe only in its last
  week. Nothing is ever deleted because a workspace has not paid.
- **The move is a daily job, never a request.** `billing.expire`
  (`src/modules/billing/jobs.ts`, ADR 0085) runs `expire_workspaces()`,
  which moves a trial or a payment past its end to `expired` and a free
  workspace past its date to a trial, never touches a demo, answers what
  it moved, and is refused from a workspace's context. Then it sends the
  mails.
- **Payments by hand.** The invoice is made and kept in the owner's own
  bookkeeping. Installation → Betaling lists every workspace but the
  demos — a club by name, a person as "Enkeltperson" and the end of its
  id — with its plan, its dates, its riders and its price, and two
  actions: "Registrér betaling" (amount, VAT, invoice number, period,
  note → `set_payment()`, which writes a row in `payments` and moves the
  workspace to `paid` through the last day of the period, never
  shortening a later one) and "Sæt gratis" (reason and an optional last
  day → `set_plan_free()`). Both check the installation's owner in the
  action and again in the database, refuse a demo, and are audited.
  `payments` carries `org_id`, forced RLS — the workspace's owner and
  the installation's owner read, nobody in a workspace writes — an audit
  trigger, and a tab in the export.
- **Abonnement** under Indstillinger (under "Dig" in a personal
  workspace), for the workspace's coaches: the state and its day in
  plain words, the price a year and a month, the riders it is built on,
  that the invoice comes from Haij by mail and is paid by bank transfer
  with the account number on the invoice, and, for the owner, the
  payments registered.
- **Four mails**, to the workspace's owners only: 7 days and 1 day before
  a trial ends, 14 days before a payment runs out, and once when the
  workspace has become read only (`src/core/mail/templates/plan-notice.ts`,
  `src/modules/billing/notices.ts`). Each names a club by its name and a
  person's own workspace as "dit eget Kadence" — a person's workspace is
  named after them, and the mail templates carry no word about training
  — the day, the yearly price, that an invoice comes from Haij, and one
  link to Abonnement. No account number. Once is a count in the counters
  (ADR 0083), keyed by kind, workspace, owner and the day the mail is
  about, so a new trial or payment is a new mail; a mail that failed
  takes its count back for the next day. The job reads who is due across
  workspaces through `billing_notices_due()` — ids, a word and a date —
  and the address, language and name as the owner, as the parents' week
  does.
- **No account number anywhere in Kadence** (Martin's answer 5). Not on
  Abonnement, not in a mail, not in a setting.

## Trade-offs accepted

- **An expired club can read forever.** Nothing is deleted for not
  paying, so a club that stops paying keeps a read-only Kadence with its
  history, and its riders can take their data out. That is dogma three
  and Martin's answer 3; the cost is storage nobody pays for, which the
  quotas (ADR 0087) keep bounded.
- **The owner keeps the books by hand.** Invoices, numbering, VAT and
  reminders to pay live in the owner's own bookkeeping; Kadence only
  records that an invoice was paid, and an owner who forgets to register
  a payment leaves a paying club read only until they do. At ten clubs
  and a hundred persons that is an evening a month; card payment is a
  later decision with a new ADR.
- **A trial can be gamed by a new address.** Door 2's confirmed address,
  its five accounts an hour per network address (ADR 0088) and the sweep
  of unconfirmed accounts limit it; a person who makes a new address
  every month gets a free Kadence for the price of their own time.
- **A young rider's birth year is self-declared,** as it is for the age
  of 15 (ADR 0080). Claiming to be 16 buys a free plan and a lower AI
  budget; the price of the lie is small enough not to police.
- **The mails' "once" lives in the counters,** an unlogged table: a crash
  of the database, not a deploy, forgets them, and the worst that does
  is one reminder twice.
- **Better Auth's own endpoints are not gated.** An expired workspace's
  coach can still rename it or change a member's role through Better
  Auth's organization endpoints called directly; the app's own buttons go
  through actions that refuse. It adds nothing a reader would not have,
  and gating it needs the active workspace's plan inside Better Auth's
  hook (TECH-DEBT).
- **Dogma one holds.** The same code runs everywhere and nothing is only
  for payers: with `BILLING=off`, the default, a self-hosted club gets
  every feature for nothing, and the open price page S-12b adds says so.

## Amended 2026-10-12: the price page, the price table, and a plan's limits (S-12b)

- **Prices have a history.** `price_plans` is keyed by the plan and its
  `valid_from` (drizzle/0053). `price_plan_now()` and `price_plans_now()`
  pick the newest row whose day has come, a Copenhagen day, and every
  reader — `plan_yearly_dkk`, `workspace_price`, `billing_overview`, the
  pages — goes through them. `set_price_plan()` takes the day a change
  takes effect (today when none is given, never a day that has passed),
  adds a row for it and keeps the older ones; a second change the same
  day replaces that day's row. Installation → Priser
  (`settings/installation/prices`, the owner's only, with `BILLING=on`)
  edits each plan's names, price, included riders, price per rider, AI
  budget, file quota and VAT, and shows what 12, 20, 21 and 40 riders
  pay as it is typed.
- **A plan's AI budget and file quota are applied.** With `BILLING=on`,
  `workspacePlan()` (src/modules/billing/state.ts) carries today's AI
  budget and file quota of the workspace's price plan, and the AI's limit
  (`monthlyBudgetMicro`) and the file quota (`fileQuotaIn`) use them
  where the owner gave the workspace no number of its own: the
  workspace's own number, then its plan's, then the installation's
  default (ADR 0087, 0089). With `BILLING=off` the plans say nothing and
  the installation's defaults apply as before. The TECH-DEBT entry is
  closed.
- **The open price page.** `/priser` (`/en/prices`) under `(open)`, from
  today's rows: a card for a rider alone and one for a club, a year and a
  month, what is included, what is free, the trial as `TRIAL_DAYS` says,
  how one pays (an invoice from Haij by mail, bank transfer, a year in
  advance, no account number) and that the code is AGPL-3.0 with a link
  to it. With `BILLING=off` the proxy answers 404 before it renders, as
  for a parked page (src/core/features.ts), and nothing links to it. The
  front page links it in its top and bottom, Viden og hjælp has a card.
- **The front page by `SIGNUP` and `BILLING`**
  (src/modules/billing/landing.ts): with door 2 open, "Opret konto" first,
  "Er I et hold? Så ansøger I først" under the hero's buttons, and the two
  ways in each with a button; with billing on, one line with the trial and
  the cheapest paid plan a month, or "Gratis at komme i gang" when
  `TRIAL_DAYS=0`. Closed and open installations look as before.

Trade-off: a price for a later day is invisible on the open page until
that day, so an announced change is announced elsewhere; and the owner's
list of other rows is read-only — a mistaken future row is overwritten by
saving that day again, never deleted, so the table only grows.

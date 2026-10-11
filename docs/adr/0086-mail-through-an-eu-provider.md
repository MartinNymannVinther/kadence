# ADR 0086: Mail through an EU provider

Status: accepted · Date: 2026-10-11 · Builds on 0004, 0032, 0060, 0064, 0065, 0080 · Replaces backlog P3-05 with S-07 (docs/plan-alene-og-som-tjeneste.md §5.1)

## Context

Kadence sent no mail (ADR 0001, 0004, 0032). Every way in was a link a
person passed on by hand: the owner copied an approved application's link,
a coach shared each rider's and parent's invitation with "Del" (ADR 0064),
and a person who forgot the password asked a coach for a one-time link
(ADR 0032). That is fine for twenty coaches who know each other. It does
not reach a person who finds Kadence alone (ADR 0080, S-08), nor a club
with forty riders and their parents, where the coach becomes the
installation's postman.

Martin said yes on 11 October 2026 to mail through SMTP with `nodemailer`,
and left the provider to us (the plan's question 2).

## Decision

- **Scaleway Transactional Email** (Scaleway SAS, Paris; EU data centres,
  `fr-par`; transactional mail only, no marketing product attached) is the
  provider for kadence.haij.dk, with **Brevo** (Paris) as
  the reserve. Kadence speaks plain SMTP, so changing provider is changing
  five variables. The row is in `docs/subprocessors.md` before the first
  mail is sent.
- **One dependency, `nodemailer` 10.1** (MIT-0, no dependencies of its own,
  types bundled, so no `@types/nodemailer`), pinned to the minor
  (`~10.1.0`). `pnpm audit --prod` stays clean.
- **Optional, and off by default.** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD` and `MAIL_FROM` are read in `src/core/env.ts` as a group:
  all five or none, and some of them refuses to start, naming what is
  missing. They are forwarded in `docker-compose.yml` and documented in
  `.env.example` and `docs/deploy.md` §6b. Port 465 is TLS from the first
  byte; every other port must upgrade with STARTTLS (`requireTLS`), so a
  password never crosses in the clear.
- **`src/core/mail/`**: `mailer.ts` (`mailConfigured()`, `sendMail`,
  `sendMailOnce`, `sendMailLater`, a transport made once per process),
  `words.ts` (the translator for `mail.*` without a request), `links.ts`
  (every link on `BETTER_AUTH_URL`) and `templates/`, one pure function
  per mail that returns `{ subject, text }`. Plain text only: no HTML, no
  images, no tracking pixel, no link other than Kadence's own.
- **Four mails, nothing else**, each only when mail is configured:
  1. **Bekræft din adresse**: Better Auth's `sendVerificationEmail`, asked
     for under Indstillinger → Sikkerhed, which shows a check mark once the
     address is confirmed. `requireEmailVerification` stays false; nothing
     is sent on sign-up or sign-in. S-08 turns it on for a person who signs
     up alone. Confirming is audited as `auth.email_verified`.
  2. **Nulstil din adgangskode**: Better Auth's `sendResetPassword`, so
     `/forgot-password` works: one field, always the same answer ("Hvis
     adressen findes i Kadence, har vi sendt et link"), five an hour per
     e-mail address and five per network address, counted before Better
     Auth is asked. The link opens the same `/reset-password` as the
     coach's link (ADR 0032): once, within the hour, signing the person out
     everywhere else. The coach's link stays beside it, on every
     installation. The login page shows "Glemt adgangskode?" as a link to
     the page only when mail is configured; without it, the old note.
  3. **Du er inviteret**: "Send på mail" beside "Del" in "Links, der
     venter" and in the result of "Inviter hele holdet", for a coach of the
     team, for this team's open invitations only, to the invitation's own
     address. The mail says who invited the person to which team, as a
     rider or as a parent (ADR 0065's words: "som forælder til Emma", the
     child's first name only), until when, and the link. The owner's Adgang
     gets "Send linket" for the link just minted (ADR 0004 said this would
     come with mail): the browser hands back the key it was shown, and the
     server sends it only if its hash names an open invitation, and only to
     that address. Both are audited as `invitation.mailed`, with the
     invitation's id and no address, as the other invitation events.
  4. **The parents' week, "også på mail"** (ADR 0060): a parent's choice
     under Indstillinger → Profil, beside the push and independent of it.
     Sunday from 18.00, never in the quiet hours, once a week per person:
     "Der er nyt om ugen i Kadence" and a link to the parents' page —
     exactly as empty as the push. Stored in `mail_preferences`
     (drizzle/0048): `org_id`, `user_id`, `week`, `locale`; forced RLS, the
     person's own row only, an audit trigger, gone with the account, the
     team or leaving it. The run finds the choices through one definer,
     `mail_week_due()` (team and person, for members, nothing more), and
     reads the rest as the person. Once a week is a count in the counters
     (ADR 0083), so the audit trail holds the choice and not the job.
- **Sending from a request**: inline with one retry a second later, a
  failure logged by the error's name only, never with the address, the subject or the text. Better
  Auth's two mails go in the background (`sendMailLater`), so the time an
  answer takes does not tell whether an address has an account. Each also
  counts per person, silently, for a caller that reaches Better Auth's
  endpoints directly, and Better Auth's own limiter holds
  `/request-password-reset` and `/send-verification-email` to five an hour
  per network address.
- **Jobs later**: `sendMailOnce` makes one attempt and throws, so the job
  table S-06 is building can wrap it and keep its own account of retries
  and backoff. Until then the weekly mail rides on the reminder timer (ADR
  0060), which now starts when mail is configured even without push keys.
- **Tests** send through a recording transport (`tests/helpers/mail.ts`);
  the mailer refuses SMTP under `NODE_ENV=test` whatever a developer's
  `.env` holds, and `vitest.config.mts` pins the five variables empty. A
  test asserts every template, in both languages, against a list of words
  about training and health and that every link is on `BETTER_AUTH_URL`.

## Trade-offs accepted

- **A dependency.** Writing SMTP, STARTTLS, AUTH and MIME by hand is
  possible and was not worth it: `nodemailer` is the de facto standard,
  has no dependencies of its own, and is the one library the plan named.
  It is the only new package.
- **A subprocessor.** The provider sees the recipient's address, the
  subject and the text, and that a mail went out. That is why the text
  carries nothing worth reading: no training, no health, no check-in, no
  name of a rider beyond a parent's own child's first name in an
  invitation. An installation without the five variables has no mail
  provider at all.
- **E-mail is not a secure channel.** A mail can be read on the way and
  sits in an inbox for years. So it carries only a link, and the link is
  the same short-lived, single-use, address-bound key as before: an
  invitation admits the address it was made for, a password link works
  once within the hour, a confirmation link within the hour. Everything
  else stays behind the login.
- **Reset by mail beside the coach's link.** A person can now get back in
  without anyone's help, which also means whoever reads their inbox can.
  That is the usual bargain of every web service; two-step verification
  still asks for its code, the reset signs the person out everywhere
  else, and the audit trail keeps `auth.password_reset`. The coach's link
  stays: it works without mail, and for a fifteen-year-old who never reads
  their inbox.
- **No enumeration, at a price.** The page answers the same for every
  address, so a person who mistyped theirs is not told; the answer says to
  look in spam and names the coach's link. The background send means a
  provider that is down is not seen on the page, only in the log.
- **What stays off without SMTP**: the forgot-password page (404), the
  login's link to it, the address card under Sikkerhed, "Send på mail",
  "Send linket", and the week by mail. Better Auth refuses a reset and a
  confirmation by e-mail as before. Everything else behaves exactly as it
  did.
- **Language.** A mail is written in the language of the page it was asked
  from: the forgot-password page's, the coach's for an invitation (as the
  "Del" text is, ADR 0064), the owner's for the owner's link, and for the
  week the language of the page the choice was made on, stored with it.
  Kadence keeps no language per person.
- **A week mail lost to a crash** is not sent twice, and is not retried
  either once its count is taken: the counters are unlogged (ADR 0083). The
  next Sunday comes.

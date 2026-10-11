# Subprocessors

Per the Haij dogmas, every subprocessor must be EU-owned and EU-hosted,
and must be listed here **before** it is taken into use. This is the
public list of who can see what for the installation at kadence.haij.dk. A
self-hosted Kadence with `LLM_PROVIDER=ollama` or `none`, without Wahoo,
Garmin or Polar keys, without the push keys for reminders and without the
SMTP settings for mail has no subprocessor at all beyond the machine it
runs on, and talks to nobody else.

Wahoo, Garmin and Polar are not on the table below, because they are not
Kadence's to choose: they are services a rider may choose to connect
their own account to — Wahoo and Garmin in the US, Polar in Finland. They have a table of their own further down,
[Services a rider chooses to connect](#services-a-rider-chooses-to-connect),
which says what goes where and when.

| Subprocessor                                                                         | Purpose                                                                                                                                                                                                                  | Data                                                                                                                                                                                                                                                                                                                                                        | Location                                          | Added      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------- |
| Hetzner Online GmbH                                                                  | Hosting: the VPS running Docker and the database                                                                                                                                                                         | Everything the installation holds                                                                                                                                                                                                                                                                                                                           | Nuremberg, DE                                     | 2026-09-18 |
| Hetzner Object Storage                                                               | The nightly encrypted database dump, and pgBackRest's repository — the nightly full backup and the WAL, at least once a minute — both kept off the VPS (docs/deploy.md §7)                                               | The dump, already encrypted with `age` before it leaves the server. The private key that can open it lives in Martin's password manager and is never on the server or uploaded anywhere — Hetzner holds ciphertext it cannot read.                                                                                                                          | Falkenstein / Nuremberg, DE (Hetzner Online GmbH) | 2026-10-11 |
| Mistral AI                                                                           | LLM adapter: the proposals a coach asks for — a bike or strength session, a week for a group or for one rider, a programme, and Monday's overview of the team                                                            | What a prompt contains: the coach's own words, the session or week being built, DCU's numbers for the rider's class, the team's planned sessions, calendar and library, and recent weeks' training load. Only where the team has turned on "Må AI'en læse rytternes data": a rider's first name and the guardrail flags raised for them. Written out below. | EU/EFTA data centres, via `api.eu.mistral.ai`     | 2026-09-24 |
| Scaleway SAS (Scaleway Transactional Email), 8 rue de la Ville l'Evêque, 75008 Paris | Mail: a link to confirm an address, a link for a new password, an invitation, and the parents' "der er nyt om ugen" for those who chose it (ADR 0086). SMTP to `smtp.tem.scaleway.com`, port 587 (STARTTLS) or 465 (TLS) | The recipient's address, the subject and the mail's text: a link to Kadence and the words around it; for an invitation the inviter's name, the team's name and, for a parent, the child's first name. No training or health content is ever in a mail                                                                                                       | Scaleway's EU region (fr-par, Paris)              | 2026-10-11 |

Mail goes through Scaleway Transactional Email, and only where the
installation has the five SMTP settings (ADR 0086): without them Kadence
sends no mail at all, and every link is shared by hand as before. No
training or health content is ever in a mail. A mail carries a link to
Kadence and the few words around it, because e-mail is not a secure
channel and an inbox keeps what it is sent; what the link opens stays
behind the login. Reminders go by web push, through the push service of
the person's own browser, and carry no content; they have
[a section of their own](#the-browsers-push-service-for-reminders).

## What each one does and does not see

**Scaleway** delivers four mails and nothing else (ADR 0086): a link to
confirm an address, asked for under Indstillinger → Sikkerhed; a link to
choose a new password, asked for at "Glemt adgangskode?"; an invitation a
coach or the installation's owner sends to the address it is bound to,
naming who invited the person to which team, as a rider or a parent, and,
for a parent, the child's first name only; and, for a parent who chose
it, "Der er nyt om ugen i Kadence" on Sunday evening, which names nobody.
Scaleway sees the recipient's address, the subject, that text and when it
was sent. The mails are plain text, with no tracking pixel and no link to
anywhere but the installation's own address. Brevo (Paris) is the reserve
if Scaleway has to be replaced; it would get its own row here before the
first mail.

**Hetzner** hosts the machine, so it holds everything by definition: the
database, the backups on their way out, the logs. That is unavoidable for
any hosted deployment and is why the choice of provider matters and why
the exit plan in `docs/deploy.md` is a design requirement rather than a
nicety. The nightly dump leaves the VPS for **Hetzner Object Storage**
too (`docs/deploy.md` §7), but encrypted first with an `age` key pair
whose private half is generated on Martin's own machine and kept in his
password manager — never on the server, never uploaded. Hetzner Object
Storage holds ciphertext it has no way to open. pgBackRest, the backup
that restores to the minute (`docker-compose.backup.yml`, ADR 0089),
keeps its repository in a bucket of its own there: the nightly full
backup and every WAL segment, encrypted on the server with a passphrase
before they leave it. That passphrase has to be on the server, because
the server encrypts as it goes; a person with the server has the
database anyway. Hetzner sees ciphertext either way. A self-hosted
Kadence without the overlay sends nothing here.

**Mistral** is a French company, and that is not by itself the answer to
where the data goes. Mistral runs three endpoints: `api.mistral.ai`,
`api.eu.mistral.ai` and `api.us.mistral.ai`, and they state that they do
not commit to any particular inference location for the first of them.
Kadence calls the EU one, and `MISTRAL_BASE_URL` in the environment is what
decides it, so it is an installation's choice and not a workspace's. The
regional endpoints cost 1.1x list price; that is what this row costs.

Mistral receives what a prompt contains and nothing else, and only when
a coach presses a button that asks for a proposal (docs/adr/0015,
`src/modules/ai`, `src/modules/assist`). Every prompt is built in code a
reader can check: the coach's own typed words go in fenced as data
(`src/modules/ai/prompting.ts`), never as instructions, and the model's
answer is read back through a sanitizer
(`src/modules/ai/sanitize-helpers.ts`) before anything built from it
reaches a page — the AI proposes, a coach decides, and nothing it writes
is saved or sent on its own (dogma five).

- **"Byg med AI" for a bike or strength session**
  (`src/modules/assist/build-workout-prompt.ts`): the coach's own
  words, the session already in the builder, and DCU's numbers for the
  class the coach chose, from Kadence's own copy. No rider's data.
- **"Foreslå ugen" for a group of riders of the same class**
  (`src/modules/assist/group-week.ts`): the coach's wishes for the
  week, DCU's hour corridor and phase for the class, the team's own
  calendar events (not a rider's own) and its library of sessions. No
  rider's data.
- **"Foreslå ugen" for one rider** (`src/modules/assist/week-draft.ts`):
  the same as above for that rider's class, plus — only because the
  team has turned on "Må AI'en læse rytternes data" (`team_settings`, ADR 0017) — that rider's bike hours for the last few weeks and the _kind_
  of any open guardrail flag (a word such as "fatigue" or "pain", never
  the check-in's own text, never a weight or a body measurement).
- **"Mandagsoverblikket", the coach's Monday brief**
  (`src/modules/assist/coach-brief.ts`): only where the same switch is
  on, each flagged rider's first name and the kind and severity of
  their guardrail flags — nothing a rider wrote themselves.
- **"Byg med AI" for a programme** (`src/modules/exercises/ai`): the
  coach's own words, the programme already in the builder, the turns
  of the conversation so far, and the team's library of exercises. The
  class is the coach's own choice in the panel, not read from any
  rider, so no rider's data goes in either.
- **The connection test** under Settings → AI carries nothing from the
  workspace: one fixed sentence — "Svar med præcis ét ord: OK" — so that
  "configured" and "working" can be told apart.

No prompt carries a person's account name or e-mail, a password, a
token or anything from the audit trail. A rider's weight, body or food
is never mentioned — the prompts say so explicitly, because Team
Danmark advises against it and comments on weight are a known trigger
of eating disorders in young athletes. Nothing is sent in the
background: without a press, no call.

## A workspace can choose a different one

Since ADR 0006, a workspace may set its own provider, model and API key in
Settings → AI. Mistral is the default on kadence.haij.dk and the one this
list covers, and it is what every workspace uses until it says otherwise.
A workspace that chooses differently has chosen its own processor: its
text then goes to the provider named on its own settings page, under
whatever agreement it has with them, and this list no longer describes
it. A workspace that sets the provider to "none" sends nothing to any
model at all; every AI surface says so and everything else works.

The Ollama address is not part of that choice — it belongs to the
installation — so on the hosted instance the real options are Mistral or
no model. The key a workspace stores is encrypted at rest and is never
readable from the interface; the settings page says which key is in force,
the installation's or the workspace's own.

Passwords, passkeys, session tokens, the audit log, invitation ids,
and anything belonging to another workspace are never sent. Everything a
person has written is placed in the prompt as data, never as instructions,
which is the prompt-injection defence rather than a privacy measure —
both matter, for different reasons.

## Services a rider chooses to connect

Dogma two names them: Wahoo, Garmin and Polar are external services,
they say so, and FIT upload, the calendar and everything else keep
working without them. Dogma four's EU rule is about what Kadence hands to
others; these are the rider's own accounts — with two companies outside
the EU and one inside it — which a rider may already use to record every
ride. So the choice
is the rider's and nobody else's: only the rider can connect their own
account (a coach cannot, and the database refuses it), the rider can
disconnect at any time from Kadence or from the provider, and until they
connect, nothing about them goes to any of them. An installation without the
keys (`WAHOO_CLIENT_ID`, `GARMIN_CLIENT_ID`, `POLAR_CLIENT_ID` and their
secrets) offers none of them.

| Service                                                                                    | Chosen by                        | From the provider to Kadence                                                                                                                                                                                                                                                                                 | From Kadence to the provider                                                                                                                                                                                                                            | Location                                                                                                                                                                                                                                                                                | Added      |
| ------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Wahoo Fitness (Wahoo's Cloud API)                                                          | The rider, for their own account | The account's id; each ride saved on a Wahoo device as a FIT file (time, GPS track, power, heart rate, cadence) with the workout's name                                                                                                                                                                      | The OAuth tokens it issued, when they are refreshed; a planned bike session when the rider or a coach presses "send": its title, description, date and steps, with targets from the rider's FTP and threshold heart rate; a disconnect                  | Atlanta, US                                                                                                                                                                                                                                                                             | 2026-09-27 |
| Garmin (the Connect Developer Program: Garmin International; the group is Swiss-domiciled) | The rider, for their own account | The account's id; each activity's FIT file, fetched from Garmin with the rider's token after Garmin says one is ready                                                                                                                                                                                        | The OAuth tokens it issued, when they are refreshed or used to fetch a file; a planned bike session on "send", as for Wahoo, with watts and beats worked out from the rider's thresholds; the deregistration Garmin requires when the rider disconnects | Olathe, Kansas, US (Garmin Connect)                                                                                                                                                                                                                                                     | 2026-09-27 |
| Polar (AccessLink API v3: Polar Electro Oy, Kempele, Finland)                              | The rider, for their own account | The account's id (in the token answer); each exercise's FIT file, fetched from `www.polaraccesslink.com` with the rider's token after Polar's signed notification says one is ready. The registration's answer carries the Polar profile (name, birth date, sex, weight, height); Kadence discards it unread | The OAuth token it issued, when used; the registration AccessLink requires, with a random member id and nothing about the rider; the de-registration when the rider disconnects. No planned sessions: Kadence sends none to Polar                       | EU/EEA — Polar's privacy notice places Polar Flow's service data in Ireland and Sweden. Kadence talks to `flow.polar.com` (consent), `polarremote.com` (tokens) and `www.polaraccesslink.com` (the API); where those hosts themselves run is not stated in Polar's public documentation | 2026-09-27 |

What this means in practice:

- **Nothing about the rider goes out in the background.** A ride comes in
  because the provider says one is ready; a session goes out only when a
  person presses "send"; tokens are refreshed when they are about to be
  used. Kadence never sends the rider's check-ins, their measurements,
  their comments, their team or anyone else's data to any of them.
- **What comes in is the rider's own ride**, imported exactly like a FIT
  file the rider uploads, under the same rules for who may see it. A
  file is fetched only from the provider's own host, capped in size and
  decoded by Kadence's own decoder, which refuses rather than guesses.
- **Wahoo's account endpoint answers with the whole profile** — name,
  e-mail, birth date, height and weight. Kadence reads the id from it
  and keeps nothing else. Polar's registration answers with a profile
  too; Kadence does not read it at all, since the id comes with the token.
- **A coach's "send" goes to the rider's account**, and carries the
  rider's FTP and threshold heart rate as the targets the device holds —
  the same numbers the exported workout files carry.
- **The tokens are sealed** with the installation's secret box, bound to
  the rider's link, never shown in the interface and never written to the
  audit trail. Disconnecting tells the provider where its API allows and
  deletes the link and its tokens either way.
- **Leaving is complete.** Disconnecting stops everything; what the
  provider already holds about the rider's own rides is between the rider
  and the provider, and Kadence neither sees nor controls it.

## The browser's push service, for reminders

Reminders (ADR 0060) reach a phone or a computer through the push service
that the person's browser uses. Kadence does not choose it: Safari uses
Apple's, Chrome and most Android browsers Google's, Firefox Mozilla's, and
Edge on Windows Microsoft's. None of them is in the EU, so the push carries
nothing: it only wakes Kadence's service worker in the browser, which then
asks Kadence itself, with the person's own cookies, what the reminder
says. The words never pass through the push service.

Nothing goes to a push service for anyone who has not turned reminders
on, per browser, in Settings → Mig, and an installation without
`PUSH_PUBLIC_KEY` and `PUSH_PRIVATE_KEY` offers no reminders at all.
Turning them off, leaving the team or deleting the account removes the
browser's address from Kadence; the push service is then told nothing
more, and forgets the address when the browser lets go of it.

| Service                                                                                                                                                                                       | Chosen by                                                                               | From Kadence to the service                                                                                                                                                                                                                                                                       | From the service to Kadence                                                                 | Location                                                                          | Added      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| The browser's push service: Apple (`web.push.apple.com`), Google's Firebase Cloud Messaging (`fcm.googleapis.com`), Mozilla (`push.services.mozilla.com`) or Microsoft (`notify.windows.com`) | The person, by turning reminders on in their own browser; the browser picks the service | An empty push to the browser's opaque address, at the time a reminder is due; how long to keep it (six hours); the installation's public key and a signed token naming the service and the installation's contact (`PUSH_CONTACT`, or its address). No title, no text, no name, no team, no rider | Whether the push was taken, or that the browser has gone (Kadence then deletes the address) | US (Apple, Google, Mozilla, Microsoft); where each runs its service is not stated | 2026-10-06 |

What the push service can still learn is the metadata: that this browser
got a push from this installation, and when. ADR 0060 names that as the
price of reaching a phone without a native app.

## Sources Kadence reads from

Not subprocessors: they process nothing on Kadence's behalf. Kadence
asks them for something public and takes the answer home. What goes out
is the question.

| Source                                                                                                              | Turned on by                                                                                                         | From Kadence to the source                                                                                                                                                                                                                                        | From the source to Kadence                                                                                                                                                                                                                       | Location                 | Added      |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ---------- |
| Cykling Danmark's member portal (`dcumedlem.sportstiming.dk`, run by Sportstiming ApS, Viby J, for Cykling Danmark) | The installation (`DCU_RESULTS`), then a coach or the rider entering the rider's UCI ID (ADR 0039)                   | A request for one public page, the rider's: the UCI ID in its address, and a user agent naming Kadence and the installation's address. Nothing else: no name, no team, no other data about anyone                                                                 | The rider's public page: name, birth year, UCI ID and every result filed under the licence. Kadence keeps the races from the season before on, with class, date, place and the link to the result list; it keeps neither the name nor the points | Denmark (Sportstiming)   | 2026-10-01 |
| UCI DataRide (`dataride.uci.org`, the International Cycling Union's own ranking tool)                               | The installation (`TEAMS_DCU` has no bearing here; this one has no switch of its own), for the teams page (ADR 0072) | Requests for public reference lists and ranking grids — the season, the discipline, Denmark's country id, the U23 and junior categories — with a user agent naming Kadence and the installation's address. No rider's name, no team, nothing about any one person | The UCI World Ranking (U23) filtered to Denmark: each Danish rider's rank, name, team and points, and Denmark's place in the Nations' Cup for junior men and women. Kept as the teams page's snapshot, refreshed once a day                      | Aigle, Switzerland (UCI) | 2026-10-11 |

The installation reads nothing until `DCU_RESULTS` is `on` or names the
rider's UCI ID, and nothing for a rider without one. The link to a
result list at `www.sportstiming.dk` is only shown: a coach opens it in
their own browser, and Kadence never fetches it. The UCI's rankings are
read whenever the teams page is on (`GUIDE_TEAMS`); there is no separate
switch for the UCI the way `TEAMS_DCU` gates Cykling Danmark, because the
UCI's rankings are read by everyone building the page, not entered per
rider.

## Not subprocessors, but worth naming

**GitHub** holds the source repository. It processes no installation
data, so it is a development dependency rather than a subprocessor, but
it is US-owned and that is worth stating plainly rather than leaving for
a reader to discover. Nothing about the installation's operation depends
on it: the deployment runs from a Docker image, and the repository can be
mirrored or moved without touching production.

**Let's Encrypt** issues the TLS certificate and therefore learns the
hostname, which is public in DNS anyway.

Adding anything to this list is a decision, not a formality. Before a new
row goes in: what data does it receive, could the feature work without
sending it, and what happens to the installation the day that provider
disappears.

# Subprocessors

Per the Haij dogmas, every subprocessor must be EU-owned and EU-hosted,
and must be listed here **before** it is taken into use. This is the
public list of who can see what for the installation at kadence.haij.dk. A
self-hosted Kadence with `LLM_PROVIDER=ollama` or `none`, without Wahoo,
Garmin or Polar keys and without the push keys for reminders has no
subprocessor at all beyond the machine it runs on, and talks to nobody else.

Wahoo, Garmin and Polar are not on the table below, because they are not
Kadence's to choose: they are services a rider may choose to connect
their own account to — Wahoo and Garmin in the US, Polar in Finland. They have a table of their own further down,
[Services a rider chooses to connect](#services-a-rider-chooses-to-connect),
which says what goes where and when.

| Subprocessor        | Purpose                                                                                                                                | Data                                                                                                                                                                      | Location                                      | Added      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- |
| Hetzner Online GmbH | Hosting: the VPS running Docker and the database                                                                                       | Everything the installation holds                                                                                                                                         | Nuremberg, DE                                 | 2026-09-18 |
| Mistral AI          | LLM adapter: the proposals a person asks for — a sharper description of an initiative, and deliverables for an initiative in a quarter | What a prompt contains: the initiative's text, the quarter's objective for it, the names of its existing deliverables, and the workspace's team names. Written out below. | EU/EFTA data centres, via `api.eu.mistral.ai` | 2026-09-24 |

Kadence sends no mail, so there is no mail provider on this list and there
will not be one without a row here first. Reminders go by web push, through
the push service of the person's own browser, and carry no content; they
have [a section of their own](#the-browsers-push-service-for-reminders).

## What each one does and does not see

**Hetzner** hosts the machine, so it holds everything by definition: the
database, the backups on their way out, the logs. That is unavoidable for
any hosted deployment and is why the choice of provider matters and why
the exit plan in `docs/deploy.md` is a design requirement rather than a
nicety.

**Mistral** is a French company, and that is not by itself the answer to
where the data goes. Mistral runs three endpoints: `api.mistral.ai`,
`api.eu.mistral.ai` and `api.us.mistral.ai`, and they state that they do
not commit to any particular inference location for the first of them.
Kadence calls the EU one, and `MISTRAL_BASE_URL` in the environment is what
decides it, so it is an installation's choice and not a workspace's. The
regional endpoints cost 1.1x list price; that is what this row costs.

Mistral receives what a prompt contains and nothing else, and only when
a person presses a button that asks for a proposal (docs/adr/0015):

- **Sharpen the description**: the initiative's title, kind and the
  description fields as they stand in the form — summary, problem,
  benefit, success criteria, hypothesis and risks.
- **Propose deliverables**: the initiative's title, kind, summary,
  benefit and success criteria, the quarter's objective for it, the
  titles of the deliverables it already has, and the workspace's team
  names with their ids, so the proposal can name a team.
- **The connection test** under Settings → AI carries nothing from the
  workspace: one fixed sentence — "Svar med præcis ét ord: OK" — so that
  "configured" and "working" can be told apart.

No prompt carries a person's account name or e-mail. The owner's name on
an initiative, status notes, decisions and capacity numbers are never
sent. Nothing is sent in the background: without a press, no call.

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

| Source                                                                                                              | Turned on by                                                                                       | From Kadence to the source                                                                                                                                                                        | From the source to Kadence                                                                                                                                                                                                                       | Location               | Added      |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------- |
| Cykling Danmark's member portal (`dcumedlem.sportstiming.dk`, run by Sportstiming ApS, Viby J, for Cykling Danmark) | The installation (`DCU_RESULTS`), then a coach or the rider entering the rider's UCI ID (ADR 0039) | A request for one public page, the rider's: the UCI ID in its address, and a user agent naming Kadence and the installation's address. Nothing else: no name, no team, no other data about anyone | The rider's public page: name, birth year, UCI ID and every result filed under the licence. Kadence keeps the races from the season before on, with class, date, place and the link to the result list; it keeps neither the name nor the points | Denmark (Sportstiming) | 2026-10-01 |

The installation reads nothing until `DCU_RESULTS` is `on` or names the
rider's UCI ID, and nothing for a rider without one. The link to a
result list at `www.sportstiming.dk` is only shown: a coach opens it in
their own browser, and Kadence never fetches it.

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

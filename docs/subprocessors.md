# Subprocessors

Per the Haij dogmas, every subprocessor must be EU-owned and EU-hosted,
and must be listed here **before** it is taken into use. This is the
public list of who can see what for the installation at kadence.haij.dk. A
self-hosted Kadence with `LLM_PROVIDER=ollama` or `none` and without Wahoo
or Garmin keys has no subprocessor at all beyond the machine it runs on,
and talks to nobody else.

Wahoo and Garmin are not on the table below, because they are not
Kadence's to choose: they are US services a rider may choose to connect
their own account to. They have a table of their own further down,
[Services a rider chooses to connect](#services-a-rider-chooses-to-connect),
which says what goes where and when.

| Subprocessor        | Purpose                                                                                                                                | Data                                                                                                                                                                      | Location                                      | Added      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- |
| Hetzner Online GmbH | Hosting: the VPS running Docker and the database                                                                                       | Everything the installation holds                                                                                                                                         | Nuremberg, DE                                 | 2026-09-18 |
| Mistral AI          | LLM adapter: the proposals a person asks for — a sharper description of an initiative, and deliverables for an initiative in a quarter | What a prompt contains: the initiative's text, the quarter's objective for it, the names of its existing deliverables, and the workspace's team names. Written out below. | EU/EFTA data centres, via `api.eu.mistral.ai` | 2026-09-24 |

Kadence sends no mail, so there is no mail provider on this list and there
will not be one without a row here first.

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

Dogma two names them: Wahoo and Garmin are external services, they say
so, and FIT upload, the calendar and everything else keep working
without them. Dogma four's EU rule is about what Kadence hands to
others; these are the rider's own accounts with companies outside the
EU, which a rider may already use to record every ride. So the choice
is the rider's and nobody else's: only the rider can connect their own
account (a coach cannot, and the database refuses it), the rider can
disconnect at any time from Kadence or from the provider, and until they
connect, nothing about them goes to either. An installation without the
keys (`WAHOO_CLIENT_ID`, `GARMIN_CLIENT_ID` and their secrets) offers
neither.

| Service                                                                                    | Chosen by                        | From the provider to Kadence                                                                                                            | From Kadence to the provider                                                                                                                                                                                                                            | Location                            | Added      |
| ------------------------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------- |
| Wahoo Fitness (Wahoo's Cloud API)                                                          | The rider, for their own account | The account's id; each ride saved on a Wahoo device as a FIT file (time, GPS track, power, heart rate, cadence) with the workout's name | The OAuth tokens it issued, when they are refreshed; a planned bike session when the rider or a coach presses "send": its title, description, date and steps, with targets from the rider's FTP and threshold heart rate; a disconnect                  | Atlanta, US                         | 2026-09-27 |
| Garmin (the Connect Developer Program: Garmin International; the group is Swiss-domiciled) | The rider, for their own account | The account's id; each activity's FIT file, fetched from Garmin with the rider's token after Garmin says one is ready                   | The OAuth tokens it issued, when they are refreshed or used to fetch a file; a planned bike session on "send", as for Wahoo, with watts and beats worked out from the rider's thresholds; the deregistration Garmin requires when the rider disconnects | Olathe, Kansas, US (Garmin Connect) | 2026-09-27 |

What this means in practice:

- **Nothing about the rider goes out in the background.** A ride comes in
  because the provider says one is ready; a session goes out only when a
  person presses "send"; tokens are refreshed when they are about to be
  used. Kadence never sends the rider's check-ins, their measurements,
  their comments, their team or anyone else's data to either.
- **What comes in is the rider's own ride**, imported exactly like a FIT
  file the rider uploads, under the same rules for who may see it. A
  file is fetched only from the provider's own host, capped in size and
  decoded by Kadence's own decoder, which refuses rather than guesses.
- **Wahoo's account endpoint answers with the whole profile** — name,
  e-mail, birth date, height and weight. Kadence reads the id from it
  and keeps nothing else.
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

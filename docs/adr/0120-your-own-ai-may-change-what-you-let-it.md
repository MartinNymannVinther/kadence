# ADR 0120: Your own AI may change and delete what you let it, and you can undo it

Status: accepted · Date: 2026-11-28 · Amends ADR 0118 (your own AI talks to Kadence) · Builds on 0117 (move or skip with a reason)

## Context

ADR 0118 let a rider's own assistant read their training over MCP and
write nothing. On 28 November 2026 Martin asked that a person may give
their assistant write and delete access if they choose, and that the
person configures what it may do. Haij's dogma five:

> **AI'en hjælper, mennesket bestemmer.** AI må foreslå, skrive udkast og rette i planer, men aldrig sende noget ud af ”huset”, slette noget eller forpligte nogen uden at et menneske har sagt ja. Alt AI gør, kan fortrydes. Indhold hentet udefra behandles som data, aldrig som instruktioner.

Martin's reading, accepted here: the person's own choice of what their
assistant may do is the human yes the dogma asks for; and whatever the
assistant does must be undoable, which is no choice.

## Decision

- **Switches the person sets, one connection at a time.** Five to read
  (sessions and calendar, rides, check-ins, form, season plan), four to
  change (the day's check-in, how hard a ride was, moving and skipping
  sessions, laying and changing sessions) and four to delete (sessions,
  activities entered by hand, rides, check-ins). Reading is on for a new
  connection, changing and deleting are off. They are set on the consent
  page and changed any time under Indstillinger → AI-forbindelser, and
  hold from the assistant's next call. They live in
  `ai_connections.permissions`, beside the OAuth scope, which stays
  `kadence:read`; a tool is offered only where its switch is on.
- **Only one's own.** Every tool that writes or deletes checks that the
  row is the caller's own rider's, so a coach who also rides reaches only
  their own, whatever the services let a coach do. A switch never reaches
  beyond what the person may do in Kadence.
- **Everything undoable, for 30 days.** Each change goes into
  `ai_actions` (forced RLS: the person's own rows only; audit; written
  once, then only its undo; swept after 30 days) with the row as it was.
  "Fortryd" under AI-forbindelser puts it back, or removes what the
  assistant made; a deleted ride comes back with its file and on the
  session it was laid on. An undo that would overwrite somebody else's
  later change is refused and says so. The audit trail records the change
  but not the undo log's copy of the row or the file.
- **Nothing sent.** No tool comments, mails or messages anyone. A change
  in the plan reaches the coach the way any change does.
- **The coach sees it came from an assistant.** `session_changes.via` is
  `ai` for a move or skip made over MCP, and the database checks it against
  the request's channel; "Nyt fra rytterne" and the rider's changes say
  "via egen AI".
- **The assistant's maker may ask first.** Tools that change or delete
  carry MCP's `destructiveHint`, so Claude and ChatGPT ask the person
  before each call.
- **Garmin's numbers** still stay as ADR 0118 says; deleting one's own
  ride from Garmin, and undoing it, is the person's own business.

## Consequences

- A person can let a model outside the EU change their training. It is
  their choice, made switch by switch, and they can take every change
  back for 30 days.
- The undo log holds copies of rows and of ride files for 30 days: more
  storage, kept to the person's own and swept daily.
- An undo after somebody else's change is refused rather than merged;
  the person then puts it right by hand.
- Coaches' tools are still the second wave of ADR 0118.

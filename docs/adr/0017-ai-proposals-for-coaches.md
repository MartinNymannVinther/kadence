# ADR 0017: Three AI proposals for coaches, and the team's yes to riders' data

Status: accepted · Date: 2026-09-27 · Builds on 0008 and 0009

## Context

The brief invites AI from the start. Dogma five says the AI proposes and
a person decides; dogma four and GDPR say riders' training and check-ins
are health data about young people and reach a model only when someone
responsible has said yes.

## Decision

Three proposals, each a read on its own route under `/api/ai` (ADR 0008),
counted under the installation's roof (ADR 0009):

- **Tekst til pas** (`parse-workout`): a coach's words become a
  structured bike session. Deterministic rules read the usual shorthand
  first, offline and free (src/modules/workouts/parse-text.ts); the model
  is asked only for what they cannot read, and its answer must pass the
  builder's schema. No rider data goes in.
- **Ugeudkast** (`week-draft`): a proposed week for one rider from DCU's
  hours and phase, strength frequency, the calendar, what is planned, the
  last weeks and the guardrails. Bike sessions come back as shorthand and
  go through the same rules; templates must be the team's own. The coach
  takes each session or leaves it (`origin = ai`).
- **Mandagsoverblik** (`coach-brief`): the riders who need attention and
  why. The list is the guardrails' — no model needed; the model may add a
  few sentences on who to talk to first, never advice to push through.

The two that read riders' data refuse until a coach has turned on
"Må AI'en læse rytternes data" (team_settings.ai_on_rider_data, off by
default), and say so (`notAllowed`). The AI never writes to a rider,
never saves a session, never deletes.

## Trade-offs accepted

- **Off by default means unused by default.** A team that never finds
  the switch gets no week drafts. The switch sits in the team settings
  with a plain explanation of what goes where; that is the cost of asking.
- **Rules before the model.** Some phrasings the model would read are
  refused by the rules first when they half-match; the rules return null
  on doubt, so the model gets the rest.

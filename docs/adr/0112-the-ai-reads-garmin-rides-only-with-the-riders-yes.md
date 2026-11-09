# ADR 0112: The AI reads rides from Garmin only with the rider's own yes

Status: accepted · Date: 2026-10-31 · Builds on 0110 (Garmin says so), 0017 (the AI on riders' data), 0088 (consents), 0095 (the session comment), 0109 (the form story)

## Context

A rider who connects Garmin says yes to rides coming in from Garmin
(ADR 0110). Letting a language model read those rides is a further step
with data about a young person's body that came through a third party,
and the rider should decide it, explicitly and in a way they can take
back. ADR 0110 put a second kind of consent, `garmin_ai`, in the schema
and said honestly that the AI did not yet tell rides from Garmin apart.

Four proposals read riders' rides: the comment on a session's ride
(0095), the story of the form (0109), the week draft for one rider, and
Monday's overview for the coach (0017). The form reaches back months and
the records years, so nearly every number those proposals read is built
in part on whatever rides the rider has. The team's own switch for
riders' data (0017) is a coach's decision about the whole team; it
cannot stand in for one rider's yes.

A consent is the person's own row (drizzle/0050): a coach asking for
Monday's overview cannot read a rider's yes.

## Decision

- **The rider says it, on the Garmin card.** Under Indstillinger →
  Enheder, once there is a Garmin link or a ride from Garmin, the card
  says whether the AI may read the rider's rides from Garmin. "Læs mere
  og sig ja" opens the words: what the AI's proposals are and that a
  person chooses whether to use one, what it reads (the rides' numbers
  and what Kadence works out from them), that the model runs in the EU
  or on the team's own server and that Kadence never trains a model on
  the rides, what happens without the yes, and that it is withdrawn in
  the same place and holds at once. A box to tick, then "Sig ja". The
  yes is a row in `consents` (`kind = 'garmin_ai'`, its own version and
  language), only for a rider about their own rider row. Withdrawing is
  one confirmed press; disconnecting Garmin withdraws it too.
- **One question for everyone.** `app_garmin_ai_riders(text[])`
  (drizzle/0060), a definer, answers which of the given riders have a
  standing yes written by the rider's own account, for riders of the
  active workspace the caller may read. It says nothing else about the
  rows. A row a coach or a parent wrote about the rider does not count.
- **A rider counts as having rides from Garmin** when any ride of theirs
  came through Garmin, whenever it was ridden. A window would have to
  follow every reader of rides.
- **The gate** (`src/modules/ai/garmin-gate.ts`) stands before the model
  in each proposal: the session comment refuses only when its ride came
  from Garmin; the form story and the week draft refuse for a rider with
  rides from Garmin and no yes; Monday's overview keeps such a rider on
  the list, which is the guardrails' and needs no model, leaves them out
  of what the model reads, and names them under the summary. A refusal
  reads "AI'en læser kun ture fra Garmin, når rytteren selv har sagt ja
  til det under Indstillinger → Enheder. Alt andet virker."
- **The checklist.** CONTRIBUTING.md's Garmin checklist gets the rule
  that a new proposal reading rides goes through the gate.

## Consequences

- A rider with rides from Garmin who has not said yes gets no comment,
  form story or week draft from the AI, and a coach's Monday summary
  speaks of the others. Everything that is not the AI works as before.
- A yes covers all the rider's rides from Garmin in this workspace, old
  and new; there is no yes per ride. Taking it back stops the next
  proposal; what a person already saved from an earlier one stays theirs.
- The rule leans to refusing: one ride from Garmin long ago is enough to
  need the yes. Riders who never connect Garmin are never asked.
- Proposals that read no rides — a session or programme built from the
  coach's words, the group's week — are untouched.

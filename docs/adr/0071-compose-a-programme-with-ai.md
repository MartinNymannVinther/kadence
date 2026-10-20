# ADR 0071: Compose a programme with AI, in conversation

Status: accepted · Date: 2026-10-08 · Builds on 0008, 0009, 0010, 0034, 0038, 0067

## Context

A coach puts a programme together in the builder (ADR 0067): parts of
the day, exercises from Kadence's library and the team's own, a dose on
each. "Byg med AI" (ADR 0038) builds a session from a coach's words, but
a programme is a different thing — it is made of exercises that already
exist, with drawings and doses, not of free text — and Martin asked for
a dialogue: talk with an AI about the composition, and have the builder
configured on the fly as the talk goes.

## Decision

- **One panel, "Byg med AI", in the programme builder**, between the
  description and the parts, for a coach's own programme — new or being
  changed. Not on the open page: there is no model behind a page anyone
  may read, and every call costs.
- **A conversation, not a form.** The coach writes what the programme
  should do, or what to change in the one that stands; the AI answers
  with a few sentences and, when the turn changed anything, the whole
  programme as it should now stand. The transcript stays in the browser
  for the length of the visit and is never stored.
- **Every answer that carries a programme is laid straight into the
  builder** — name, description and parts, where every exercise and dose
  can still be changed by hand. "Fortryd sidste ændring" puts back what
  stood before the last answer, as many steps as there were answers.
  Nothing is saved until the coach presses Gem (dogma 5): the builder's
  own actions do that, and they check every exercise again.
- **One read, `POST /api/ai/build-program`** (`src/modules/exercises/ai`):
  the coach's words, the programme in the builder, the last eight turns
  and a class in; a word back and the programme out. A read on its own
  route (ADR 0034), counted as `build_program` under the ceilings
  (ADR 0009). A coach's tool, as composing is (ADR 0010): the service
  refuses anyone else.
- **The model reads the library and nothing else.** The prompt carries
  one line per exercise the team may use — reference, name, group,
  equipment and its own dose — so a proposal can only point at exercises
  that exist. The answer is read field by field: an exercise is taken by
  its reference, its bare id or its name as listed (a model asked for
  `builtin:plank` writes `plank` often enough), anything else is dropped;
  a dose outside the contract is left out so the exercise's own applies;
  a part key used twice or unknown is dropped; the caps are the
  contract's. A programme with nothing left is no programme, and the
  coach gets the words alone.
- **Everything a person wrote goes in fenced as data**: the library's
  names (a team's own exercises carry a coach's words), the programme,
  the turns before, the coach's new words. The answer's words to the
  coach are stripped of control characters and capped at 600 characters.
- **DCU's frame, from Kadence's own numbers.** The coach may choose a
  class; the prompt then carries DCU's strength progression for it
  (`classLine`, ADR 0038) and the rules every programme follows —
  technique before load, never to exhaustion, 48 hours between strength
  sessions, stretches after hard work. Shown to the model, never
  enforced on the coach.
- **No rider's data.** The class is the coach's choice in the panel, not
  read from a rider, so the team's switch for riders' data (ADR 0017) is
  not asked.
- **Without a model the panel says so** and the builder works as before;
  the demo has no model, so there it shows that word.

## Trade-offs accepted

- **The proposal overwrites the name and the description** when it
  carries them, where ADR 0038 lets the coach's own words win. A coach
  who says "kald det X" expects the name to change; the model is told to
  keep what the coach did not ask to change, and "Fortryd" is one press
  away.
- **A small local model is slow and loose.** A 14-billion-parameter
  model on a laptop takes one to two minutes a turn and writes bare ids;
  the reading forgives the ids, and the panel says it is thinking.
  Mistral's hosted models answer in seconds.
- **The transcript is the browser's.** Leaving the page loses the
  conversation; the programme, laid into the builder, is what matters,
  and it is saved as any programme is.
- **The library goes in whole on every turn** — a few thousand tokens —
  rather than being cached or searched. Simpler, and within the
  ceilings; a team with hundreds of exercises will see the newest of its
  own left out past 200 lines.

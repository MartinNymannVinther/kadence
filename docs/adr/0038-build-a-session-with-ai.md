# ADR 0038: Build a session with AI, on the bike and in the gym

Status: accepted · Date: 2026-10-01 · Builds on 0008, 0009, 0010, 0014 · Amends 0017

## Context

"Tekst til pas" (ADR 0017) read a coach's shorthand into the steps of a
bike session: rules first, a model for the rest. It could not build a
strength session, it could not change a session already built, and it
made no name and no word to the rider. Coaches asked for an AI that
helps build sessions of both kinds, and for the library to be the place
they do it from.

## Decision

- **One panel, "Byg med AI", above the builder**, wherever a coach builds:
  the library's editor (and `?ai=1` from the library's top), the
  calendar's "Tilføj pas" and "Ret". It replaces "Skriv det som du
  plejer"; its component and its route `/api/ai/parse-workout` are gone.
- **One read, `POST /api/ai/build-workout`**: the sport, the coach's
  words, a class and the session so far in; a name, a word to the
  rider, the session and the guardrails' notes out. A read on its own
  route (ADR 0008), counted as `build_workout` under
  the ceilings (ADR 0009). It writes nothing: "Brug forslaget" puts the
  proposal into the builder, "Fortryd" puts back what was there, and
  only the coach's save writes a row (dogma 5).
- **From nothing, or by changing what is there.** When the builder holds
  a session, the coach can ask for a change ("15 min kortere"); the
  session goes in as JSON, fenced as data like the coach's words, and the
  answer is the whole session again.
- **Rules first, still.** A bike session from nothing is read by
  parse-text.ts before any model is asked: "2 t Z2" needs no model, and
  works with none. Strength has no rules; without a model the panel says
  so, and the builder works as before.
- **DCU's frame, from Kadence's own numbers.** The coach may choose a
  class. The prompt then carries DCU's longest ride for it
  (src/modules/dcu/rules.ts) or its strength programme's progression
  (src/modules/dcu/strength.ts) — written from those tables, never typed
  twice — and the answer gets the guardrails' note when a ride goes past
  the longest ride. Shown, never enforced.
- **No rider's data.** The class is the coach's choice in the panel, not
  read from a rider, so the team's switch for riders' data (ADR 0017) is
  not asked. The coach's words and the session are the only data in it.
- **A coach's tool**, as building is (ADR 0010): the service refuses
  anyone else.
- **The answer is read field by field.** A strength answer is coerced
  into the builder's shape — unknown groups become "other", sets and
  minutes are clamped, exercises without a name or reps are dropped, a
  progression rule that runs backwards is dropped, at most thirty of
  each — and then checked by the builder's own schema, as a bike answer
  always was. A name is one line of at most 120 characters, the word to
  the rider at most 1,000.

## Trade-offs accepted

- **The coach's own name and words win.** "Brug forslaget" fills the
  title and the description only where they are empty, so a proposal
  never overwrites what a coach wrote; a coach who wants the model's name
  clears the field first.
- **A session too large to send is not sent.** Past 10,000 characters of
  JSON the session in the builder is left out and the model builds from
  the words alone. No coach builds one that large by hand.
- **One undo, not a history.** "Fortryd" holds the session from before
  the last proposal and nothing older.

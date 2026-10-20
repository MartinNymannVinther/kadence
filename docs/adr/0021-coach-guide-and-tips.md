# ADR 0021: A coach guide in Kadence's own words, and tips that never enforce

Status: accepted · Date: 2026-09-27 · Amended 2026-10-07 (the check-in asks three questions first; the zones unchanged)

## Context

Most coaches of U17–U23 riders are volunteers. What they need to know is
spread over DCU's rules and compendia, Team Danmark's ATK 2.0 and posters,
DIF's booklets and research reports, Anti Doping Danmark, the Danish
concussion centre and the law — dozens of documents, some from 2015,
some that disagree with each other (docs/research/traenermateriale.md,
section 2). Team Danmark forbids reproducing ATK 2.0 without written
permission; most other sources state no licence at all.

## Decision

- **A coach guide** ("Trænerguide", `/help/coach`) of fourteen short
  sections, in Kadence's own words, each ending with the sources it
  stands on, linked. Nothing is copied; laws are the only text that may
  be quoted and still only paraphrased. The words live in messages
  (Danish first), the structure and sources in `src/modules/coach`, and
  a test holds the two together.
- **Numbers have one home.** DCU's race limits (the 2026 sporting rules,
  checked against the PDF's text) are in `src/modules/dcu/races.ts`; the
  guide's words, the tips and the AI's context all read them from there.
- **Tips, not rules.** The Today page shows a coach at most four tips
  from what is coming up (a race, a stage race longer than the class may
  ride, a camp, an exam), the season (new classes, the strength winter,
  summer heat), the team (first-year U17 riders, weight turned on) and
  the guardrails already raised. Each links to its guide section, can be
  put away on that device, and stops nothing. Every guardrail flag links
  to its section too.
- **The AI is told the same.** The week draft gets DCU's race rules for
  the class; both the week draft and the Monday brief are told never to
  comment on weight, body or food.
- Where sources disagree, the guide says so or takes the stricter line:
  Kadence's no-weight default runs to 19 where Team Danmark's runs to
  18; for concussion it shows the Danish stages for training and UCI's
  two weeks for juniors' racing, and leaves the decision to the doctor.

## Trade-offs accepted

- **Paraphrase ages.** Kadence's words do not follow the sources when
  they change; the research note dates every source, and the guide must
  be read against it each season. The 2016 compendia and Team Danmark's
  2015 energy note are already old.
- **Tips live in the browser.** A tip put away comes back on another
  device. Storing it would make advice a record, audited and exported,
  which it is not worth.
- **Heat has no Danish youth source.** The heat section says so and uses
  Team Danmark's general fluid advice and UCI's race protocol.
- **No medical advice.** The guide points to a doctor or dietitian for
  concussion, pain, energy deficiency and missing periods, and never
  computes energy availability.

## Amended 2026-10-07: a shorter check-in, the zones unchanged

Riders are asked to check in every day of the winter, and nine questions
is a lot on the way out of the door (backlog P2-11). The check-in has no
ADR of its own; its zones follow Kolding Talent's model as the guide does
(src/modules/load/wellbeing.ts), so the change is recorded here.

- **Three questions first**: hours of sleep, energy ("overskud") and
  ATK's pain steps, then "Gem". How well the rider slept, mood, legs,
  calm, ill or not, and a note wait behind "Mere", which stays open or
  closed for that rider on that device.
- **The zone is not changed.** It is still worked out from every answer
  by the same rule, for the coach's warnings and the rider's colours
  alike. Whether a zone may rest on the three answers alone is the
  question put to a professional in backlog A-06, and it stays open until
  they answer; nothing in the zones assumes it meanwhile.
- **So the answers behind "Mere" start from the rider's last check-in**,
  if it is within the model's three weeks, or in the middle of each scale
  and not ill when there is none (src/modules/wellbeing/prefill.ts), and
  the saved row is whole. The three asked first start blank every day;
  the note starts empty, since a note is about its own day. When an
  answer behind "Mere" starts low or says ill, "Mere" opens by itself, so
  nothing that colours the zone is saved unseen.

### Trade-offs accepted

- **An answer carried over is not an answer given.** A rider who taps
  three answers and "Gem" saves yesterday's mood, legs and calm as
  today's; the row cannot tell the two apart, and the zone counts both.
  That is what keeps the zone the same until A-06 says otherwise. The
  form says plainly that the answers are as last time, and opens "Mere"
  where they were low.
- **The middle is not nothing.** With no check-in to start from, a 3 on
  each scale behind "Mere" counts in the zone's average, where a question
  left unanswered did not.

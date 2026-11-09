# ADR 0110: Kadence's own training model, written down and kept alive

Status: proposed · Date: 2026-11-09 · Builds on 0014 (DCU as the frame), 0049 (a paradigm is a shape), 0053 (low intensity first), 0091 (Motionist and Supermotionist), 0095 (why a session went off plan), 0109 (the AI tells the story of the form)

## Context

On 9 November 2026 Martin asked for a broad research pass over the
recognised training philosophies, for young, adult and older riders and
from recreation to elite, gathered into Kadence's own training model and
coaching concept: the ground the AI stands on when it drafts a week,
comments on a ride or explains the form. He asked that the ground be
solid, dynamic and continuously updated, rest on real research and
experience, and that the sources and people Kadence leans on be
collected and documented as it goes.

Until now the model lived in pieces: DCU's numbers in `src/modules/dcu`,
the intensity profile of ADR 0053, the guardrails in `src/modules/load`,
the senior profiles of ADR 0091, and the prompts in `src/modules/assist`,
each with its own research note but no single statement of what Kadence
believes about training, how sure it is, and why.

## Decision

- **Nine research notes** in `docs/research/traeningsmodel/`, read on
  9 November 2026, one per area: intensity and physiology, periodization,
  load and monitoring, youth development, adults and older riders,
  strength and off-bike work, coaching and psychology, health, illness
  and injury, and digital and AI coaching systems. Each marks every
  claim [læst], [abstract] or [søgning], names the people behind each
  idea, and ends with what it means for Kadence.
- **The model** in `docs/traeningsmodel/README.md`: six layers (U17,
  U19, U23, Motionist, Supermotionist, 50+), twelve principles each
  with an evidence grade, how the AI plans (a fixed skeleton in code, a
  week redrawn from what happened) and how it writes (autonomy support,
  process goals, the same words to rider and coach), what the model
  refuses to do, and where it stands against each school.
- **The rulebook** in `docs/traeningsmodel/regler.md`: 138 numbered
  rules with scope, grade, source, where each lives in Kadence today, and
  what is contested. DCU's numbers remain the youth frame; where
  Kadence's own judgement fills a gap it says so.
- **The register** in `docs/traeningsmodel/kilder-og-personer.md`: the
  people, institutions, consensus statements, studies and schools the
  model leans on, what Kadence takes from each, a list of what must
  still be verified, a template for experience from real teams as a
  source type of its own, and a log.
- **Evidence grades** stærk, moderat, svag, erfaring and folklore decide
  how firmly the AI may speak of a thing; only [læst] and [abstract]
  sources may give a number in code, with the source beside it.
- **One way in, four steps:** a research note, then the register, then a
  rule, then code or prompt with a test and, where there is a trade-off,
  an ADR. The model is versioned and reviewed every October, when a
  consensus changes, when a note changes, and after every real winter
  with a real team.
- **Nothing in code changes with this ADR.** The model is a document
  until Martin has answered the 37 open questions it ends with.

## Consequences

- The model is written in Danish, as the research notes and the product
  are, although docs are otherwise English: it is written for Danish
  coaches to read and disagree with, and it will be the ground for
  Danish prompts and help texts. Code comments that cite it stay in
  English.
- Almost none of the evidence is from cycling, and none from young Danish
  road riders. The model says so and borrows limits with their sources
  rather than claiming evidence for U17–U23. Only a winter with a real
  team can call anything validated (dogma seven).
- The model rejects things other tools sell: an acute:chronic ratio with
  a safe zone, composite readiness scores, performance predicted from a
  fitness–fatigue model, cycle-based periodization, a fixed ramp rate,
  windows of trainability. Coaches who expect them will have to be told
  why, in Hjælp.
- Several tensions are left standing rather than averaged: bike fit as
  prevention, the concussion race lock (7/14 versus 21 days), DCU's "to
  failure" against Olympiatoppen's reps in reserve, DCU not counting
  other sport against the evidence for it. They are Martin's to decide.
- Web search ran out during the pass, so a number of sources are
  abstract-only or from search snippets and are listed under "Skal
  efterprøves" in the register. They must not reach code before a person
  has read them.

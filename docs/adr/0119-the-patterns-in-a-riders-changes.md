# ADR 0119: The patterns in a rider's changes

Status: accepted · Date: 2026-11-27 · Builds on 0117 (a session moved or skipped says why), 0026 (guardrails), 0043 (Planlæg ugen), 0097 (known pains)

## Context

ADR 0117 keeps every move and skip with its reason. Martin asked that
the information be used to see patterns and shape the plan to each
rider. A coach with a dozen riders does not read eight weeks of changes
rider by rider; Kadence should say what stands out, plainly, and leave
the decision to the coach.

## Decision

- **Rules, not a model.** `src/modules/training/change-patterns.ts`
  (pure) reads the last eight weeks of a rider's changes and names at
  most three patterns:
  - a weekday with 40 % or more of the changes, with the reason behind
    most of them;
  - one reason behind half or more;
  - sessions of two hours or more, in half or more;
  - strength sessions, in 60 % or more.

  Each needs at least three changes. What counts is the rider's own
  moves and skips, and a coach's made in the three days before the
  session. A coach planning weeks ahead is planning, not a sign. A skip
  taken back counts for nothing.

- **"Ændringer i planen" on the rider's page.** It shows how many
  sessions were moved and skipped, the reasons, the patterns as
  sentences, and the last six changes with the rider's words where the
  reader may read them. The sentences are said as a colleague would:
  what Kadence sees, and a possibility beside it.
- **A hint in "Planlæg ugen".** Under the chosen riders, each rider's
  patterns stand in one sentence, so the week can be laid around them.
- **Pain twice in a week is a warning.** Two or more sessions moved or
  skipped for "Ondt eller skade" in the last seven days put
  `changed_for_pain` on the coach's attention list, in the injury
  section of the coach guide. It is computed beside the guardrails
  (`src/modules/load/pain-change-flag.ts`) and can be marked afklaret
  like the others; a third one brings it back. Migration 0065 lets
  `flag_resolutions` hold it.
- **The AI's week draft for one rider is told the patterns,** as codes
  and counts ("Tuesday sessions are often moved or skipped, 3 of 4
  changes, mostly school"), and asked to lay the week around them where
  it can and say so in its note. Only where the team lets the AI read the
  riders' data, as for the rest of that draft; never the words beside a
  change. The group's week reads no rider's data and is unchanged. A
  skipped session is no longer among the "already planned" it is shown.
- **The demo** has a rider whose sessions on one weekday were skipped
  for school three weeks running.

## Consequences

- The thresholds are a judgement, not a study: three changes, 40–60 %
  shares, eight weeks. They are named constants and can move once a
  real winter has shown what is noise.
- The rider's page reads the changes once more per visit, and the
  planner once for all the team's riders; both are indexed on rider and
  day.
- The young riders' week-draft prompt changed with this, on purpose;
  `tests/ai/youth-unchanged` holds its new hash and says why.

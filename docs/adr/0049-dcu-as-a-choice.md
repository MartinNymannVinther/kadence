# ADR 0049: DCU's guidance as a choice, and the shape of a paradigm

Status: accepted · Date: 2026-10-03 · Amends ADR 0014

## Context

ADR 0014 made DCU's recommendations the default and put DCU's number
beside every plan. Martin asked that a coach can choose — and change at
any time — whether the team is guided by DCU's recommendations
(docs/plan-klubber-og-guides.md, section 4, approved 3 October 2026), and
that other training paradigms can later be chosen instead
(docs/research/traeningsparadigmer.md).

## Decision

- **The team chooses** (`team_settings.guidance`: `dcu-2025` or `none`),
  under Indstillinger → Holdet as a switch, "Guidet af DCU's
  anbefalinger". Any of the team's coaches changes it; everyone on the
  team plans and sees by the same choice. DCU stays the default.
- **A paradigm is a shape** (`src/modules/paradigms`): month hours for a
  class-year, the week's corridor, the longest ride. DCU 2025 is the first
  implementation and reads DCU's numbers where they live
  (`src/modules/dcu`). `paradigmFor(guidance)` gives the team's paradigm
  or null, and services read it with `teamParadigm(tx, orgId)` inside the
  transaction they already hold.
- **Without a paradigm:**
  - the attention list has no corridor flag and no longest-ride flag;
  - the season plan starts at nought hours with no notes, and DCU's
    column, the deviation, DCU's reference and "fill again from DCU" are
    left out;
  - the calendar's week shows no DCU range, and the strength line no
    DCU frequency;
  - the rider's weekly hours chart has no corridor;
  - a block's preview has no corridor;
  - the AI's week drafts are told the team sets its own hours, and
    "Byg med AI" leaves DCU's longest ride out.
- **What stays, whatever is chosen:** pain, wellbeing, sleep, the ramp
  from week to week and the spacing of strength sessions — Kadence's own
  defaults for young riders — and the classes' race rules (distances,
  gearing, stage days), which are DCU's rules, not its recommendations.
  DCU's strength programmes, its standard sessions in Rulle and the coach
  guide stay as content. A paradigm may add or tighten guardrails, never
  loosen these.

## Trade-offs accepted

- **One choice for the whole team.** Two coaches on one team see the
  same; a coach cannot try another model on one rider yet. A per-plan
  choice is the next step when a second paradigm arrives
  (`season_plans.basis` keeps the class-year either way).
- **Existing plans keep their hours.** Turning DCU off leaves a plan made
  from DCU's numbers as it is, only without DCU beside it; the coach
  changes the months. Turning it back on shows the deviation again.
- **A few DCU mentions remain as content:** the goal suggestion on a
  rider's activities, the strength note in the repeat dialog, and the
  phases' names in the season plan. They read as suggestions, not as a
  frame the week is measured against.
- **Paradigms other than DCU wait** for the permissions Martin asked for
  (BDR, SCF) and for "Lav intensitet først" (wave G).

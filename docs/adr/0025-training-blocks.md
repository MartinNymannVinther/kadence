# ADR 0025: Training blocks, previewed before they are applied

Status: accepted · Date: 2026-09-28 · Builds on 0014

## Context

A coach plans in blocks — four weeks of base, a three-week build — and
Kadence had them plan one session at a time: a template into one day for
one or more riders. TrainingPeaks sells this as "dynamic plans"; the
need is older than that.

## Decision

- Two team tables (drizzle/0012): `training_blocks` (name, weeks 1–12)
  and `training_block_items` (a template on a day). The team's, like its
  templates: everyone reads, coaches write; an item can only name a
  block and a template of its own team; every change audited.
- **Nothing reaches a calendar until the block is applied.** Applying
  goes through `scheduleTemplate`, session by session, so a strength
  programme keeps its numbering per rider and a group plan gets its
  group key. What is applied is ordinary planned sessions, changed and
  moved in the calendar as any other.
- **The preview first.** Before the press that applies, every rider's
  weeks are shown against DCU's corridor for those weeks, the ramp from
  the rider's last four weeks (and from the block's own earlier weeks),
  and the 48 hours between strength sessions — with the guardrails' own
  words. Shown, never enforced: a flagged block can still go in.

## Trade-offs accepted

- **No link back.** An applied session does not remember its block; a
  block changed later changes nothing already applied. Simpler, and
  true to what a calendar is.
- **No repeats within a block** — a session is placed on a day, once.
  A block of twelve weeks with four rides a week is 48 presses; a
  copy-week button is a later change.
- **A block is not a season plan.** DCU's hours stay the season's
  frame (ADR 0014); a block is how a coach fills a few weeks of it.

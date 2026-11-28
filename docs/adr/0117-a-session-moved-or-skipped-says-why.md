# ADR 0117: A session moved or skipped says why

Status: accepted · Date: 2026-11-09 · Builds on 0011 (who reads a rider's training), 0041 (series), 0060 (plan changes are told), 0081 (history follows the rider), 0095 (why a session went off plan)

## Context

A planned session that was not ridden stood red, "Ikke nået", whether the
rider was ill, had an exam, or simply did not go. Moving a session was a
drag or "Flyt" with nothing kept but the new day, and dropping one meant
deleting it, which left a trace for seven days and only for a reminder.
Martin asked for an easy way to move or drop a session, with a word on
why, kept so the patterns can be seen and the plan shaped to the rider.

## Decision

- **Flyt and Spring over, each with one tap on why.** The move dialog and
  a new skip dialog offer eight reasons — Syg, Ondt eller skade, Træt,
  Skole eller arbejde, Vejret, Tid, Rejse, Andet — and a short comment.
  Both may stay empty. They are in the session's menu in the calendar and
  on its page, and as buttons on the rider's Today for today and tomorrow.
  Dragging in the calendar moves as before, without asking: a coach
  rearranging weeks ahead is planning, and the change is still written
  down.
- **A skipped session stays.** `planned_sessions.skipped_at` and
  `skip_reason` keep it on its day, grey, with "Sprunget over: Syg". It
  counts in no planned hours — the calendar's week and month, the
  season's bars, the guardrails, the parents' week — is not copied into
  another week, gets no ride matched to it, is not offered in Rulle, and is
  taken off the rider's Garmin like a deleted one. "Fortryd" plans it
  again; moving it, or "Udført", does too. A done session is not skipped.
- **Every change is written down.** `session_changes` holds each move,
  skip and undo: the session, the days, what it was, the reason, who and
  in which role. Forced RLS: read by whoever reads the rider's training,
  written by whoever may change the rider's plan, always as themselves and
  in their own role (the policy checks both); no update, no delete; it
  follows the rider's history and goes with the rider or the workspace.
- **A parent reads the reason, not the words.** The comment is in
  `session_change_notes`, readable only by those who may change the
  rider's plan — the rider and the coaches — so the database itself keeps
  it from a parent.
- **The coach sees it under "Nyt fra rytterne"** on Overblik: a session
  the rider moved or skipped, with the reason and their words. No push.
- **The demo** has a session skipped for illness and one moved for school.

## Consequences

- The patterns now have something to stand on; the card that reads them,
  the hint in "Planlæg ugen", the attention point for pain, and the AI's
  use of them come in their own changes.
- A new place that adds up planned sessions must leave the skipped ones
  out. TypeScript helps where a colour is drawn ("skipped" is a colour of
  its own); a sum in SQL or code has to remember `skipped_at is null`.
- A coach's drag is written down without a reason, so the patterns must
  weigh a rider's own changes, and a coach's change close to the day,
  above a coach planning a month ahead.
- Reasons such as "Syg" and "Ondt eller skade" are health-near, and a
  parent who reads the child's training reads them: Martin chose that the
  reason is shared and the words are not.

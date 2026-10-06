# ADR 0058: Time and place on a session

Status: accepted · Date: 2026-10-06 · Builds on 0041, 0042, 0043 · docs/plan-fokus-vinter.md

## Context

A planned session had a day and nothing more. For the rides a club does
together — Tuesday's intervals, Saturday's long ride — the coach wrote
"17.30 fra klubhuset" into the description or sent it in the club's chat
group beside Kadence, and a rider opening today's session could not see
when to be where. The plan for the winter (docs/plan-fokus-vinter.md)
asks for time and place on a session, shown on the cards, on today's
page, to parents and in "Del ugen".

## Decision

- **Two optional columns** (drizzle/0026): `planned_sessions.start_time`
  (`time`, a wall-clock time in Copenhagen, no zone — the session's day
  already says which day) and `meeting_place` (text, at most 120
  characters, "" for none). A session ridden alone has neither.
- **Every way a session is made carries them**: "Tilføj pas" (from the
  library or built), the library's "Planlæg", a group plan, a series
  (ADR 0041), a session copied to another day or rider, "Kopiér ugen"
  (ADR 0042), the week planner's items (ADR 0043), and a block's items
  (ADR 0059). One small fieldset, "Tid og sted", sits in every form.
- **A change reaches as far as the rest of it**: "Kun dette pas", "Hele
  gruppen" or the series from this day on. A change that does not
  mention them — any caller that predates them — leaves them as they
  were; `null` and "" clear them.
- **Shown where a session is shown**, compactly as "17.30 · Klubhuset":
  the calendar's cards and the team grid's chips, the session itself,
  today's session card and the week at a glance (the rider's and each
  child's for a parent). Danish writes "17.30", English "17:30"
  (`src/modules/training/time-place.ts`, pure).
- **A day's sessions come in the order they start**; those without a time
  after them, in the order they had.
- **"Del ugen"**, in the team's week and a rider's week, gives the week as
  plain text for the club's SMS or chat group — through the phone's share
  sheet, or copied where there is none: the team, "Uge 41", and per day
  each session with its time, place, title and length. A session ridden
  together is one line with how many riders have it, and no rider is
  named in the team's week; a rider's own week names the rider once, at
  the top. Nothing about how anyone is or did — no check-ins, no rides,
  no flags (`src/modules/training/share-week.ts`, pure).
- **The export carries them**: it reads every column of the tables it
  lists, and a test proves these two are there.
- The demo's Tuesday intervals and Saturday ride meet at the clubhouse.

## Trade-offs accepted

- **Two more fields on every form.** "Tilføj pas", "Ret passet", the
  library's "Planlæg" and the planner's item each grew a fieldset most
  sessions leave empty. They sit together, say they may stay empty, and
  take one line on a desk; a form per kind of session would have been
  two forms to keep in step.
- **A place is free text.** No list of the club's places, no map, no
  address check: "Klubhuset" is what a club writes, and a list would be a
  table, settings and a picker for little gain this winter.
- **No end time and no duration of the meeting.** The session's own
  length says how long it is; an end time would be a second truth.
- **No zone on the time.** A session is in Copenhagen as its day is; a
  camp abroad says its local time in the place or the description.
- **"Del ugen" is text, not a link.** It leaves Kadence the moment it is
  shared, does not follow later changes, and anyone in the chat can read
  it; that is why it carries the plan and nothing about a rider. A
  shared, always-current page for a club's chat would be a public link
  into the team's data, past the database's separation of teams and
  riders.

# ADR 0095: Why a session went off its plan — an explanation that agrees with the colour, and a warm AI comment a person may save

Status: accepted · Date: 2026-10-12 · Amends ADR 0091 (a senior's profile stands beside the week also without a paradigm) · Builds on 0016 (load on one scale), 0017 (the AI reads riders' data only where allowed), 0018 (zones), 0034 (read-only AI routes), 0040 (four numbers), 0080 (a person alone), 0089 (AI with a price), 0091 (Motionist and Supermotionist)

## Context

On 12 October 2026 Martin sent a screenshot of a calendar week where a
session card carried the yellow mark "Afveg fra planen" and asked for a
way to see what the deviation is, and perhaps a comment written by the
AI, in a positive tone. The mark said that a session was off, never
why: the colour comes from `compliance()` (src/modules/load/compliance.ts),
which reads done ÷ planned by load when both sides have one and by
minutes otherwise, green at 80–120 %, yellow at 50–79 % or 121–150 %,
red beyond, and red for a past day with nothing done.

In the same screenshot the week's legend read "Motionist ingen
DCU-årgang" for an adult on the Motionist profile: in a team that plans
without a paradigm, ADR 0091 gave a senior no reference number at all,
and the legend fell through to the words for a youth rider with no class.

## Decision

- **A pure explanation** (`src/modules/load/deviation.ts`): from the
  planned side (minutes, load, structure) and the done side (moving
  minutes, load, time in zones) a heading — missed, shorter, longer,
  easier, harder — and a few facts with their numbers: time, load,
  intensity (the zone the session was built around, read the way
  intensity.ts reads a session's goal; minutes planned and ridden at it
  or above; the zone the ride was mostly in; the share of the ride in
  the plan's zones), "the plan had only a duration", and missed. A fact
  stands only where both sides have its number; nothing is guessed.
- **It agrees with the colour by construction.** The explanation calls
  `compliance()` for the colour and reads the very ratio the colour is
  read from (`complianceRatio`, now exported with the bands), so it can
  never weigh what the colour did not. A ride read by load is "shorter"
  only when its minutes were off the same way, otherwise "easier" or
  "harder". A test walks 1,152 combinations and checks that the
  measured fact gives back the colour and its sign the direction.
- **The mark explains itself.** On a yellow or red card in the calendar
  and on Today, the mark is a button (Base UI's popover, as the month
  jump: aria-expanded, Escape, focus) that opens the heading, two or
  three lines ("Planlagt 1 t 15 min. Kørt 42 min.") and, where the page
  knows the week, one neutral sentence from the four numbers ("Med
  resten af ugens pas ender ugen inden for DCU's ramme."). The calendar
  page hands the week to the cards through a small context, so the
  calendar's components changed only where the mark is drawn. In the
  session's panel the same words stand inline under the mark, with the
  ride's zones too. The words are du-form, plain and never blaming.
- **The AI comment is asked for, warm by instruction, saved only by a
  person.** "Få en kommentar fra AI'en" stands quietly in the panel of a
  session that was done — only with a model, for whoever may write on
  the rider's training (the coach, or the rider for their own), and only
  where the AI may read riders' data: the team's switch in a club, the
  person's own switch ("Må AI'en læse dine data") in a personal
  workspace, the rule the week draft follows. It goes through
  `/api/ai/session-comment` (ADR 0034) and `askForJson`, so the hourly
  and daily ceilings and the month's budget hold ("AI'en holder pause
  til næste måned. Alt andet virker."). The model reads the planned
  minutes, load and zones, the done minutes, load, time in zones and
  RPE, the deviation's facts, the rider's class or profile and the
  season's phase — never a name, a check-in, a note or a comment; the
  session's title is the only words a person wrote, fenced as data. The
  prompt asks a warm, encouraging coach for a youth rider in their class
  or for an adult motionist: two or three sentences, start with what went
  well, say kindly what differed, one optional suggestion; never weight,
  food or body; no medical advice; no exclamation marks; in the reader's
  language. The answer is stripped of markup, links, emoji and
  exclamation marks and capped at 400 characters, and shown as "Forslag
  fra AI'en". Only "Gem som kommentar" writes it, as an ordinary comment
  in the person's own name through the comments service. Comments carry
  no metadata, so the saved text starts "(AI) ".
- **A senior's profile stands beside the week also without a paradigm.**
  `volumeOf` reads a senior's profile hours when the team plans by none,
  so the legend says the profile's corridor ("Motionist 4,3–6,5 t" for a
  week in March, or October's break), never "ingen DCU-årgang". The profile is the adult's own choice and
  Kadence's numbers, not DCU's. A youth rider with no class, or in a team
  without a paradigm, keeps the DCU wording.

## Trade-offs accepted

- **The card's popover knows time and load, not zones.** The calendar's
  cards carry no time in zones; the panel shows the intensity line. Adding
  zones to every card would send every ride's zones to the browser for a
  line most cards never open.
- **"(AI) " is words, not a column.** A column would need a migration,
  the export and the audit for one marker; the prefix says the same to
  everybody who reads the thread, and the author is still the person who
  pressed.
- **The AI comment counts as a call.** A rider who asks for a comment on
  every ride spends the workspace's budget like any other AI feature;
  the button is quiet and asked for, never automatic.
- **ADR 0091 said a senior gets nothing without a paradigm.** That still
  holds for the season plan, which starts empty, and for the guardrails;
  only the week's reference number now shows the profile's hours, so the
  legend names a number instead of a missing DCU class.

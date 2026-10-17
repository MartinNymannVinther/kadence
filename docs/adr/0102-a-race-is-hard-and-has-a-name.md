# ADR 0102: A race is hard, and the AI knows its name

Status: accepted · Date: 2026-10-17 · Amends ADR 0101 (a week around a race) · Builds on 0080 (a person alone), 0091 (senior profiles), 0092 (weeks for a motionist)

## Context

With ADR 0101 in place, "Foreslå ugen" in a personal workspace on the
Motionist profile, in October, with a cyclocross race on the Saturday,
proposed easy rides around the race and wrote in its note that the race
counted as a light activity and the week held no hard sessions. The
person's question: why does the AI get no information about the race?

Two causes. October is the Motionist profile's free month (ADR 0091), and
the adult prompt says so: "a free month: short, easy rides and nothing
hard". The race-week rules said the race counts as the week's hard
session, and the model settled the conflict by calling the race easy.
And in a personal workspace the race reached the model as kind, dates and
priority only (ADR 0101), so "a race or event" on a Saturday could as
well be a gentle sportive as a cyclocross race ridden flat out.

## Decision

- **A race is hard whatever the month says.** The race-week rules, youth
  and adult, group and per rider, now say that a race is ridden hard
  whatever the season, phase or month says: in an easy or free month the
  training around it stays easy, and the race is still the week's hard
  effort. The model counts the race's riding time in the week's bike
  hours, and the note names the race as the week's hard effort.
- **A person's own race goes with its title.** In a personal workspace a
  race reaches the model with its title, "Crosscup, 3. afdeling" or
  "DM i linjeløb", the name of a public event that says what kind of race it
  is and roughly how long. The rules tell the model to read kind and
  length from the title. The person's other days still go as kind, dates
  and priority, and sick days not at all.
- **The planner's line says so.** "AI'en får timerne fra
  træningsprofilen, biblioteket, navn og dato på dine løb og datoerne for
  andre dage i kalenderen. Den får ikke andet om dig."

## Trade-offs accepted

- **A race's name goes to the model without the switch for riders' data.**
  ADR 0101 kept titles out so the group's week never needed the switch
  (ADR 0017). A race's name is a public event, typed by the person to
  plan around it, and the line beside the button says it goes. A name
  can still say where the person is on a day; that is the price of a
  proposal that knows a cross race from a sportive.
- **The model guesses a race's length from its name.** There is no
  discipline or duration on a calendar event. A structured field (road,
  cyclocross, mountain bike, track, sportive) would be surer and is left
  for a later change with a migration of its own.
- **The youth prompts changed again.** The pins in
  `tests/ai/youth-unchanged.test.ts` are retaken: a race is hard for a
  young rider too, whatever DCU's phase says about the weeks around it.

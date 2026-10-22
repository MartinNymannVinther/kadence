# ADR 0109: The form chart reads itself, and the AI tells the story of the form

Status: accepted · Date: 2026-10-22 · Amends ADR 0016 (load on one scale) · Builds on 0017 (the AI reads riders' data only where allowed), 0034 (read-only AI routes), 0080 (a person alone), 0089 (AI with a price), 0095 (a warm AI comment a person may save)

## Context

On 22 October 2026 Martin sent a screenshot of the form chart on his own
page and asked for two things: colours and graphics that make it easier
to tell what each thing means, and a prose explanation, written by the
AI, of what the curve says and what the system otherwise knows about his
training and development.

The chart had three lines in two colours. Kondition and træthed were
moss and clay, the same weight; friskhed, the difference, was drawn in
the same two colours — moss above zero, clay below — so the strip read as
a third drawing of the two lines it is made from. Its scale was a "+"
and a "−"; the legend named two of the three series and a grey dash for
"Efter planen" that the chart drew in moss and clay; the forecast's
friskhed was grey. The explainer's key for friskhed was a grey dot that
matched nothing on the chart. The readout was one line of three numbers.

Kadence had an AI comment on one session (ADR 0095) and the coach's
Monday brief (ADR 0017), but nothing that read the whole: the curve, the
weeks, the thresholds, the records and the goals together.

## Decision

- **Friskhed has a colour of its own.** The theme's third series, the
  blue made for rides laid over each other, draws the friskhed line and
  its dashed future. Above zero the strip is still tinted moss and below
  zero clay — that is the state, rested or tired — and the words stand
  at the strip's edge, "udhvilet" and "træt", where a phone's width
  allows. The strip grew from 56 to 80 px and got a scale: a signed
  number at the top, zero in the middle, the same number below. The
  three colours (`src/components/load/form-state.ts`) pass the dataviz
  validator's colour-blindness and contrast checks on both cards; the
  theme's low chroma, which the validator flags, is the family's look
  and stays (ADR 0024's tokens).
- **Kondition is heavy, træthed light.** Kondition is drawn 2.5 px with
  its area under it; træthed 1.75 px with none. The pair is told apart by
  weight as well as colour.
- **Three tiles are legend and readout at once.** Above the chart stand
  kondition, træthed and friskhed as tiles, each with its key drawn as
  the chart draws it — the area, the line, the line — the day's number,
  and for friskhed the word: udhvilet, lidt træt or træt, by the
  thresholds the parents' sentence already used (0 and −15). The date
  stands above; a day after today says "efter planen". The dashed key and
  the race marker keep a small legend beside the date. A screen reader
  hears the one sentence it heard before.
- **The future is a field.** From today to the end of the forecast the
  chart is shaded paper-grey, under the dashed lines, so what is ridden
  and what is planned part at a glance. The race line is ink, not clay,
  so it is never mistaken for træthed.
- **The AI tells the story, asked for, read only.** "Forklar formen med
  AI" (for the rider: "Forklar min form med AI") stands under the chart
  on the rider's own page and on the coach's rider page, with a model
  and only where the AI may read riders' data — the team's switch in a
  club, the person's own in a personal workspace — the rule the session
  comment follows. It goes through `/api/ai/form-story` (ADR 0034) and
  `askForJson` as kind `form_story`, so the ceilings and the month's
  budget hold. Nothing is saved; "Luk" lets it go (dogma five).
- **What the model reads is summarised, never raw.** Ninety days become
  five points (today, four and eight weeks ago, the peak of kondition,
  the lowest friskhed) and two counts (training days in 28, rest days in
  7); the weeks become the last eight with hours and sessions; the range
  this week when the month has one; the forecast's end and the race;
  the open attention points as kind, severity and values; the wellbeing
  zone and the count of yellow days, nothing more of the check-ins; the
  thresholds; the records at a minute, five, twenty and an hour, and the
  longest ride; the goals with their progress. No surname, no note, no
  comment, no check-in text. Goal and race titles are the only words a
  person wrote, capped at 60 characters, and the whole context sits
  inside one data fence. The rider's first name is given only when a
  coach reads the story, as the Monday brief does; the rider is written
  to as "du".
- **The story's rules are the comment's.** Three or four short
  paragraphs: what the curve shows and how the weeks got it there, where
  it heads if the plan is ridden, what the rest of the data says with one
  thing to be glad about, and one possibility for the coming week.
  Kadence's three words and never TrainingPeaks'; the curve's numbers,
  hours, watts and pulse may be quoted, a session's load never; nothing
  invented; missing data named as something to add, not a fault; no
  weight, food or body; no medical advice; a yellow or red zone means a
  conversation, never training through. The answer is sanitized to plain
  paragraphs — no markup, lists, links, emoji or exclamation marks — and
  capped at 1,800 characters at a paragraph boundary.

## Trade-offs accepted

- **A third colour on a two-colour chart.** The theme's chart pair was
  moss and clay; the blue makes the chart three-coloured. It is the
  theme's own third series, used nowhere else on the page, and the
  difference between two lines deserves not to look like either.
- **The tints keep the old colours.** Moss above zero and clay below
  could still be read as kondition and træthed. The words at the edge
  and the blue line say otherwise; a neutral tint would have lost
  "above zero is good" at a glance.
- **The story costs a model call each time.** It is asked for by a
  press, counted, and never kept, so a rider who reads it every morning
  pays a call every morning. Caching a story would show yesterday's
  words over today's curve.
- **The model sees the open attention points and the wellbeing zone.**
  They are the same flags the coach's brief already reads, and the story
  is asked for by the rider or their coach, never a parent; the prompt
  forbids diagnosis and tells the model to suggest a conversation.
- **One prose, two readers.** The coach reads a story about the rider,
  the rider a story to themselves; they are the same prompt with a
  different first line, so a coach and a rider reading side by side get
  the same facts in two voices.

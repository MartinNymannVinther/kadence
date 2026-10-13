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

## Amendment, 12/13 October 2026: numbers replaced by words after Martin's reading

Martin opened the popover on a ride of his own and read "Hårdere end
planlagt / Belastning 84 mod planlagt 53. / Planlagt 1 t 15 min. Kørt 41
min." and asked how it is counted: nobody understands load numbers or
where they come from, so either explain them better and more
motivatingly, or replace them. His FTP is 200 W; 41 minutes at load 84
is about 111 % of FTP, which says more about an FTP set too low than
about the ride.

- **Words instead of load numbers.** The popover and the panel no
  longer show a load number or the word "belastning". The facts keep
  their numbers (the agreement with the colour is unchanged and still
  tested), and a `story` beside them (`src/modules/load/deviation-story.ts`)
  tells the same deviation in words: what the plan was ("en rolig tur",
  "et pas om tærsklen", "et intervalpas", from the zones it was built
  around, its load per hour, or "rolig" when it had only minutes); how
  the ride went, with the average share of FTP by power or of threshold
  pulse by heart rate, "og det føltes …" by RPE, or only the time; and
  the whole, "Samlet var turen omkring 60 % hårdere for kroppen end
  planlagt, selvom den var kortere", the colour's own ratio rounded to
  tens ("omkring 2,5 gange så hård" from about twice, at most "90 %
  lettere"). "selvom" or "og" follows the minutes against the same
  green band. The headings are "Mere gas end planlagt", "Roligere end
  planlagt", "Kortere …", "Længere …"; missed stays plain.
- **The intensity is read back from the load.** The ride row keeps the
  load and the moving time it was computed from, not the share of
  threshold, so intensity = √(load ÷ (hours × 100)) — the number
  `activity-load.ts` used, with the thresholds the rider had when the
  ride came in, and in agreement with the colour. Today's thresholds are
  not used; they may have changed since. Only the load's rounding to
  whole units is lost. The effort word ("en del hårdere", "lidt
  roligere") compares the ride's load per hour with the plan's, and
  never points against a heading of harder or easier.
- **A hint, not a verdict, about the threshold.** By power, 20 minutes or
  more averaging over 105 % of FTP (two decimals, as the load model
  rounds it); by heart rate, a load at the 1.05 cap: "Føltes turen ikke
  så hård? Så er din FTP (tærskelpuls) måske sat for lavt." with
  "Foreslå tærskler ud fra dine ture" to `/settings/me?forslag=1#thresholds`,
  or the rider's page with the same anchor for a coach. A parent, who
  cannot change thresholds, gets no hint.
- **Who reads.** The rider reads "Du kørte … din FTP"; anybody else
  "Rytteren kørte … sin FTP". The calendar's rider week and the rider's
  Today pass the viewer through a small context; the panel knows it.
- **"Sådan er det regnet"**, a closed `<details>` in the session's panel,
  is now the only place the numbers stand: what load is in two sentences
  ("En time præcis på FTP tæller 100.") and "Denne tur: 84. Planen: 53."
- **The AI comment** still reads the load numbers, which the model needs,
  and now also the words-to-be; its instruction says never to quote a
  load number or talk about load to the reader, and to speak in time and
  effort.

Trade-offs accepted: a share of threshold rounded from a whole-unit load
can be a point off on a short ride, so the heart-rate cap is tested in
load units, not as a ratio; and "omkring 60 %" hides the difference
between 55 and 64 %, which is the point.

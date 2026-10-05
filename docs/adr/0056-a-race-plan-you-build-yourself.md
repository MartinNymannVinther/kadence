# ADR 0056: A race plan you build yourself, and a rider who shows how it goes

Status: accepted · Date: 2026-10-05 · Amends ADR 0047 (the energy calculator answers first)

## Context

The energy calculator (ADR 0047) asked for the race, the effort and the
bottles in number fields and answered with the plan: so many bottles,
so many pieces of food, so many grams an hour. Martin asked for it to be
more visual, more colourful and more interactive (5 October 2026): the
rider drags energy bars and bottles into a plan of their own rather than
being handed the answer, and a rider on a bike looks different depending
on how well the plan works. The numbers stay the ones in
docs/research/ernaering.md, sections 2 and 4.

## Decision

- **The plan is built, not given.** The race is set on two sliders —
  half an hour to six hours in quarters, −5 to 40 °C — and the gut
  question on two buttons. Under them a pantry of eight coloured cards
  (water, salted water, sports drink about 6 %, the 8 % bottle, rice
  cake, gel, banana, oat bar), each with what it holds for a 500 or
  750 ml bottle, and one column for each hour of the race to drop them
  in. The goal for an hour is said above the pantry: the same
  carbohydrate and fluid ranges the calculator has always used
  (`carbsPerHour`, `fluidPerHour`).
- **Drag with any pointer, or choose and place.** Dragging uses pointer
  events and no library: a mouse drags as soon as it moves, a finger
  after holding still for a fifth of a second, so a swipe still scrolls
  the page; the page scrolls along at the screen's edge. Every drag has a
  keyboard and tap equivalent: press a card to choose it, then "Læg her"
  in an hour; press a chip in an hour to take it out. Each change is
  announced to a screen reader.
- **Checked hour by hour from the start** (`checkPlan` in
  `src/modules/calc/fuel-check.ts`). At the end of each hour the
  carbohydrate and fluid eaten and drunk so far are held against the
  range from the start to that hour, so a short first hour can be caught
  up in the second. Under 75 minutes no carbohydrate is asked for. One
  hour's carbohydrate above the stomach's limit — 60 g without practice,
  90 g with, as before — is "for meget", and more than 1.5 l in one hour
  is more than the gut takes up (Team Danmark).
- **Slack for whole pieces, said to be Kadence's.** Food comes in whole
  pieces and bottles are seldom drunk to the last sip, so an hour is on
  target within 15 g of carbohydrate and half a bottle of fluid of the
  range so far, and the stomach's limit gets 10 g. Without slack a race
  over 2.5 hours without practice, whose range is exactly 60 g, could be
  hit by nothing in the pantry.
- **A rider on a road who shows it.** A cartoon rider rides a road from
  start to finish with a post at each hour, and takes one of six looks
  from the hour: riding well, hungry (a half battery), "sukkerkold" two
  hours short in a row (slumped, grey, an empty battery), thirsty (an
  open mouth, sweat, red cheeks in heat), a stomach ache (green, a
  swirl), sloshing (waves). With every hour on target the rider crosses
  the line with both arms in the air and confetti. "Kør løbet" plays the
  race in a few seconds, the look changing hour by hour and the cranks
  slower when it goes badly; nothing moves until asked. A line under the
  road says the look in words, every hour's carbohydrate and fluid is
  written with a word and an icon, and a list says hour by hour what is
  short or too much and what would fit — the drawing is never the only
  way to read the plan. The caption says plainly that the rider is a
  drawing of how the plan meets the recommendations, not a measurement.
- **Notes for the whole race.** Salt in races over two hours or in heat
  (the low end of the fluid range at 500 mg a litre), the 8 % bottle in
  heat (Team Danmark: sports drink for the fluid, the rest as food), rice
  cakes after two hours in a pocket — one from 25 °C — (USDA's rule of
  thumb, Kadence's reading in ernaering.md 2.8), the oat bar's fat and
  fibre in the finale (Thomas 2016), more bottles than two cages, and the
  calculator's own warnings about practice and glucose with fructose.
- **The answer is a button away.** "Vis Kadences forslag" lays Kadence's
  own plan on the board (`suggestPlan`): as many bottles as the
  calculator always counted, spread over the hours, all sports drink or
  — above 60 g an hour and below 25 °C — all 8 %, then hour by hour
  water or salted water in some of them and rice cakes, or gels once rice
  cakes no longer keep, chosen to land nearest the middle of the range.
  A test holds it on target, without a flaw, for every duration,
  temperature, gut and bottle size the calculator takes. The rider's own
  plan is kept aside and comes back with "Tilbage til min plan".
- **What the race costs stays, below.** The effort by one of the four
  ways, the weight and the hours before the start sit in a card of their
  own under the plan, with the energy, how much of it the rider's own
  plan covers, the sweat a rider may lose and the meals before and after.
  Nothing is stored or sent; the weight still never leaves the page.

## Trade-offs accepted

- **A game is easier to misread than a table.** A happy rider may be
  read as a promise. The caption and "Om beregningen" say that the rider
  is an illustration of the recommendations, and the looks are Kadence's
  own; the same ranges and limits apply as before.
- **The slack is a choice.** 15 g, half a bottle and 10 g over the
  stomach's limit are Kadence's, picked so that whole pieces and whole
  bottles can hit the ranges. The page says so.
- **The hour is the unit.** Within an hour the order and timing of what
  is eaten are not checked, and a short last hour is drawn at least half
  as wide as a whole one so there is room to drop in it. Sources give no
  fixed rhythm (Morton 2026), so finer timing would be invented.
- **Fewer choices in the pantry than in the old fields.** Grams per piece
  could be typed; now the pantry has a rice cake of 32 g, an oat bar of
  33 g, a gel and a banana of 25 g, and the bottle's strength is a card.
  Sodium in gels differs between brands and is not counted.
- **Drawing costs a little.** A small SVG redrawn each frame for a few
  seconds, only on request, and a ghost that follows the pointer while
  dragging. No new dependency.

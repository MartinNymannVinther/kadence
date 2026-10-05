# ADR 0056: Energy advice for the day — a timeline for a class, instead of a calculator that asks for a weight

Status: accepted · Date: 2026-10-05 · Amends ADR 0047 (the energy calculator answers in number fields and asks for a weight)

## Context

The energy calculator (ADR 0047) asked for the race, the effort, the
bottles and an optional weight, and answered with a plan. On 5 October
2026 Martin asked for something more visual. Two versions were built and
dropped the same day: a plan the rider drags together with a cartoon
rider who shows how it goes, and then a whole day the rider builds —
meals before, the hours on the bike, meals after — measured against what
the body uses. Martin settled on something simpler: general advice for
the day, such as drinking enough the day before, plenty of carbohydrate
the evening before with good examples, and a meal a few hours before such
as rice with honey, checked against the general recommendations of DCU
and Team Danmark. He also asked that no one types a weight — "vægt, som
vi ikke er så glade for generelt" — but chooses class and sex, and that
"hårdt" becomes "hård træning" in what comes next.

DCU has no nutrition guidance of its own (docs/research/traenermateriale.md,
A6: DCU wants to formalise nutrition education). Team Danmark's "Kost og
elitesport" (2026) and its ATK 2.0 (nutrition chapter 2025) are the
Danish sources DCU leans on.

## Decision

- **What the day is**, at the top: race or training (easy, tempo,
  intervals), class (U15, U17, U19, U23) and sex, duration and
  temperature, whether the stomach is used to much carbohydrate, and what
  comes next — rest or an easy day, hard training or a race tomorrow,
  hard training or a race within 8 hours.
- **A class instead of a weight** (`src/modules/calc/reference-rider.ts`):
  the mean of the class's years in NNR 2023 (Table 7, 13–17 years; Table
  10, Denmark 18–24, BMI 23). Never shown; the page speaks of "en typisk
  U17-dreng" and suggests the class above or below for a rider big or
  small for their age.
- **Advice as a timeline**, each step with its goal for the class in
  grams and litres and examples of ordinary food:
  - _The day before_: drink at least 1½ l, urine pale yellow and clear;
    plenty of carbohydrate so the stores are full (Team Danmark); the
    Elite plate for dinner with three dinners; before a race DCU's short
    ride to open the legs, 1 hour with 1×5 min at AT or 1×3 min all out
    (U17 and U19 compendia).
  - _Before the start_: a main meal 3–4 hours before and a light snack
    1–2 hours before, ½–1 l to drink (Team Danmark). Together about 1 g/kg
    for each hour from the main meal (Thomas 2016, Kadence's reading).
    Examples: rice with honey, white bread with honey and juice, pasta
    with chicken, oats with milk and a banana; a banana, bread with honey,
    skyr with banana for the snack.
  - _On the bike_: the hour's goal as before (the race's table; easy
    training less), how to drink and eat, one example hour by hour from
    `suggestPlan` with homemade sports drink, salted water, rice cakes and
    bananas, the recipe for the drink, and for a race a two-bar picture of
    what a race in a bunch uses (MET, Compendium 2024) beside what the
    stomach can take.
  - _After_: 1–1.2 g/kg of carbohydrate, 0.25–0.3 g/kg of protein and
    ½–1 l straight after, with examples such as chocolate milk and a
    banana; within 8 hours of the next hard session, carbohydrate every
    hour for four hours; then the main meal on the Elite or Y-plate.
- **Ordinary food only.** Team Danmark's ATK does not recommend sports
  products for children and young people and advises against energy
  drinks with caffeine; the gel and the oat bar leave the calculator, and
  the page says so.
- **The examples' numbers** come from their portions in
  `src/modules/calc/fuel-items.ts` — the Danish Food Composition Database
  6.1 (DTU, May 2026, CC BY 4.0) — so none is typed in by hand
  (`src/modules/calc/fuel-examples.ts`).
- **Removed**: dragging, the pantry, the plan's slots and checks of meals
  typed by the rider, the effort fields and the chart of a rider's own
  plan. The two earlier versions live in this pull request's history.

## Trade-offs accepted

- **Advice, not a calculation of one rider.** The amounts are for a
  typical rider in the class; a rider who eats differently is told to take
  more or less by hunger and experience.
- **A typical rider is not this rider.** NNR's reference weights come from
  height at a healthy BMI, not from cyclists, and children of one age can
  differ by a factor of two. The class above or below is the way round it.
- **Recovery for tomorrow stays in the windows.** Without daily grams the
  difference between a race and hard training tomorrow is small. Daily
  grams per kilo are health advice about minors that ADR 0047 keeps for
  a dietitian.
- **The energy picture is rough.** A race in a bunch is 12 MET for every
  rider; it is there to show the proportion, not to count a rider's
  calories, and is shown only for races.
- **DCU is thin on food.** Most of the advice is Team Danmark's; DCU's own
  part is the ride the day before and the recovery meal in its strength
  programmes.

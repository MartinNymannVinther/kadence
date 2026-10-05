# ADR 0056: Energy for a day you build yourself — before, on the bike and after, for a class instead of a weight

Status: accepted · Date: 2026-10-05 · Amends ADR 0047 (the energy calculator answers first, and asks for a weight)

## Context

The energy calculator (ADR 0047) asked for the race, the effort, the
bottles and an optional weight in number fields, and answered with the
plan. Martin asked for it to be more visual and interactive (5 October
2026): the rider drags bottles and food into a plan of their own rather
than being handed the answer. A first version had a cartoon rider on a
road who looked hungry, thirsty or happy hour by hour; Martin dropped it
the same day and asked instead that

- the meal before and the food after can be built the same way,
- what comes next — a race or training tomorrow — changes what is eaten,
- the calculator covers training as well as racing,
- a chart shows, as plainly as possible, how the plan meets what the body
  is expected to use and what it is possible to take in, and
- no one types a weight: "vægt, som vi ikke er så glade for generelt".
  The rider picks a class and sex, and a big rider picks the class above.

Martin also chose (the same day) to keep to the windows around the
session — no grams for a whole day, which ADR 0047 keeps for a
dietitian — and to leave weight out entirely.

## Decision

- **What the day is.** Race or training (easy, tempo, intervals), the
  class (U15, U17, U19, U23) and sex, the duration and temperature on
  sliders, whether the stomach is used to much carbohydrate, and what
  comes next: rest or an easy day, hard or a race tomorrow, or hard again
  within 8 hours.
- **A class instead of a weight** (`src/modules/calc/reference-rider.ts`).
  Each class and sex has a reference weight, the mean of its years in the
  Nordic Nutrition Recommendations 2023 (Table 7, 13–17 years; Table 10,
  Denmark 18–24, at BMI 23; doi 10.29219/fnr.v67.10233). It is never
  shown; the page speaks of "en typisk U17-dreng" and says to choose the
  class above or below for a rider big or small for their age. The same
  reference gives the heart rate and MET estimates their weight, age and
  sex.
- **Three phases you drop things into**, under a pantry that stays at
  the top of the screen with two shelves: meals (16 everyday foods) and
  on the bike (the four bottles, rice cake, gel, banana, oat bar).
  - _Before_: a main meal 2–4 hours before (a stepper) and a snack about
    an hour before, together against about 1 g/kg for each hour from the
    main meal (Thomas 2016: 1–4 g/kg, 1–4 h before), ½ g either way, and
    5–10 ml/kg to drink. Fibre or fat in the snack is said (Team
    Danmark).
  - _On the bike_: one slot an hour, as in the first version, against
    the race's table; for training an easy ride asks 0–30 g/h up to two
    hours and 30–60 g/h beyond (Jeukendrup 2014's figures adjusted
    downwards for low intensity), tempo and intervals the race's.
  - _After_: straight away 1–1.2 g/kg of carbohydrate, 0.25–0.3 g/kg of
    protein and ½–1 l; with another hard session within 8 hours four
    hours of 1–1.2 g/kg (Thomas 2016; Team Danmark). The sweat not drunk
    back is given in litres with 125–150 % to drink. The main meal 1–2
    hours after is Team Danmark's Elite plate after 1½ hours hard — and,
    Kadence's reading, before a hard day — or the Y-plate otherwise.
- **The meals' numbers** (`src/modules/calc/fuel-items.ts`) are the
  Danish Food Composition Database 6.1 (DTU, May 2026, CC BY 4.0), per
  100 g with the food id beside each. Portions are Team Danmark's where
  its list of foods with 50 g carbohydrate gives one, Kadence's
  otherwise; the database itself was read from DTU's published dataset,
  not its web API.
- **The chart: an hour on the bike.** Side by side on one scale, what
  the body uses (kcal from the effort), what the stomach can take (60 or
  90 g), what is recommended and what the plan gives; and for fluid, the
  sweat, what the gut takes up (1–1.5 l), what is recommended and the
  plan. Under it in words: even with a full stomach carbohydrate covers
  only about a third of what the body uses, the rest comes from the
  stores, and that is why the meals before and after count. Each meal
  has bars against its goals — a pale band for the goal, the plan filled
  in, a word and an icon for short, on target or over.
- **Slack, said to be Kadence's.** Food comes in whole portions: an hour
  on the bike is on target within 15 g and half a bottle, a meal within
  15 g of carbohydrate, 5 g of protein and ¼ l; the stomach's limit gets
  10 g.
- **The answer is a button away.** "Vis Kadences forslag" lays a whole
  day on the board (`src/modules/calc/meal-suggest.ts`): the hours on the
  bike as before, a banana as the snack, and meals picked from bread,
  honey, rice, pasta, juice, milk, chocolate milk, skyr and water nearest
  the middle of each goal, one kind of starch to a meal and nothing
  fibre-rich before the start. Tests hold it on target for every class,
  sex, meal time, what comes next and bottle size, and the hours on the
  bike for every duration, temperature and training intensity.
- **No rider drawing, no animation.** The cartoon rider, the road and
  the playback are gone; drag and drop with mouse, pen and finger and the
  tap-to-place path for keyboard and screen readers stay.

## Trade-offs accepted

- **A typical rider is not this rider.** The goals before and after are
  for the class's reference weight, which can be far from a given
  teenager's (NNR: children of one age differ by a factor of two). The
  page says so and offers the class above or below; Martin preferred
  that to a weight field.
- **The reference weights are a healthy-weight reference, not cyclists.**
  NNR's weights are set from height at a healthy BMI; lean riders may
  weigh less. For the window around one session the difference is a few
  grams of carbohydrate.
- **Recovery for tomorrow stays in the windows.** Without a daily total
  the difference between a race and hard training tomorrow is small —
  both are hard days with the Elite plate. Daily grams per kilo would
  make it larger but are health advice about minors that waits for a
  dietitian (ADR 0047).
- **Portions are choices.** 250 g of pasta, 150 g of skyr or a 55 g egg
  are Kadence's portions where Team Danmark gives none; the page says
  so in "Om beregningen".
- **The sticky pantry scrolls sideways.** Sixteen meals in one row keep
  it small enough to sit over the plan; on a computer arrows page
  through it.
- **Drawing costs a little.** Bars and icons only; no new dependency.

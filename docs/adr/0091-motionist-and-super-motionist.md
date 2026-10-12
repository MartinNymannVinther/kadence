# ADR 0091: Motionist and Supermotionist — a training profile for an adult, Kadence's own numbers where DCU has none

Status: accepted · Date: 2026-10-12 · Amended by ADR 0092 (Kadence's sessions, programmes and weeks for the profiles; the team's plans, the group's AI week, the builder and a strength series read the profile) and ADR 0095 (the week's reference shows the profile's hours also where the team plans without a paradigm, never "ingen DCU-årgang") · Builds on 0014 (DCU as the default), 0040 (four numbers against the season plan), 0049 (DCU as a choice, the paradigm), 0053 (low intensity first), 0054 (every feature in the demo), 0080 (a person alone) · docs/research/senior-motionister.md

## Context

Kadence is built for U17, U19 and U23 and their coaches, and plans from
Cycling Denmark's (DCU) 2025 hours. DCU gives no hours past U23. Since
ADR 0080 a person can use Kadence alone, and on 12 October 2026 Martin
asked that an adult — a parent, say — can use it for their own training
too. Until now such a rider was "senior": the season plan said DCU has no
hours for the class and asked the person to pick a youth class-year to
start from, the week had no corridor, and the attention list had no
longest ride. That is a poor start for an adult who opens Kadence on
their own.

Youth riders stay the focus. Nothing may change for U17–U23.

## Decision

- **A training profile on the rider.** `riders.training_profile` is
  null, `'motionist'` or `'super-motionist'` (drizzle/0054, checked). It
  is read only while the rider's class in the season is senior — born
  after U23, or moved to senior by a coach — and is kept, unread, if a
  coach moves the rider back. Null is the default, **motionist**, so an
  adult alone has a plan at once; the card says it is a default.
- **Who sets it.** A coach on the rider's page, and the rider on Mig, as
  with thresholds (`setTrainingProfile`, src/modules/team/training-profile.ts).
  The riders guard (drizzle/0018) names the columns a rider may not
  change; this one is not among them, so the database lets the rider set
  it and still nothing else. A parent and another rider may not. RLS is
  unchanged. The card is shown for a senior only, with two sentences per
  profile: Motionist "omkring 5 timer om ugen, mest rolige ture, et par
  hårde pas", Supermotionist "omkring 10 timer om ugen, bygget op mod
  sommerens løb og lange ture".
- **Kadence's own numbers, with their sources, in one pure module**
  (src/modules/paradigms/senior.ts — not src/modules/dcu, which is
  DCU's): the hours November to September, about 280 h a year for a
  motionist and 520 h for a supermotionist, shaped as DCU's season;
  October free, as in DCU's; the week's corridor made as DCU's, ±20 %; the
  longest ride, 3 h or 90 km and 5 h or 150 km; strength twice a week
  November–February (motionist) or November–March (supermotionist), once
  a week after. The floor is WHO 2020 (150–300 minutes moderate a week,
  strength on two days) and Sundhedsstyrelsen; the ceiling NCF 2014's
  700–1,100 h for the best seniors, which the supermotionist stays well
  under; the mix is "Lav intensitet først" (ADR 0053). The research note
  says, in Danish, how the tables follow.
- **Through the paradigm.** A plan's basis is `PlanBasis = ClassBasis |
SeniorBasis` ("U19-1" or "senior-motionist"); DCU's own functions keep
  `ClassBasis`. `riderClass()` gives a senior the profile's basis.
  `DCU_2025` answers `monthHours`, `weeklyCorridor`, `longestRide` and a
  new `strengthFrequency` for a senior basis from senior.ts, because DCU
  has no senior numbers and a team that plans by DCU should have
  something for its adults; with guidance `none` a senior gets nothing,
  like everybody. `season_plans.basis` gets a check with the ten values.
  The season plan, the calendar's corridor and strength line, the weekly
  chart, the attention list, a block's preview and the AI's week draft
  all read through it. "Opret sæsonplaner for alle" leaves a senior to
  their own page, as it did, where the profile is chosen first.
- **The words say whose.** Where DCU's number stands beside a plan, a
  senior's shows the profile's, and the words name the profile, never
  DCU: one `ref` argument ("dcu", "motionist", "supermotionist") selects
  the word in each message, so U17–U23 read word for word as before. A
  senior's corridor and longest-ride flags carry their `ref`. DCU's month
  notes and its year wheel's intensity line are left out of a senior's
  plan; the season page explains the profile instead of DCU's sources.
- **The youth rules stay youth rules.** DCU's race rules (distances,
  gearing, stage days), the sleep minimum for 14–17-year-olds and DCU's
  winter strength goal never apply to a senior. Pain, wellbeing, sleep,
  the week-to-week ramp and strength spacing apply to everyone.
- **A demo.** `/demo?alene=voksen` opens an adult alone: Lars Holm, born
  1984, Supermotionist, a plan from the profile and six weeks of
  training, as `/demo?alene=1` does for a U19 rider (ADR 0054). The front
  page is left as it is: no new button and no new sentence, so the youth
  remain what it shows.

## Trade-offs accepted

- **The numbers are judgement, not a federation's.** No body publishes
  hours for an adult who rides for fun; the yearly totals, the split over
  the months, the longest rides and the strength rhythm are Kadence's,
  anchored in WHO, Sundhedsstyrelsen and NCF and said to be Kadence's in
  the code, the research note and on the season page. A coach or rider
  who wants other numbers changes the plan, and the deviation stands
  beside it.
- **One profile, not a questionnaire.** Two choices cover a parent who
  rides a few hours and one who trains for summer's long rides and
  sportives. Age, history, goals and time are not asked; the plan is the
  place to adjust.
- **No senior strength programmes of their own.** DCU's U23 programme is
  in the library as content; the research note says it was written for
  national-team riders and that an adult starts light. Programmes of our
  own for adults would be a feature of their own.
- **The paradigm mixes two owners.** `DCU_2025` now answers for seniors
  with Kadence's numbers. The alternative, a second paradigm a team picks
  for its adults, would ask a club to choose twice; the cost is that
  "DCU" in the code covers numbers DCU did not write, which is why they
  live in senior.ts and every word on screen names the profile.
- **Left as it was.** The group's AI week reads DCU's class-years only; a
  senior is not offered to it, and the week planner groups riders by
  DCU's classes, not profiles. A repeated strength session's hint keeps
  DCU's two or three a week. Moving a rider's history to another
  workspace (ADR 0081) does not carry the profile; the rider chooses it
  again, or plans as a motionist.

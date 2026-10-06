# ADR 0062: The team's week is where a coach sees who needs a talk

Status: accepted · Date: 2026-10-06 · Builds on 0017, 0026, 0040, 0049, 0053 · Amends 0040's names

## Context

The review of `main` on 5 October 2026 (docs/plan-fokus-vinter.md) found
the coach's signals in one place and the coach's week in another. Today
carried the attention list ("Mulige opmærksomhedspunkter"), the AI's
summary and the coach's tips above the day's sessions, so a coach's
front page was long; the calendar's "Hele holdet" showed every session
but none of the flags, so the coach who saw a rider's pain on Today had
to find the rider's week by hand. On a phone the team's grid was 856 px
wide and scrolled two and a half screens sideways.

The same review found six names for the guardrails' output ("Værnene",
"advarslerne", "Kadences advarsler", "Opmærksomhedspunkter", "DCU's
rammer", "Mandagsoverblikket") and the season's four numbers named
"Mål · Planlagt · Udført · DCU", where "mål" also meant the rider's
process goals.

## Decision

- **The signals live with the team's week.** The calendar's team view
  for the week in progress shows each rider's open flags as small
  badges under the name: one per kind, the most serious first, three at
  most and the rest counted, each in its severity's tint with its own
  icon and a short word (`insight.badge`). The badges are one link down
  to the rider's entry in the attention list under the grid. Below the
  grid follow the attention list (anchor `#opmaerksomhed`, which Today
  links to), "Skriv et resumé" and "Råd til træneren" — the same
  components and data as before (`getInsights`, `CoachBrief`,
  `teamTips`), read only for a coach and only what the insight service
  already returns under RLS.
- **Every flag leads to its week.** Each flag in the attention list, in
  the trace of what is afklaret and on the rider's page carries "Se
  ugen", the rider's own calendar for the week the flag is about
  (`/calendar?week=<monday>&rider=<id>`).
- **The flags belong to the week in progress.** A resolution lasts a
  week (ADR 0026), the summary and "Afklaret" act on today, and the
  ramp and the corridor count the open planned sessions from today. So
  the badges and the list appear when the week shown is this week; in
  another week the section says that the points follow the week in
  progress and links back to it.
- **One card per rider on a phone.** Below `md` the grid gives way to a
  card per rider: the name (to the rider's week) with the badges beside
  it, the seven days as compact chips — the day's letter, the sport, how
  it went as tint and icon, and the day in words for a screen reader —
  the rider's events, and the season's bar. A chip with one session
  opens its panel; with several, the rider's week. From `md` up the grid
  is as before, with the names' column wide enough for the badges.
- **Season plans for the whole team.** On the season's "Hele holdet",
  "Opret sæsonplaner for alle uden en plan" gives every rider without a
  plan for this season one for their own class and year, from DCU or
  empty as the team plans (ADR 0049). A plan that exists is untouched; a
  rider outside DCU's classes is left for their own page, where the
  class is chosen. Coaches only, one transaction, counted in the answer.
- **One choice for the training basis.** Under Indstillinger → Holdet,
  "Træningsgrundlag" has one primary switch, "Følg DCU's anbefalinger
  (timer og faser)", and "Lav intensitet først" set in beneath it as the
  profile that lies on top of either answer, each with one sentence. The
  columns and the services are unchanged (ADR 0049, 0053). The club
  championship's switch shows only where the installation has it on
  (ADR 0057).
- **One name, and four numbers renamed.** The guardrails' output is
  "opmærksomhedspunkter" everywhere in the interface; "DCU's ramme"
  stays where it means DCU's hours range. ADR 0040's numbers are now
  **Sæsonplan · Lagt ind · Kørt · DCU** (English: Season plan ·
  Scheduled · Ridden · DCU), in that order on every bar and in every
  sentence, so "mål" is left for the rider's own goals.

## Trade-offs accepted

- **Today is lighter, and the list is one tap away.** A coach no longer
  reads the flags on the front page; Today says how many riders have
  something worth a look and links to `/calendar#opmaerksomhed`. A coach
  who opens Kadence for the day's sessions sees the count, and the
  sentences one tap later.
- **No flags for a week gone by.** Showing last week's flags would mean
  computing them as of that Sunday, without the resolutions the coach
  pressed then and with check-ins from after it. The week shown says
  where the points are instead of showing numbers that were never seen.
- **The calendar reads more.** The team view for this week now reads
  the insight (its 210 days of rides and check-ins) as Today did. Other
  weeks do not, so moving through the season stays as quick as before.
- **The badges are words, not sentences.** "Smerte", "Kort søvn" and
  "Over DCU's ramme" are enough to see who to look at; what the numbers
  are and what ATK or DCU advise is in the list, one link away.
- **Both layouts are in the page.** The grid and the cards are rendered
  together and one is hidden by width, so a phone does not wait for
  JavaScript to decide; the page carries the week twice.
- **A plan for the whole team is the rider's class, not a choice.** The
  team button uses each rider's class from the birth year or the
  coach's override; a rider who should plan from another class-year is
  changed afterwards with "Fyld ud igen fra DCU".

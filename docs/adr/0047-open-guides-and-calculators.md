# ADR 0047: Open guides and calculators, without an account

Status: accepted · Date: 2026-10-03 · Amended by ADR 0055 (one suggested build instead of a neutral list of products), ADR 0056 (energy advice for the day, for a class instead of a weight), ADR 0057 (the energy calculator and the food guide behind flags; on by default, "off" parks them) and ADR 0061 (the hub left the signed-in menu; Hjælp links to it)

## Context

Martin asked for knowledge about the sport for parents — the classes and
the unwritten way onto a junior team, equipment held up against price,
food and drink — and for two calculators for riders: energy for a race,
and gearing for the young classes. Both calculators should be open on
kadence.haij.dk without a login (docs/plan-klubber-og-guides.md, wave A,
approved 3 October 2026). The research is in docs/research:
klasser-og-gearing.md, udstyr.md and ernaering.md.

Until now every page of Kadence but the landing page, the terms and the
demo sat behind an account.

## Decision

- **Open pages in their own route group**, `(open)`: `/guides` (the
  hub), `/guides/classes`, `/guides/equipment`, `/calculators/gearing`
  and `/calculators/energy`. They have a header and footer of their own,
  read no data beyond the session cookie that decides whether the corner
  says "Til Kadence" or "Log ind", and stay out of the proxy's protected
  prefixes. The slugs are English like the rest of the app's routes.
- **The calculators run in the browser.** Pure logic in
  `src/modules/calc` (rollout, energy, fuel, the composed answer) is
  imported by client components; nothing typed is sent or stored, and
  there are no cookies beyond the language. The weight the energy
  calculator may be given is optional and never leaves the page; without
  it the plan for the race still works and the meals before and after,
  which are per kg, are left out.
- **One home for each number.** DCU's youth gear limits are in
  `src/modules/dcu/gearing.ts`, with U17 read from `RACE_RULES` so the
  calculator and the coach's tips cannot disagree. The guides' words take
  their race numbers from the DCU modules, as the coach guide does.
- **The guides are the coach guide's form** (ADR 0021): short sections in
  Kadence's own words, sources under each, words in messages, structure
  in `src/modules/guides`, and a test that holds them together. A section
  that is the milieu's experience rather than written rules is marked as
  such ("Erfaring fra miljøet"); the classes guide's "Det uskrevne" is
  the first.
- **Products are named neutrally.** The gearing calculator lists junior
  cassettes (Miche, Recon, E.Dubied, Shimano) and Magene's chainrings
  with the price and shop where each was seen, and works out what each
  allows for the class and tyre chosen. No affiliate links, no ranking.
  The equipment guide's table ranks changes, not brands.
- **Kadence's own choices are said to be Kadence's.** Where no source
  gives a number, the calculator says the number is Kadence's: 60 g of
  carbohydrate an hour without practice in training (for U17 too, where
  no source has a figure for teenagers), never more than 90 g; ±15 %
  around an estimate from heart rate or MET; a straight line between the
  2 % and 1 % sweat-loss limits at 25 and 30 °C; about 1 g/kg for each
  hour before the start.
- **The entry points** are the hub's link in the app's navigation, a card
  on the parents' page and on help, and a link on the landing page.

## Trade-offs accepted

- **Public pages are a shop window before the winter.** Dogma seven
  keeps what Kadence builds out of the window until it has run a real
  winter. These pages are useful on their own and collect nothing, so
  Martin accepted them open on kadence.haij.dk; they are not shown off on
  haij.dk before the winter.
- **The food guide waits.** Its section on low energy availability is
  health advice to parents about minors, so it goes live only after a
  sports dietitian has read it, in a pull request of its own. The energy
  calculator plans fuel for a race and never what a young rider should
  weigh or eat in a day; ADR 0021's line — Kadence never computes energy
  availability — holds.
- **Prices and rules age.** Prices are dated October 2026 and the rules
  are DCU's for 2026; the pages say so, and both need reading again each
  season.
- **Adult data for young riders.** Wind tunnel figures, gross efficiency
  and the heart rate formula come from adults; the pages say so where it
  matters, and the heart rate method warns under 18.
- **The speed method is for riding alone.** In a bunch the shelter moves
  between 5 and 95 % of the air resistance and no average for a race
  exists, so the method says it holds for a time trial.
- **Leaving the app shell.** The hub opens outside the app's sidebar, so
  a signed-in reader goes back through "Til Kadence". Rendering the open
  pages twice, inside and outside the shell, was not worth it.

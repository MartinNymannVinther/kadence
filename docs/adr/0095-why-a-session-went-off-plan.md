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

## Amendment, 13 October 2026: how it felt counts only when it is far off

After reading the popover, Martin wrote: "Jeg tror ikke vi skal lægge for
meget i hvad folk selv føler ift. feedback. Med mindre det er helt
skævt." How a rider says a session felt (RPE) should not drive the
feedback, unless it is wildly off.

- **The colour.** When the done side's load came from RPE alone
  (`load_method = 'rpe'`), `complianceRatio` reads minutes, not load —
  unless the felt load is under 50 % or over 200 % of the planned load
  (`RPE_FAR_LOW_PCT`, `RPE_FAR_HIGH_PCT` in compliance.ts, beside
  Martin's words). Power and heart rate read load as before. The method
  travels on `ComplianceSide.method`; every caller passes it: the
  calendar's and Today's marks (`colourOf` in compliance-mark.tsx and
  team-days.ts, from the cards' `loadMethod`), the popover and the
  panel (through `deviation()`), "Dine ture" (`own-rides.ts`), the
  coach's insight and its compliance flag (`insight/gather.ts` selects
  `load_method`), and the AI comment's context. A caller without the
  method reads load, as before. A planned session with a load but no
  minutes keeps reading the load, since there is nothing else to read.
- **Strength.** A strength session is RPE by nature (neither watts nor
  pulse describe a squat), so the same rule applies: its colour reads
  minutes unless the feeling is far off.
- **The words.** For an RPE session the feeling sentence ("… og det
  føltes en del lettere end planlagt.") stands only when the colour was
  read from the felt load because it was far off; otherwise the ride is
  told by its time alone ("Du trænede 45 min."). The headings follow the
  ratio the colour used, so they still agree by construction; a new grid
  (tests/load/deviation-felt.test.ts) walks loads on both sides of both
  bounds, on the bike and in the gym, beside the 1,152 and 4,608 cases.
- **The threshold hint states the data** instead of asking about a
  feeling: "Over 41 minutter i gennemsnit over din FTP er mere, end de
  fleste kan holde. Din FTP er nok sat for lavt." (by heart rate "… over
  din tærskelpuls …"; to a coach "… over rytterens FTP … Rytterens FTP er
  nok sat for lavt."), with the same link and the same trigger.
- **The AI comment** is told to speak about time and effort from the
  measured data and not to dwell on how the session felt unless the
  felt effort is far from the plan, which its numbers mark as
  `feltFarOff`.

Trade-off accepted: a rider without a power meter or a strap who rides
the planned time but says it was much easier or harder than planned —
within the factor of two — now gets green. The feeling is still saved,
still counts toward fitness and fatigue, and still shows on the ride;
it only no longer decides the colour on its own.

## Amendment, 14 October 2026: a plan without intensity and a pulse off the bike are judged by time

Martin ran an easy, conversational 31 minutes on a session planned as
"Løbetur 30 min" (sport "other", only a duration). The mark was red,
"Langt fra planen", and the popover said "Mere gas end planlagt … med en
gennemsnitspuls omkring 90 % af din tærskelpuls … omkring 2 gange så
hårdt for kroppen som planlagt". Both halves were wrong. The plan said
nothing of how hard, so nothing could be harder than planned: its load,
21, was only an estimate from 30 minutes at RPE 5 (planned-load.ts). And
the run's pulse was weighed against the bike's threshold pulse (ADR
0016), where a runner sits 5–10 beats higher, which roughly doubled its
heart-rate load, to 42.

- **What a plan says of how hard** (`planIntensity`, plan-intensity.ts):
  `none` when it says only how long — no structure, a bike session with
  no steps or only open steps, or an "other" session, which is words and
  minutes; `set` when a step targets a zone, a share of FTP or an RPE;
  `pulse` when a step targets a share of threshold heart rate. A
  strength session is `set`: its sets, reps and RM say how hard, and the
  rule of 13 October for how it felt governs its colour unchanged.
- **The colour** (`loadOffPlan`, compliance.ts) reads minutes, whatever
  measured the load, when the plan is `none`; and when the done side is
  another sport than the bike with a load from heart rate and the plan
  has no heart-rate target (a run planned as "30 min at 70–80 % of
  threshold pulse" can still be judged by its pulse). The plan's intensity
  travels on `ComplianceSide.intensity`, the activity's sport on
  `ComplianceSide.sport`. Every caller passes both, read from the
  session's structure by one helper, `planIntensityOf`: the calendar's
  and Today's marks (`colourOf` in compliance-mark.tsx and team-days.ts,
  from the cards' `structure`), the popover and the panel (through
  `deviation()`), "Dine ture" (own-rides.ts selects the session's sport
  and structure), the coach's insight and its compliance flag
  (insight/gather.ts reads the structure and passes on only the
  intensity), and the AI comment's context. A ride is only ever matched
  to a session of its own sport, so the session's sport stands in for the
  activity's where the card does not carry it. A caller without the
  intensity reads as before. A plan with a load but no minutes keeps
  reading the load, since there is nothing else to read.
- **The words.** Read by minutes for these reasons (`timeOnly` on the
  ratio), the story tells time alone: no effort word ("og en del
  hårdere"), no share of threshold ("% af din tærskelpuls"), no whole
  ("gange så hårdt"), no zones' line. An on-time run is green and its
  mark offers no popover. The threshold hint is for bike rides only,
  since the thresholds are the bike's. No new message keys.

Trade-off accepted: a run that really was much harder than intended is
no longer called so when the plan gave it no intensity — the coach who
wants it judged can give the session a target. Its load still counts in
full toward fitness and fatigue, slightly overstated by the bike's
threshold pulse, as ADR 0016 accepts. And an old bike session whose plan
is only open steps is now judged by time, where it was by load.

## Amendment, 15 October 2026: words that motivate, empty strength plans, the explanation by sport

Martin opened a strength session, "Styrketræning", planned as one hour
with nothing in "Passet" and done in one hour at RPE 3. The mark was
red, "Langt fra planen"; the box said "Roligere end planlagt … det
føltes en del lettere end planlagt … omkring 70 % lettere", "Sådan er
det regnet" spoke of "hvor hårdt du kørte i forhold til din FTP", and
the "Udført" block said "Belastning 17". His words: "Det lyder stadig
forkert med 'langt fra planen', find på noget mere motiverende."

- **The marks' words** (`training.state`), colours and icons unchanged:
  green "Som planlagt"; yellow "Tæt på planen" (was "Afveg fra
  planen"); red with something done "Din egen version" (was "Langt fra
  planen"); red with nothing done "Ikke nået" (was "Ikke udført"). The
  box's heading for a missed session is "Ikke nået" in every sport (was
  "Ikke kørt" on the bike, "Ikke udført" off it); its fact, "Planlagt 1
  t. Der er ikke kommet noget ind for passet.", stays. English: "As
  planned", "Close to the plan", "Your own version", "Not reached". The
  keys are the same, so every place the words show — the calendar's
  cards and chips, the team's week and month, Today, the popover's
  aria-label — follows; the help texts and the manual
  (public/brugervejledning/index.html) say the same, and the coach's
  attention point reads "pas der gik helt anderledes end planlagt". The
  PDF of the manual is not rendered again here.
- **A strength plan with nothing in it says only how long**
  (`planIntensity`): `none` without an exercise, `set` with one. Every
  exercise carries sets and reps by the schema, so one is enough. An
  empty "Styrketræning 1 t" is then judged by its minutes like
  "Løbetur 30 min" (14 October): Martin's 60 of 60 minutes is green,
  and its mark opens no box. A strength session with exercises keeps
  the rule of 13 October: how it felt counts only when far off.
- **"Sådan er det regnet" by sport** (`countedWords`,
  deviation-text.ts): on the bike the FTP sentence as before; another
  sport by heart rate "… ud fra tiden og din puls i forhold til din
  tærskelpuls …"; strength, or any load from RPE, "Kadence vurderer,
  hvor meget et pas trækker på kroppen, ud fra tiden og hvor hårdt det
  føltes. En time på hårdt (8 af 10) tæller 100." (the anchor of
  calibration.ts). The numbers say "Denne tur" for a ride and "Dette
  pas" otherwise.
- **No load row in "Udført".** The number read as a grade ("17" against
  a plan of 60) and is Kadence's estimate, not something the rider
  did. It is shown in the panel only behind "Sådan er det regnet",
  where the colour was read by it, and on the activity's page with how
  it was measured. The row named no method, so there was nothing to
  move into the sentence.

Trade-off accepted: an empty strength plan can no longer be called
much harder or easier than planned — a coach who wants that puts the
exercises in. And a session whose colour was read by time shows no load
number in the panel at all; a coach finds it on the activity's page.

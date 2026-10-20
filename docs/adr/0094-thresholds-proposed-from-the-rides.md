# ADR 0094: Thresholds proposed from the rides — rules, not a model, and nothing saved without a person

Status: accepted · Date: 2026-10-12 · Builds on 0011, 0013, 0015, 0016, 0028 · docs/research/taerskler-fra-turene.md

## Context

A rider's thresholds — FTP, threshold pulse, max pulse, resting pulse —
turn every session written in zones into watts and beats, and give the
load model its best method (ADR 0016). Most U17 and U19 riders have
never done a test, and the form was often empty while a year of rides
sat beside it. On 12 October 2026 Martin asked for a function that,
when there is data for the last year or so, offers Kadence's own
estimate of the thresholds. Dogma five: Kadence proposes, a person
decides.

Every ride already keeps its power curve (`best_powers`, the best watt
for 26 durations), its average and max pulse, and a 5-second copy of
its channels (`streams`).

## Decision

**A button on the thresholds form**, on the rider's own page ("Foreslå
ud fra mine ture") and the coach's rider page ("Foreslå ud fra turene"),
shown when the rider has a bike ride in the last 365 days. It opens a
panel with each proposed number beside the saved one, the method in
plain Danish, the window (90 days or the year), how sure Kadence is
(ret sikkert, nogenlunde sikkert, usikkert), why it is less sure, and
links to the rides it came from. "Brug forslaget" puts the ticked
numbers into the fields and sets the date to today; **nothing is saved
until the person presses Gem**, through the ordinary thresholds action
and its audit. Where a number cannot be proposed, one plain sentence
says what is missing ("Der er ingen tur med 20 minutters hård indsats de
seneste 365 dage.").

**The methods, in order** (`src/modules/load/threshold-*.ts`, pure):

- **FTP**: critical power from the best 3, 5, 10, 15 and 20 minutes
  (power against 1/t, least squares), used when R² ≥ 0.95, W′ is 4–40
  kJ and CP is under the best 20 minutes; FTP = 0.97 × CP (Karsten et
  al. 2021 found CP 7 W above a 20-minute FTP). Else 95 % of the best 20
  minutes. Never under the best hour actually held, never over the best
  20 minutes. Nothing when the best 20 minutes are under 75 % of the
  best 5 (they were not ridden hard).
- **Threshold pulse**: 97 % of the highest 20-minute average pulse in a
  ride where those 20 minutes were hard — at least 87 % of a reference
  max (the rides' own held max, the saved max, or the age line less 10).
- **Max pulse**: the highest pulse held for two 5-second samples in a
  row, after dropping samples outside 30 bpm and the age line plus 30,
  and samples that jump more than 30 beats in five seconds. Over the
  year. Only when above the saved max, and not more than 20 under the
  age line (Tanaka et al. 2001, a bound, never the value).
- **Resting pulse**: never from a ride; the median of resting pulses
  measured by hand (`rider_measurements`), when there are any.

**Windows and sufficiency**: the last 90 days first, the year when 90
days hold fewer than three rides with the channel or no hard 20
minutes. A number from the year is one step less sure; a rider under 19
in the year gets "usikkert" and a sentence that young riders get
stronger fast. Confidence is lowered when no pulse can confirm the
20-minute effort, when the pulse says it was not hard, when there is no
best 5 minutes to judge it by, when the hour was higher, and with fewer
than five rides with power.

**What is read** (`src/modules/training/threshold-proposal.ts`), under
the caller's RLS and only for those who may read the rider's training
(`app_can_read_rider(rider, 'training')`, checked first): the small
columns of the year's bike rides (about 100 kB for 250 rides), then the
pulse channel only (`streams->'hr'`) of at most 18 candidate rides —
three per window by best 20-minute power, by max pulse and by average
pulse over 20 minutes — under 150 kB; and the resting pulses measured.
Never every stream of a year (about 15 MB).

**A quiet line on a ride's page** when the ride is from the last 30 days
and 95 % of its best 20 minutes is more than 5 % above the saved FTP:
"Turen tyder på, at din FTP er steget. Se forslaget.", linking to the
form with the proposal opened. No table; it reads the ride and the
rider already on the page.

**No model is asked.** These are rules, with their sources and their
judgements in the research note. Each threshold also gets a short
explanation behind an "i" beside its label.

## Trade-offs accepted

- **CP against 95 %.** CP uses five durations and was validated on U23
  riders' own files (Leo et al. 2020), but needs all-out efforts at both
  ends; 95 % of 20 minutes is the rule riders know and needs one number,
  but is ±30–60 W for the individual (Borszcz et al. 2018). Kadence
  tries CP first and says which it used.
- **Group rides and races make the short end high and the long end
  low.** Power alone cannot tell a submaximal 20 minutes from a rider's
  limit; the 75 % rule and the ride's pulse catch some of it, and the
  rest shows as a lower confidence. The proposal is more often too low
  than too high, and too-low zones are the safe side.
- **Heart rate drifts and lags.** The best 20 minutes of a race carry
  surges and drift; 97 % is a middle between Friel's 30-minute test and
  a race. A threshold pulse is not proposed from rides that were not
  hard, which leaves many winter riders without one — no number rather
  than a low one marked sure.
- **Young riders grow.** A year's data for a U17 rider is likely too
  low; Kadence still offers it, marked unsure and said why, rather than
  nothing.
- **Artefact rules are judgements.** A strap stuck high for more than
  half a minute can still pass; the age ceiling and the person reading
  the number beside the saved one are the last checks.
- **Resting pulse has almost no source.** No device sends it and no
  screen writes `resting_hr` measurements today, so in practice the
  panel says it is the rider's to write.
- **Not tried on real riders' files yet.** The numbers are tested on
  synthetic rides and the demo; the winter's pilot is the first real
  check (dogma seven).

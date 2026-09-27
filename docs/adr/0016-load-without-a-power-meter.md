# ADR 0016: Load without a power meter, on one scale

Status: accepted · Date: 2026-09-27

## Context

TrainingPeaks' load model assumes a power meter or tested thresholds, and
its words (TSS, CTL, ATL, TSB, NP, IF) are its trademarks. Many U17 riders
have neither a power meter nor a test; every rider does strength
sessions; and a coach needs one curve for all of it.

## Decision

Every activity gets a load in the same units, by the best method its data
allows, in this order (src/modules/load/activity-load.ts):

1. **power** — a bike ride with power and a known FTP: hours ×
   (weighted power / FTP)² × 100;
2. **hr** — average heart rate against threshold heart rate, capped at
   1.05 and ignored below 40 % (a lost strap), same formula;
3. **rpe** — session RPE, how hard it felt from 1 to 10, calibrated onto
   the same scale: load per hour = 100 × (RPE / 8)^1.8, so an hour at RPE 8
   (threshold) is 100 and an easy hour at RPE 3 is 17. The raw sRPE
   (minutes × RPE) is kept beside it for coaches who think in it;
4. **none**.

Strength and other sports use RPE (or pulse). Planned sessions are
estimated from their structure with one power per zone
(`ZONE_FTP_RIDE`), the same point a trainer in ERG mode holds.

Fitness (42 days), fatigue (7 days) and form (yesterday's fitness minus
yesterday's fatigue) are exponentially weighted averages with step
1 − e^(−1/N). The names are Kadence's own, in Danish kondition, træthed
and friskhed.

## Trade-offs accepted

- **RPE is a feeling.** An easy ride logged by RPE counts somewhat less
  than the same ride measured by power. One curve that includes the
  riders without sensors is worth more than a precise curve that leaves
  them out.
- **Heart rate lags and drifts.** Average heart rate underrates
  intervals; power wins whenever it is there.
- **One exponent is a choice.** 1.8 lands the two anchors a coach can
  check (threshold hour, easy hour); a later calibration against real
  riders' power and RPE may move it.

/**
 * The one scale every way of measuring load lands on (ADR 0016: load
 * without a power meter).
 *
 * **The scale.** An hour ridden exactly at threshold is 100. Any session
 * is its hours × intensity² × 100, where intensity is the share of
 * threshold it was ridden at: squared because strain grows faster than
 * effort, so an hour at 70 % is about half an hour at threshold (49), not
 * 70. Power, heart rate and a planned structure all reach an intensity
 * and go through `loadAt`.
 *
 * **Session RPE.** How hard a session felt, 1–10, times its minutes, is
 * the raw session-RPE ("sRPE", arbitrary units) that the sport-science
 * literature uses, and it works for every session including strength and
 * a run. Kadence keeps the raw number and also calibrates it onto the
 * scale above, by two anchors:
 *
 * - an hour at RPE 8 — hard, about what can be held for an hour, i.e.
 *   threshold — is 100, the same as an hour at threshold by power;
 * - an easy hour at RPE 3 is about 17 (the target was 15–20).
 *
 * A power curve through both is load per hour = 100 × (RPE / 8)^1.8. The
 * plain square, (RPE / 8)², would put the easy hour at 14, just under the
 * anchor; the exponent 1.8 lands it inside and also keeps the top of the
 * scale sane — an "hour at RPE 10" is a race, 149, rather than 156. The
 * curve rises smoothly between the anchors and goes to 0 at RPE 0:
 *
 *   RPE        1   2   3   4   5   6   7    8    9   10
 *   load/hour  2   8  17  29  43  60  79  100  124  149
 *
 * Read as an intensity, RPE r corresponds to (r / 8)^0.9 of threshold,
 * which is how a planned step with an RPE target is estimated.
 *
 * The trade-off accepted: an easy ride logged by RPE alone counts for less
 * than the same ride measured by power (a zone-2 hour is about 40 by
 * power, 17–29 by RPE 3–4), because riders' "easy" spans everything from
 * a spin to a steady endurance ride. Power and heart rate refine it when
 * they exist.
 *
 * Pure: imports nothing from the database.
 */

/** An hour at threshold. */
export const LOAD_PER_HOUR_AT_THRESHOLD = 100;

/** The RPE that stands for threshold: hard, about what can be held for an hour. */
export const RPE_AT_THRESHOLD = 8;

/** The exponent of the RPE curve; see above for why 1.8 and not 2. */
export const RPE_EXPONENT = 1.8;

/** Load of `seconds` at `intensity` (share of threshold), unrounded. */
export function loadAt(seconds: number, intensity: number): number {
  if (!(seconds > 0) || !(intensity > 0)) return 0;
  return (seconds / 3600) * intensity ** 2 * LOAD_PER_HOUR_AT_THRESHOLD;
}

function clampRpe(rpe: number): number {
  return Math.min(10, Math.max(0, rpe));
}

/** Load of an hour at this RPE: 100 × (RPE / 8)^1.8. */
export function rpeLoadPerHour(rpe: number): number {
  if (!Number.isFinite(rpe)) return 0;
  return LOAD_PER_HOUR_AT_THRESHOLD * (clampRpe(rpe) / RPE_AT_THRESHOLD) ** RPE_EXPONENT;
}

/** The share of threshold an RPE corresponds to on the same scale: (RPE / 8)^0.9. */
export function rpeIntensity(rpe: number): number {
  return Math.sqrt(rpeLoadPerHour(rpe) / LOAD_PER_HOUR_AT_THRESHOLD);
}

/** Load of `minutes` at this RPE, unrounded. */
export function rpeLoad(minutes: number, rpe: number): number {
  if (!(minutes > 0)) return 0;
  return (minutes / 60) * rpeLoadPerHour(rpe);
}

/** Raw session RPE: minutes × RPE, in arbitrary units, rounded to whole units. */
export function sessionRpe(minutes: number, rpe: number): number {
  if (!(minutes > 0) || !Number.isFinite(rpe)) return 0;
  return Math.round(minutes * clampRpe(rpe));
}

import type { BikeStructure, Intent, Step, Target } from "@/modules/workouts/structure";
import { targetRange, type Thresholds } from "./zones";

/**
 * The plan against the ride: where in the ride the planned session was
 * ridden, and how each step went. A ride is longer than its session —
 * riding out, a stop, riding home — so the plan is slid along the ride
 * and laid where its watt profile fits best (its pulse profile when there
 * is no watt); then every step, each repetition on its own, gets the
 * ride's average watt and pulse over its seconds and a verdict against
 * its target: hit, under, over — or none, for a step with no number to
 * hit (open, "as you feel").
 *
 * Reads the stored streams (one value per few seconds) and the rider's
 * thresholds as they are now. Pure: imports nothing from the database.
 */

export type PlannedStep = {
  /** Which step in the plan, and which repetition of a repeat (1-based; 0 for a lone step). */
  index: number;
  repetition: number;
  of: number;
  intent: Intent;
  label: string | null;
  seconds: number;
  target: Target;
  /** Seconds from the plan's start. */
  from: number;
};

export type Verdict = "hit" | "under" | "over" | "none";

export type StepResult = PlannedStep & {
  avgWatts: number | null;
  avgBpm: number | null;
  watts: { low: number; high: number } | null;
  bpm: { low: number; high: number } | null;
  verdict: Verdict;
};

export type PlanVsRide = {
  /** Seconds into the ride where the plan starts. */
  offset: number;
  alignedBy: "power" | "hr" | "start";
  steps: StepResult[];
  hit: number;
  judged: number;
};

export type RideStreams = {
  t: number[];
  power?: (number | null)[];
  hr?: (number | null)[];
};

/** The plan as one list of steps, repeats unrolled, each with its start. */
export function expandPlan(structure: BikeStructure): PlannedStep[] {
  const out: PlannedStep[] = [];
  let from = 0;
  const push = (step: Step, index: number, repetition: number, of: number) => {
    out.push({
      index,
      repetition,
      of,
      intent: step.intent,
      label: step.label ?? null,
      seconds: step.seconds,
      target: step.target,
      from,
    });
    from += step.seconds;
  };
  structure.steps.forEach((item, index) => {
    if (item.kind === "step") push(item, index, 0, 0);
    else
      for (let r = 1; r <= item.times; r++)
        for (const step of item.steps) push(step, index, r, item.times);
  });
  return out;
}

/** The watt (or pulse) the plan asks for at each second, for the sliding fit. */
function profile(
  steps: readonly PlannedStep[],
  rider: Thresholds,
  channel: "watts" | "bpm",
): (number | null)[] {
  const total = steps.reduce((s, step) => s + step.seconds, 0);
  const line = new Array<number | null>(total).fill(null);
  for (const step of steps) {
    const range = targetRange(step.target, rider)?.[channel];
    const mid = range ? (range.low + range.high) / 2 : null;
    for (let s = step.from; s < step.from + step.seconds; s++) line[s] = mid;
  }
  return line;
}

function mean(values: readonly (number | null | undefined)[]): number | null {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (typeof v !== "number") continue;
    sum += v;
    n++;
  }
  return n > 0 ? sum / n : null;
}

/** The ride's value at each second, from samples every `step` seconds. */
function perSecond(streams: RideStreams, channel: "power" | "hr"): (number | null)[] {
  const values = streams[channel] ?? [];
  const step = streams.t.length > 1 ? streams.t[1]! - streams.t[0]! : 5;
  const out: (number | null)[] = [];
  streams.t.forEach((t, i) => {
    for (let s = 0; s < step; s++) out[t + s] = values[i] ?? null;
  });
  return out;
}

/** The offset where the plan's profile fits the ride best, by mean squared error, coarse then fine. */
function bestOffset(
  plan: readonly (number | null)[],
  ride: readonly (number | null)[],
): number | null {
  const span = ride.length - plan.length;
  if (span < 0) return null;
  const error = (offset: number) => {
    let sum = 0;
    let n = 0;
    for (let s = 0; s < plan.length; s += 5) {
      const p = plan[s];
      const r = ride[offset + s];
      if (typeof p !== "number" || typeof r !== "number") continue;
      sum += (p - r) ** 2;
      n++;
    }
    return n > plan.length / 20 ? sum / n : Infinity;
  };
  let best = 0;
  let least = Infinity;
  for (let o = 0; o <= span; o += 15) {
    const e = error(o);
    if (e < least) {
      least = e;
      best = o;
    }
  }
  if (least === Infinity) return null;
  for (let o = Math.max(0, best - 15); o <= Math.min(span, best + 15); o += 1) {
    const e = error(o);
    if (e < least) {
      least = e;
      best = o;
    }
  }
  return best;
}

function verdict(avg: number | null, range: { low: number; high: number } | null): Verdict {
  if (avg === null || !range) return "none";
  if (avg < range.low) return "under";
  if (avg > range.high) return "over";
  return "hit";
}

export function planVsRide(
  structure: BikeStructure,
  streams: RideStreams,
  rider: Thresholds,
): PlanVsRide | null {
  const steps = expandPlan(structure);
  if (steps.length === 0 || streams.t.length === 0) return null;
  const power = perSecond(streams, "power");
  const hr = perSecond(streams, "hr");
  const hasPower = power.some((v) => typeof v === "number" && v > 0);
  const hasHr = hr.some((v) => typeof v === "number" && v > 0);

  let offset: number | null = null;
  let alignedBy: PlanVsRide["alignedBy"] = "start";
  if (hasPower) {
    offset = bestOffset(profile(steps, rider, "watts"), power);
    if (offset !== null) alignedBy = "power";
  }
  if (offset === null && hasHr) {
    offset = bestOffset(profile(steps, rider, "bpm"), hr);
    if (offset !== null) alignedBy = "hr";
  }
  offset ??= 0;

  const results: StepResult[] = steps.map((step) => {
    const from = offset + step.from;
    const to = from + step.seconds;
    const range = targetRange(step.target, rider);
    const avgWatts = hasPower ? mean(power.slice(from, to)) : null;
    const avgBpm = hasHr ? mean(hr.slice(from, to)) : null;
    const watts = range?.watts ?? null;
    const bpm = range?.bpm ?? null;
    // Judged by watt when the ride and the target both have it, else by pulse.
    const v =
      hasPower && watts ? verdict(avgWatts, watts) : hasHr && bpm ? verdict(avgBpm, bpm) : "none";
    return {
      ...step,
      avgWatts: avgWatts === null ? null : Math.round(avgWatts),
      avgBpm: avgBpm === null ? null : Math.round(avgBpm),
      watts,
      bpm,
      verdict: v,
    };
  });
  const judged = results.filter((r) => r.verdict !== "none");
  return {
    offset,
    alignedBy,
    steps: results,
    hit: judged.filter((r) => r.verdict === "hit").length,
    judged: judged.length,
  };
}

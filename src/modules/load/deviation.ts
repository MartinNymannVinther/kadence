import { flattenSteps, ZONES, type Structure, type Zone } from "@/modules/workouts/structure";
import {
  GREEN_LOW_PCT,
  colourOfPct,
  compliance,
  complianceRatio,
  type ComplianceColour,
} from "./compliance";
import { GOAL_SECONDS, stepZone } from "./intensity";

/**
 * Why a session went off its plan, in facts with numbers (docs/adr/0095):
 * what the yellow "Afveg fra planen" and the red "Langt fra planen" or
 * "Ikke udført" stand for, so a rider or coach can read it instead of
 * guessing.
 *
 * **It agrees with the colour by construction.** The colour comes from
 * `compliance()` itself, and the heading and the first fact from the very
 * ratio the colour is read from (`complianceRatio`, compliance.ts): by
 * load when both sides have one, by minutes otherwise, against the same
 * bands. The explanation never weighs anything the colour did not.
 *
 * The facts:
 * - **time**: planned and done minutes, and the change in whole percent;
 * - **load**: planned and done load on Kadence's one scale (ADR 0016),
 *   when the colour was read by load;
 * - **intensity**: when the plan has steps with zones and the ride has
 *   time in zones (power first, pulse otherwise): the zone the session was
 *   built around — the highest it holds for five minutes, as intensity.ts
 *   reads a session's goal — the minutes planned and ridden at it or
 *   above, the zone most of the ride was in, and the share of the ride in
 *   the zones the plan holds;
 * - **noPlanDetail**: the plan says only how long, so only time (or the
 *   load estimated from it) could be compared;
 * - **missed**: a day that passed with nothing done.
 *
 * Nothing is guessed: a fact stands only where both sides have its number.
 * Pure: imports nothing from the database.
 */

export type DeviationPlanned = {
  minutes: number;
  load?: number | null;
  structure?: Structure | null;
};

export type ZoneSecondsBySource = {
  power?: readonly number[] | null;
  hr?: readonly number[] | null;
} | null;

export type DeviationDone = {
  minutes: number;
  load?: number | null;
  zoneSeconds?: ZoneSecondsBySource;
};

export type DeviationFact =
  | { kind: "missed"; plannedMinutes: number }
  | { kind: "time"; planned: number; done: number; changePct: number }
  | { kind: "load"; planned: number; done: number; changePct: number }
  | {
      kind: "intensity";
      source: "power" | "hr";
      builtAround: Zone;
      plannedMinutes: number;
      doneMinutes: number;
      mostZone: Zone;
      inPlanPct: number;
    }
  | { kind: "noPlanDetail" };

export type DeviationHeading = "missed" | "shorter" | "longer" | "easier" | "harder";

export type Deviation = {
  colour: ComplianceColour;
  /** What the colour was read by; null with nothing to measure (or nothing done). */
  measuredBy: "load" | "minutes" | null;
  /** Null when the session went as planned, is still ahead, or was not planned. */
  heading: DeviationHeading | null;
  facts: DeviationFact[];
};

/** Seconds planned per zone (index 0 is zone 1) from a bike session's steps. */
export function plannedZoneSeconds(structure: Structure | null | undefined): number[] | null {
  if (!structure || structure.kind !== "bike") return null;
  const seconds = ZONES.map(() => 0);
  for (const step of flattenSteps(structure)) {
    const zone = stepZone(step);
    if (zone !== null) seconds[zone - 1]! += step.seconds;
  }
  return seconds.some((s) => s > 0) ? seconds : null;
}

/** The zone a plan is built around: the highest held five minutes, else the longest. */
export function builtAround(seconds: readonly number[]): Zone {
  for (let i = seconds.length - 1; i >= 0; i--)
    if ((seconds[i] ?? 0) >= GOAL_SECONDS) return ZONES[i]!;
  let best = 0;
  seconds.forEach((s, i) => {
    if (s > (seconds[best] ?? 0)) best = i;
  });
  return ZONES[best]!;
}

function doneZones(
  zoneSeconds: ZoneSecondsBySource | undefined,
): { source: "power" | "hr"; seconds: number[] } | null {
  for (const source of ["power", "hr"] as const) {
    const raw = zoneSeconds?.[source];
    if (!Array.isArray(raw)) continue;
    const seconds = ZONES.map((_, i) => Math.max(0, Number(raw[i]) || 0));
    if (seconds.some((s) => s > 0)) return { source, seconds };
  }
  return null;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

function intensityFact(
  planned: DeviationPlanned,
  done: DeviationDone,
): Extract<DeviationFact, { kind: "intensity" }> | null {
  const plan = plannedZoneSeconds(planned.structure);
  const ride = doneZones(done.zoneSeconds);
  if (!plan || !ride) return null;
  const zone = builtAround(plan);
  const atOrAbove = (xs: readonly number[]) => sum(xs.slice(zone - 1));
  let most = 0;
  ride.seconds.forEach((s, i) => {
    if (s > (ride.seconds[most] ?? 0)) most = i;
  });
  const inPlan = sum(ride.seconds.filter((_, i) => (plan[i] ?? 0) > 0));
  return {
    kind: "intensity",
    source: ride.source,
    builtAround: zone,
    plannedMinutes: Math.round(atOrAbove(plan) / 60),
    doneMinutes: Math.round(atOrAbove(ride.seconds) / 60),
    mostZone: ZONES[most]!,
    inPlanPct: Math.round((100 * inPlan) / sum(ride.seconds)),
  };
}

/** The plan says only how long: no structure, or one with no zone to read. */
function onlyDuration(structure: Structure | null | undefined): boolean {
  if (!structure) return true;
  if (structure.kind === "strength") return false;
  if (structure.kind === "other") return true;
  return plannedZoneSeconds(structure) === null;
}

function change(planned: number, done: number): number {
  return Math.round((done / planned) * 100) - 100;
}

/** The explanation of a session's colour; see the file comment. */
export function deviation(
  planned: DeviationPlanned,
  done: DeviationDone | null,
  dayIso: string,
  todayIso: string,
): Deviation {
  const colour = compliance(planned, done, dayIso, todayIso);
  if (!done) {
    return colour === "red"
      ? {
          colour,
          measuredBy: null,
          heading: "missed",
          facts: [{ kind: "missed", plannedMinutes: Math.round(planned.minutes) }],
        }
      : { colour, measuredBy: null, heading: null, facts: [] };
  }
  const ratio = complianceRatio(planned, done);
  const time: DeviationFact | null =
    planned.minutes > 0
      ? {
          kind: "time",
          planned: Math.round(planned.minutes),
          done: Math.round(done.minutes),
          changePct: change(planned.minutes, done.minutes),
        }
      : null;
  const load: DeviationFact | null =
    ratio?.by === "load"
      ? {
          kind: "load",
          planned: Math.round(planned.load!),
          done: Math.round(done.load!),
          changePct: ratio.pct - 100,
        }
      : null;

  let heading: DeviationHeading | null = null;
  if (ratio && (colour === "yellow" || colour === "red")) {
    const less = ratio.pct < GREEN_LOW_PCT;
    heading = less ? "shorter" : "longer";
    if (ratio.by === "load") {
      // Read by load: it is "shorter" only when the minutes were off the
      // same way; a ride as long as planned but harder is "harder".
      const minutesPct = planned.minutes > 0 ? (done.minutes / planned.minutes) * 100 : null;
      const sameWay =
        minutesPct !== null &&
        colourOfPct(Math.round(minutesPct)) !== "green" &&
        minutesPct < GREEN_LOW_PCT === less;
      if (!sameWay) heading = less ? "easier" : "harder";
    }
  }

  const byTime = heading === "shorter" || heading === "longer" || ratio?.by === "minutes";
  const facts: DeviationFact[] = [];
  for (const fact of byTime ? [time, load] : [load, time]) if (fact) facts.push(fact);
  const intensity = intensityFact(planned, done);
  if (intensity) facts.push(intensity);
  else if (onlyDuration(planned.structure) && facts.length > 0)
    facts.push({ kind: "noPlanDetail" });
  return { colour, measuredBy: ratio?.by ?? null, heading, facts };
}

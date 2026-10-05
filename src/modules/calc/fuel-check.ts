import type { Range } from "./energy";
import {
  carbsPerHour,
  fluidPerHour,
  MAX_CARBS_PER_HOUR,
  UNTRAINED_CAP,
  type CarbAdvice,
} from "./fuel";
import { FUEL_ITEMS, itemContent, type BottleMl, type FuelItemId } from "./fuel-items";

/**
 * A race plan the rider builds: what is eaten and drunk in each hour of
 * the race, held up hour by hour against the same recommendations the
 * calculator gives (fuel.ts). The rider drawn on the page takes their
 * look from this — an illustration of how the plan meets the
 * recommendations, never a forecast of how a body will feel.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export const MIN_MINUTES = 30;
export const MAX_MINUTES = 360;
export const MAX_LANES = MAX_MINUTES / 60;
/** No more than this in one hour: a jersey has three pockets. */
export const MAX_PER_LANE = 8;

/**
 * Food comes in whole pieces and bottles are seldom drunk to the last
 * sip, so Kadence counts an hour as on target within about half a piece
 * of food (15 g) and half a bottle of the recommendation so far, and lets
 * the stomach's limit be 10 g over. Kadence's own choice, not a source's.
 */
export const CARB_SLACK_G = 15;
export const GUT_SLACK_G = 10;
export const fluidSlackL = (bottleMl: BottleMl) => bottleMl / 2000;

/** The gut takes up about 1–1.5 L an hour (Team Danmark; ernaering.md 4.5). */
export const ABSORB_L_PER_HOUR = 1.5;

/**
 * Sodium: 500–700 mg for each litre of the fluid range (Team Danmark;
 * ernaering.md 4.5), raised for races over 2 hours or in heat (Thomas 2016).
 */
export const SODIUM_MG_PER_L = 500;

/** From 25 °C the fluid range rises (fluidPerHour), and 8 % is too strong for the fluid (ernaering.md 2.3). */
export const HOT_CELSIUS = 25;

/**
 * Rice cakes in a pocket near body heat: eaten in the first one or two
 * hours, one on hot days (USDA's two hours, one above 32 °C; Kadence's
 * reading in ernaering.md 2.8).
 */
export const riceCakeUntilMinutes = (celsius: number) => (celsius >= HOT_CELSIUS ? 60 : 120);

export type FuelRace = {
  minutes: number;
  celsius: number;
  gutTrained: boolean;
  bottleMl: BottleMl;
};

/** One list of items for each hour of the race; lists past the finish are kept but not counted. */
export type Plan = FuelItemId[][];

export type Lane = { index: number; fromMin: number; toMin: number };

export type CarbState = "free" | "under" | "ok" | "over" | "gut";
export type FluidState = "under" | "ok" | "over" | "flood";
export type Mood = "good" | "hungry" | "empty" | "thirsty" | "stomach" | "slosh";

export type LaneCheck = {
  lane: Lane;
  carbs: number;
  fluidL: number;
  cumCarbs: number;
  cumFluidL: number;
  /** The recommendation from the start to the end of this hour; null when the race needs no target. */
  carbRange: Range | null;
  fluidRange: Range;
  carbState: CarbState;
  fluidState: FluidState;
  mood: Mood;
};

export type Note =
  | "capped"
  | "multiple"
  | "practise"
  | "heat"
  | "sodium"
  | "fuelHeat"
  | "riceCakeLate"
  | "fatFibre"
  | "cages"
  | "pastFinish";

export type PlanCheck = {
  advice: CarbAdvice;
  fluidPerHour: Range;
  gutCap: number;
  lanes: LaneCheck[];
  totals: { carbs: number; fluidL: number; sodiumMg: number; bottles: number; pieces: number };
  onTarget: number;
  podium: boolean;
  notes: Note[];
  /** Items left in hours after the finish when the race was made shorter. */
  pastFinish: number;
};

export function clampMinutes(minutes: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutes)));
}

/** The race in hours, the last one as long as what is left. */
export function lanesFor(minutes: number): Lane[] {
  const total = clampMinutes(minutes);
  return Array.from({ length: Math.ceil(total / 60) }, (_, index) => ({
    index,
    fromMin: index * 60,
    toMin: Math.min(total, (index + 1) * 60),
  }));
}

export function laneContent(items: readonly FuelItemId[], bottleMl: BottleMl) {
  let carbs = 0;
  let fluidL = 0;
  let sodiumMg = 0;
  for (const id of items) {
    const c = itemContent(id, bottleMl);
    carbs += c.carbs;
    fluidL += c.fluidL;
    sodiumMg += c.sodiumMg;
  }
  return { carbs, fluidL, sodiumMg };
}

/** The least sodium for the whole race: the low end of the fluid range at 500 mg a litre. */
export function sodiumLowMg(fluid: Range, hours: number): number {
  return Math.round(fluid.low * SODIUM_MG_PER_L * hours);
}

export function gutCapFor(gutTrained: boolean): number {
  return gutTrained ? MAX_CARBS_PER_HOUR : UNTRAINED_CAP;
}

const within = (value: number, range: Range, slack: number) =>
  value < range.low - slack ? "under" : value > range.high + slack ? "over" : "ok";

function moodOf(carb: CarbState, fluid: FluidState, before: CarbState | null): Mood {
  if (carb === "gut") return "stomach";
  if (carb === "under" && before === "under") return "empty";
  if (fluid === "under") return "thirsty";
  if (carb === "under") return "hungry";
  if (fluid === "over" || fluid === "flood") return "slosh";
  return "good";
}

export function checkPlan(race: FuelRace, plan: Plan): PlanCheck {
  const lanes = lanesFor(race.minutes);
  const hours = clampMinutes(race.minutes) / 60;
  const advice = carbsPerHour(hours, race.gutTrained);
  const fluid = fluidPerHour(race.celsius);
  const gutCap = gutCapFor(race.gutTrained);
  const targeted = advice.kind === "single" || advice.kind === "multiple";
  const fluidSlack = fluidSlackL(race.bottleMl);

  const checks: LaneCheck[] = [];
  let cumCarbs = 0;
  let cumFluidL = 0;
  let sodiumMg = 0;
  for (const lane of lanes) {
    const content = laneContent(plan[lane.index] ?? [], race.bottleMl);
    cumCarbs += content.carbs;
    cumFluidL += content.fluidL;
    sodiumMg += content.sodiumMg;
    const t = lane.toMin / 60;
    const carbRange = targeted ? { low: advice.low * t, high: advice.high * t } : null;
    const fluidRange = { low: fluid.low * t, high: fluid.high * t };
    const carbState: CarbState =
      content.carbs > gutCap + GUT_SLACK_G
        ? "gut"
        : carbRange
          ? within(cumCarbs, carbRange, CARB_SLACK_G)
          : "free";
    const fluidState: FluidState =
      content.fluidL > ABSORB_L_PER_HOUR + 1e-9
        ? "flood"
        : within(cumFluidL, fluidRange, fluidSlack);
    const before = checks.at(-1)?.carbState ?? null;
    checks.push({
      lane,
      carbs: content.carbs,
      fluidL: content.fluidL,
      cumCarbs,
      cumFluidL,
      carbRange,
      fluidRange,
      carbState,
      fluidState,
      mood: moodOf(carbState, fluidState, before),
    });
  }

  const counted = lanes.map((lane) => plan[lane.index] ?? []);
  const all = counted.flat();
  const bottles = all.filter((id) => FUEL_ITEMS[id].kind === "bottle").length;
  const last = counted.at(-1) ?? [];
  const riceUntil = riceCakeUntilMinutes(race.celsius);
  const notes: Note[] = [];
  if (advice.capped) notes.push("capped");
  if (checks.some((c) => c.carbs > 60)) notes.push("multiple", "practise");
  if (race.celsius >= HOT_CELSIUS) notes.push("heat");
  if (race.celsius >= HOT_CELSIUS && all.includes("fuel")) notes.push("fuelHeat");
  if ((hours > 2 || race.celsius >= HOT_CELSIUS) && sodiumMg < sodiumLowMg(fluid, hours))
    notes.push("sodium");
  if (
    lanes.some(
      (l) =>
        l.fromMin >= riceUntil && (plan[l.index] ?? []).some((id) => FUEL_ITEMS[id].perishable),
    )
  )
    notes.push("riceCakeLate");
  if (last.some((id) => FUEL_ITEMS[id].fatFibre)) notes.push("fatFibre");
  if (bottles > 2) notes.push("cages");
  const pastFinish = plan.slice(lanes.length).flat().length;
  if (pastFinish > 0) notes.push("pastFinish");

  const onTarget = checks.filter(
    (c) => (c.carbState === "ok" || c.carbState === "free") && c.fluidState === "ok",
  ).length;
  return {
    advice,
    fluidPerHour: fluid,
    gutCap,
    lanes: checks,
    totals: { carbs: cumCarbs, fluidL: cumFluidL, sodiumMg, bottles, pieces: all.length - bottles },
    onTarget,
    podium: onTarget === checks.length,
    notes,
    pastFinish,
  };
}

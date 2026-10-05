import { carbsPerHour, fluidPerHour } from "./fuel";
import {
  CARB_SLACK_G,
  clampMinutes,
  GUT_SLACK_G,
  gutCapFor,
  HOT_CELSIUS,
  laneContent,
  lanesFor,
  riceCakeUntilMinutes,
  type FuelRace,
  type Plan,
} from "./fuel-check";
import type { FuelItemId } from "./fuel-items";

/**
 * Kadence's own plan for a race, for the rider who wants to see one
 * after building their own. The bottles follow the middle of the fluid
 * range, as many as the calculator has always counted (⌈fluid ÷
 * bottle⌉), spread evenly over the hours, all of one kind: the 8 %
 * bottle above 60 g an hour, sports drink below it and whenever it is
 * hot, when Team Danmark has the fluid in a 6 % drink and the rest of
 * the carbohydrate as food (ernaering.md 2.3). Then, hour by hour, water
 * — with salt when the race is long or hot — in some of them and rice cakes or gels beside them are chosen to land
 * nearest the middle of the carbohydrate range without passing the
 * stomach's limit: rice cakes while they keep, gels after.
 * Kadence's own reading of the sources, which give no fixed rhythm
 * (Morton 2026; ernaering.md 4.6).
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

const MAX_PIECES = 3;

type Option = { items: FuelItemId[]; carbs: number; cost: number };

/** The ways to fill `bottles` bottles of `kind` or `water` and up to three pieces, with what each costs in fuss. */
function options(
  bottles: number,
  kind: FuelItemId,
  water: FuelItemId,
  riceCakes: boolean,
): Option[] {
  const out: Option[] = [];
  for (let plain = 0; plain <= bottles; plain++) {
    for (let cakes = 0; cakes <= (riceCakes ? MAX_PIECES : 0); cakes++) {
      for (let gels = 0; cakes + gels <= MAX_PIECES; gels++) {
        const items: FuelItemId[] = [
          ...Array<FuelItemId>(bottles - plain).fill(kind),
          ...Array<FuelItemId>(plain).fill(water),
          ...Array<FuelItemId>(cakes).fill("riceCake"),
          ...Array<FuelItemId>(gels).fill("gel"),
        ];
        out.push({ items, carbs: 0, cost: 2 * plain + 6 * cakes + 8 * gels });
      }
    }
  }
  return out;
}

export function suggestPlan(race: FuelRace): Plan {
  const minutes = clampMinutes(race.minutes);
  const hours = minutes / 60;
  const lanes = lanesFor(minutes);
  const advice = carbsPerHour(hours, race.gutTrained);
  const fluid = fluidPerHour(race.celsius);
  const litres = race.bottleMl / 1000;
  const gutCap = gutCapFor(race.gutTrained);
  const targeted = advice.kind === "single" || advice.kind === "multiple";
  const target = (advice.low + advice.high) / 2;
  const riceUntil = riceCakeUntilMinutes(race.celsius);
  const hot = race.celsius >= HOT_CELSIUS;
  const kind: FuelItemId = target > 60 && !hot ? "fuel" : "drink";
  const water: FuelItemId = hours > 2 || hot ? "saltWater" : "water";

  const total = Math.max(1, Math.ceil((((fluid.low + fluid.high) / 2) * hours) / litres - 1e-9));
  const share = (toMin: number) => Math.round((total * toMin) / minutes);

  let cumCarbs = 0;
  return lanes.map((lane) => {
    const bottles = share(lane.toMin) - share(lane.fromMin);
    if (!targeted) {
      if (advice.kind === "water" || bottles === 0) return Array<FuelItemId>(bottles).fill(water);
      return ["drink", ...Array<FuelItemId>(bottles - 1).fill(water)];
    }
    const goal = (target * lane.toMin) / 60;
    const low = (advice.low * lane.toMin) / 60 - CARB_SLACK_G;
    const high = (advice.high * lane.toMin) / 60 + CARB_SLACK_G;
    let best: Option | null = null;
    let bestScore = Infinity;
    for (const option of options(bottles, kind, water, lane.fromMin < riceUntil)) {
      const carbs = laneContent(option.items, race.bottleMl).carbs;
      if (carbs > gutCap + GUT_SLACK_G) continue;
      const cum = cumCarbs + carbs;
      const miss = cum < low || cum > high ? 1000 : 0;
      const score = miss + Math.abs(cum - goal) + option.cost;
      if (score < bestScore) {
        bestScore = score;
        best = { ...option, carbs };
      }
    }
    const chosen = best ?? { items: Array<FuelItemId>(bottles).fill(water), carbs: 0, cost: 0 };
    cumCarbs += chosen.carbs;
    return chosen.items;
  });
}

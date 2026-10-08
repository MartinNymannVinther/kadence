import { carbsPerHour, fluidPerHour, type CarbAdvice } from "./fuel";
import { gutCapFor } from "./fuel-day";
import {
  CARB_SLACK_G,
  clampMinutes,
  GUT_SLACK_G,
  HOT_CELSIUS,
  lanesFor,
  riceCakeUntilMinutes,
  type FuelRace,
  type Lanes,
} from "./fuel-check";
import { contentOf, type FuelItemId } from "./fuel-items";

/**
 * Kadence's example of the hours on the bike, shown under the
 * recommendation as one way to meet it. The bottles follow the middle of
 * the fluid range, as many as the calculator has always counted
 * (⌈fluid ÷ bottle⌉), spread evenly over the hours, all of one kind: the
 * homemade 8 % bottle above 60 g an hour, sports drink below it and
 * whenever it is hot, when Team Danmark has the fluid in a 6 % drink and
 * the rest of the carbohydrate as food (ernaering.md 2.3). Then, hour by
 * hour, water — with salt when the race is long or hot — in some of them
 * and rice cakes, gels or bananas beside them are chosen to land nearest the
 * middle of the carbohydrate range without passing the stomach's limit:
 * rice cakes while they keep, then gels where the race allows them
 * (`gelsFor`: a race from U17), then bananas. Ordinary food comes first
 * on purpose, as Team Danmark's ATK advises for young riders; a gel is
 * the quick carbohydrate for the later hours of a hard race. Kadence's
 * own reading of the sources, which give no fixed rhythm (Morton 2026;
 * ernaering.md 4.6).
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

const MAX_PIECES = 3;

type Option = { items: FuelItemId[]; carbs: number; cost: number };

/**
 * The ways to fill `bottles` bottles of `kind` or `water` and up to three
 * pieces, with what each costs in fuss: a rice cake least, then a gel when
 * gels are allowed, then a banana.
 */
function options(
  bottles: number,
  kind: FuelItemId,
  water: FuelItemId,
  riceCakes: boolean,
  gels: boolean,
): Option[] {
  const out: Option[] = [];
  for (let plain = 0; plain <= bottles; plain++) {
    for (let cakes = 0; cakes <= (riceCakes ? MAX_PIECES : 0); cakes++) {
      for (let gel = 0; cakes + gel <= (gels ? MAX_PIECES : cakes); gel++) {
        for (let bananas = 0; cakes + gel + bananas <= MAX_PIECES; bananas++) {
          const items: FuelItemId[] = [
            ...Array<FuelItemId>(bottles - plain).fill(kind),
            ...Array<FuelItemId>(plain).fill(water),
            ...Array<FuelItemId>(cakes).fill("riceCake"),
            ...Array<FuelItemId>(gel).fill("gel"),
            ...Array<FuelItemId>(bananas).fill("banana"),
          ];
          // Fuss: a rice cake is the cheapest piece while the cakes still
          // keep, a gel the next, a banana the last, so ordinary food comes
          // first and a gel is the standard piece after the cakes are eaten.
          // Each hour counts a gel a little more than its carbohydrate
          // alone, so one gel never beats a rice cake while both are there.
          out.push({ items, carbs: 0, cost: 2 * plain + 6 * cakes + 7 * gel + 8 * bananas });
        }
      }
    }
  }
  return out;
}

export function suggestPlan(
  race: FuelRace,
  advice: CarbAdvice = carbsPerHour(clampMinutes(race.minutes) / 60, race.gutTrained),
  { gels = false }: { gels?: boolean } = {},
): Lanes {
  const minutes = clampMinutes(race.minutes);
  const hours = minutes / 60;
  const lanes = lanesFor(minutes);
  const fluid = fluidPerHour(race.celsius);
  const litres = race.bottleMl / 1000;
  const gutCap = gutCapFor(race.gutTrained);
  const targeted = advice.kind === "single" || advice.kind === "multiple";
  const target = (advice.low + advice.high) / 2;
  const riceUntil = riceCakeUntilMinutes(race.celsius);
  const hot = race.celsius >= HOT_CELSIUS;
  const kind: FuelItemId = target > 60 && !hot ? "fuel" : "drink";
  // A gel is the standard piece once the rice cakes are eaten, so with
  // gels in play the bananas wait for a lane a gel does not fit.
  const gelLane = (lane: { fromMin: number }) => gels && lane.fromMin >= riceUntil;
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
    for (const option of options(bottles, kind, water, lane.fromMin < riceUntil, gels)) {
      const carbs = contentOf(option.items, race.bottleMl).carbs;
      if (carbs > gutCap + GUT_SLACK_G) continue;
      const cum = cumCarbs + carbs;
      const miss = cum < low || cum > high ? 1000 : 0;
      // While the rice cakes keep, a gel is a step down from a cake; once
      // they are gone, a banana is a step down from a gel. Ordinary food
      // first, then the gel as the standard piece, the banana as the reserve.
      const count = (id: FuelItemId) => option.items.filter((item) => item === id).length;
      const stepDown = gelLane(lane) ? 4 * count("banana") : 4 * count("gel");
      const score = miss + Math.abs(cum - goal) + option.cost + stepDown;
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

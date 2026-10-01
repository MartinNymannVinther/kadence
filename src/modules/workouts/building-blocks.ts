import type { BikeStructure, Intent, Repeat, Step, Zone } from "./structure";

/**
 * The bike builder's building blocks (ADR 0044): the pieces most sessions
 * are made of, one tap each, ready to change. Kadence's own starting
 * points in Kadence's own zones (ADR 0015), not DCU's prescriptions: a
 * warm-up and a cool-down at the edges, steady endurance, and the
 * interval sets coaches write most often, each with its recovery.
 *
 * Pure: imports nothing from the database.
 */

export type BlockPlace = "start" | "work" | "end";

export type BuildingBlock = { key: string; place: BlockPlace; item: Step | Repeat };

function step(intent: Intent, seconds: number, zone: Zone, cadence?: [number, number]): Step {
  return {
    kind: "step",
    intent,
    seconds,
    target: { kind: "zone", zone },
    ...(cadence ? { cadenceLow: cadence[0], cadenceHigh: cadence[1] } : {}),
  };
}

function repeat(times: number, work: Step, recover: Step): Repeat {
  return { kind: "repeat", times, steps: [work, recover] };
}

export const BUILDING_BLOCKS: readonly BuildingBlock[] = [
  { key: "warmup", place: "start", item: step("warmup", 15 * 60, 2) },
  { key: "endurance", place: "work", item: step("steady", 60 * 60, 2) },
  {
    key: "cadence",
    place: "work",
    item: repeat(4, step("work", 2 * 60, 2, [105, 115]), step("recover", 2 * 60, 1)),
  },
  {
    key: "tempo",
    place: "work",
    item: repeat(3, step("work", 10 * 60, 3), step("recover", 3 * 60, 1)),
  },
  {
    key: "threshold",
    place: "work",
    item: repeat(2, step("work", 15 * 60, 4), step("recover", 5 * 60, 1)),
  },
  {
    key: "vo2",
    place: "work",
    item: repeat(5, step("work", 4 * 60, 5), step("recover", 3 * 60, 1)),
  },
  {
    key: "sprint",
    place: "work",
    item: repeat(6, step("work", 10, 7), step("recover", 3 * 60, 1)),
  },
  { key: "cooldown", place: "end", item: step("cooldown", 10 * 60, 1) },
];

/**
 * A block into the session where it belongs: a warm-up first, a
 * cool-down last, and the work after what is there but before a closing
 * cool-down — so adding to a session reads as adding to its work.
 */
export function placeBlock(
  items: BikeStructure["steps"],
  block: BuildingBlock,
): BikeStructure["steps"] {
  if (block.place === "start") return [block.item, ...items];
  if (block.place === "end") return [...items, block.item];
  const last = items.at(-1);
  const at = last?.kind === "step" && last.intent === "cooldown" ? items.length - 1 : items.length;
  return [...items.slice(0, at), block.item, ...items.slice(at)];
}

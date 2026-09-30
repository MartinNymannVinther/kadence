import { z } from "zod";
import { drinksIn, stopKind } from "./happenings";
import type { Recording } from "./recording";

/**
 * "Today's little things" (ADR 0034): what a ride came to besides the
 * numbers, said with a smile on the screen after it. The climbing in
 * Himmelbjerge; what passed and what was passed; the cows; the stops and
 * the cups; and one thing that is not a joke — every block on target,
 * the session ridden as it was written. No calories, no points, no
 * streak and no comparison with anyone: nothing here asks for more
 * training than the coach planned. Pure.
 */

/** What the landscape showed the rider on the way, counted as it passed. */
export const seenSchema = z.object({
  cargoOvertaken: z.number().int().min(0),
  cargoOvertook: z.number().int().min(0),
  car: z.number().int().min(0),
  scooter: z.number().int().min(0),
  dog: z.number().int().min(0),
  cows: z.number().int().min(0),
});

export type Seen = z.infer<typeof seenSchema>;

export function nothingSeen(): Seen {
  return { cargoOvertaken: 0, cargoOvertook: 0, car: 0, scooter: 0, dog: 0, cows: 0 };
}

/**
 * Himmelbjerget, 147 m above the sea (Den Store Danske, "Himmelbjerget"):
 * Denmark's best-known hill, and so the measure of a Danish climb.
 */
export const HIMMELBJERGET_M = 147;

export type LittleThing =
  | { key: "himmelbjerg"; metres: number; times: number }
  | { key: keyof Seen; count: number }
  | { key: "cafe"; stops: number; cups: number }
  | { key: "stand"; stops: number; bottles: number }
  | { key: "onTarget" };

const SEEN_ORDER: (keyof Seen)[] = [
  "cargoOvertaken",
  "cargoOvertook",
  "car",
  "scooter",
  "dog",
  "cows",
];

/** How long each pause of the ride lasted, seconds, in order. */
export function pauseLengths(rec: Recording): number[] {
  const end = rec.endedAt ?? (rec.t.at(-1) ?? 0) + 1;
  return rec.pauses.map((p) => Math.max(0, (p.to ?? end) - p.from));
}

export function littleThings(input: {
  rec: Recording;
  /** Metres climbed, when the ride measured them. */
  ascentM: number | null;
  /** What the landscape showed; null where it showed nothing (no WebGL, a ride kept from before). */
  seen: Seen | null;
  allOnTarget: boolean | null;
}): LittleThing[] {
  const things: LittleThing[] = [];
  const { ascentM, seen } = input;
  if (ascentM !== null && ascentM >= 15)
    things.push({
      key: "himmelbjerg",
      metres: Math.round(ascentM),
      times: Math.round((ascentM / HIMMELBJERGET_M) * 10) / 10,
    });
  if (seen) for (const key of SEEN_ORDER) if (seen[key] > 0) things.push({ key, count: seen[key] });
  const cafe = { stops: 0, drinks: 0 };
  const stand = { stops: 0, drinks: 0 };
  pauseLengths(input.rec).forEach((seconds, index) => {
    const drinks = drinksIn(seconds);
    if (drinks === 0) return;
    const stop = stopKind(index) === "cafe" ? cafe : stand;
    stop.stops += 1;
    stop.drinks += drinks;
  });
  if (cafe.stops > 0) things.push({ key: "cafe", stops: cafe.stops, cups: cafe.drinks });
  if (stand.stops > 0) things.push({ key: "stand", stops: stand.stops, bottles: stand.drinks });
  if (input.allOnTarget) things.push({ key: "onTarget" });
  return things;
}

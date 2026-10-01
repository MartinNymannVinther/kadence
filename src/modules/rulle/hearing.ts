import type { Course } from "./route/course";
import { crowdAt, type RaceDay } from "./route/race-day";

/**
 * What a rider hears of the road (ADR 0045), for the sound under the ride:
 * how fast the road runs under the wheels, whether it runs through the
 * open country, a town or a city, and on race day how many stand by it,
 * from nobody (0) to the finish (1). `mixOf` turns that into how loud each
 * part of the sound is. Pure: the browser's sound is made from it in
 * `ambience.ts`.
 */

export type Place = "country" | "town" | "city";

export type Heard = {
  /** Metres a second the road runs under the wheels, as the landscape shows it. */
  speed: number;
  place: Place;
  /** How many stand by the road, 0 to 1. */
  crowd: number;
};

export const HEARING = {
  /** Metres round the rider in which the buildings make a town. */
  townRadius: 150,
  /** This many buildings within it, and the road runs through a town. */
  townBuildings: 10,
  /** Metres before and after the rider over which the crowd is heard. */
  crowdReach: 60,
  /** Metres between the places along the road the crowd is counted at. */
  crowdStep: 10,
} as const;

/** The size of the squares the buildings are kept in, metres. */
const CELL = 100;

/** The buildings of the land, kept by square, so a town is found fast while riding. */
export class Towns {
  private readonly cells = new Map<string, number[]>();

  constructor(buildings: readonly { x: number; y: number }[]) {
    for (const b of buildings) {
      const key = `${Math.floor(b.x / CELL)},${Math.floor(b.y / CELL)}`;
      const cell = this.cells.get(key);
      if (cell) cell.push(b.x, b.y);
      else this.cells.set(key, [b.x, b.y]);
    }
  }

  /** How many buildings stand within `r` metres of a place on the course's plane. */
  count(x: number, y: number, r: number): number {
    let n = 0;
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
      for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;
        for (let k = 0; k < cell.length; k += 2)
          if (Math.hypot(cell[k]! - x, cell[k + 1]! - y) <= r) n++;
      }
    return n;
  }
}

/** Where the road runs at a place on the course's plane: a city's course is the city's throughout. */
export function placeAt(towns: Towns | null, x: number, y: number, city: boolean): Place {
  if (city) return "city";
  if (!towns) return "country";
  return towns.count(x, y, HEARING.townRadius) >= HEARING.townBuildings ? "town" : "country";
}

/**
 * How many stand by the road round the rider on race day, 0 to 1: the rows
 * and how full they are on both sides, a little way before and after,
 * those nearest counting most. The finish, three deep, is 1.
 */
export function crowdHeard(day: RaceDay, course: Course, along: number): number {
  const { crowdReach: reach, crowdStep: step } = HEARING;
  let sum = 0;
  let weights = 0;
  for (let k = -reach; k <= reach; k += step) {
    const weight = 1 - Math.abs(k) / (reach + step);
    weights += weight;
    for (const side of [1, -1] as const) {
      const crowd = crowdAt(day, course, along + k, side);
      sum += weight * crowd.rows * crowd.fill;
    }
  }
  // Three rows, eight in ten filled, on both sides.
  return Math.min(1, sum / weights / (2 * 3 * 0.8));
}

/** How loud each part of the sound under the ride is, as gains, and its filters, in hertz. */
export type Mix = {
  /** The tyres on the road: louder and brighter with speed, silent standing still. */
  road: { gain: number; cutoff: number };
  /** The wind past the ears: a breath standing still, a roar going fast. */
  wind: { gain: number; centre: number };
  /** A town's or a city's low hum, and its traffic far off. */
  hum: number;
  traffic: number;
  /** The crowd's murmur, and its cheering where it stands thickest. */
  crowd: number;
  cheers: boolean;
  /** Seconds between birdsong, on average; null where no bird is heard. */
  birds: number | null;
};

/** Faster than this, the wind drowns the birds. */
const BIRDS_UNDER = 14;

export function mixOf({ speed, place, crowd }: Heard): Mix {
  const v = Math.max(0, Math.min(30, speed));
  const c = Math.max(0, Math.min(1, crowd));
  return {
    road: { gain: Math.min(0.09, 0.009 * v), cutoff: 120 + 45 * v },
    wind: { gain: Math.min(0.14, 0.004 + 0.0006 * v * v), centre: 500 + 60 * v },
    hum: place === "city" ? 0.08 : place === "town" ? 0.045 : 0,
    traffic: place === "city" ? 0.02 : place === "town" ? 0.008 : 0,
    crowd: 0.12 * c,
    cheers: c >= 0.75,
    birds: v > BIRDS_UNDER ? null : place === "country" ? 7 : place === "town" ? 20 : null,
  };
}

import { encodeRide, noise, type RideSample } from "./ride-encoder";
import { altitudeOn, positionOn, ROUTES, type Route } from "./routes";

/**
 * The demo's rides: a session the team planned, ridden by one of its
 * riders as a real FIT file — a route from `routes.ts`, the planned
 * minutes give or take, and watt, pulse and cadence that follow the
 * session's kind: steady for an endurance ride, blocks at tempo, four
 * hard efforts for a VO2 session, surges and a sprint for a race. The
 * watt is the rider's own, scaled from their threshold, so every rider's
 * records are their own. Deterministic from the seed.
 */

export type RideKind = "endurance" | "tempo" | "vo2" | "race";

export type RideSpec = {
  route: Route;
  kind: RideKind;
  minutes: number;
  ftp: number;
  thresholdHr: number;
  /** Rider's variation from the plan: 1 rides it as planned, 0.9 a little shorter. */
  factor: number;
  seed: number;
  /** A stop on the way: coffee on a long ride. */
  stopSeconds?: number;
};

/** The session's kind from its title, as the demo's library names them. */
export function kindOf(title: string): RideKind {
  if (/vo2/i.test(title)) return "vo2";
  if (/tempo|\bAT\b|tærskel/i.test(title)) return "tempo";
  if (/løb|race/i.test(title)) return "race";
  return "endurance";
}

/**
 * The route for a day's ride: the team rides together, so every rider on
 * the same day gets the same loop — round the eight in turn by day, long
 * rides on the long loops.
 */
export function routeFor(n: number, minutes: number): Route {
  const long = ROUTES.filter((r) => r.loopM >= 40_000);
  const short = ROUTES.filter((r) => r.loopM < 40_000);
  const pool = minutes >= 120 ? long : minutes <= 60 ? short : ROUTES;
  return pool[n % pool.length]!;
}

/** Share of threshold this second is ridden at, by the session's kind. */
function intensity(kind: RideKind, s: number, total: number, jitter: (v: number) => number) {
  const warm = 10 * 60;
  const cool = 8 * 60;
  if (s < warm) return 0.55 + (s / warm) * 0.1 + jitter(0.05);
  if (s > total - cool) return 0.55 + jitter(0.05);
  const work = s - warm;
  switch (kind) {
    case "vo2": {
      // 4 × 4 min at 115 %, 4 min easy between.
      const cycle = 8 * 60;
      const inSet = work % cycle < 4 * 60 && Math.floor(work / cycle) < 4;
      return inSet ? 1.15 + jitter(0.06) : 0.5 + jitter(0.05);
    }
    case "tempo": {
      // 3 × 10 min at 85–90 %, 5 min between.
      const cycle = 15 * 60;
      const inSet = work % cycle < 10 * 60 && Math.floor(work / cycle) < 3;
      return inSet ? 0.87 + jitter(0.04) : 0.55 + jitter(0.05);
    }
    case "race": {
      const surge = Math.floor(work / 90) % 5 === 0;
      return (surge ? 1.2 : 0.75) + jitter(0.15);
    }
    default:
      return 0.66 + jitter(0.07);
  }
}

export function simulateRide(spec: RideSpec): RideSample[] {
  const jitter = noise(spec.seed);
  const total = Math.round(spec.minutes * spec.factor * 60);
  const samples: RideSample[] = [];
  const restHr = 50;
  let m = 0;
  let s = 0;
  let hr = 95;
  let stopped = false;
  const stopAt = total * 0.55;
  const sprint = spec.kind === "race" ? Math.round(total * 0.92) : -1;
  for (let clock = 0; clock < total; clock++) {
    if (spec.stopSeconds && !stopped && clock >= stopAt) {
      stopped = true;
      s += spec.stopSeconds;
      hr = 100;
    }
    const grade = (altitudeOn(spec.route, m + 10) - altitudeOn(spec.route, m)) / 10;
    let share = intensity(spec.kind, clock, total, jitter);
    if (sprint >= 0 && clock >= sprint && clock < sprint + 12) share = 2.6 + jitter(0.2);
    if (grade > 0.02) share = Math.max(share, 0.95 + jitter(0.06));
    if (grade < -0.02) share = jitter(1) > 0.3 ? 0 : 0.3;
    const power = Math.max(0, Math.round(share * spec.ftp));
    // Speed from power and grade, roughly: flat at 65 % is 33 km/h.
    const flat = 6.5 + share * 4;
    const speed = Math.max(3.5, flat - 80 * grade + jitter(0.4));
    const target = Math.min(
      spec.thresholdHr + 14,
      restHr + (spec.thresholdHr - restHr) * Math.min(1.1, 0.15 + share * 0.9) + (s / 3600) * 3,
    );
    hr += (target - hr) / 25 + jitter(0.6);
    const p = positionOn(spec.route, m);
    samples.push({
      s,
      m,
      alt: altitudeOn(spec.route, m),
      speed,
      power,
      hr: Math.round(hr),
      cadence: power === 0 ? 0 : Math.round((grade > 0.02 ? 78 : share > 1 ? 100 : 90) + jitter(4)),
      lat: p.lat,
      lon: p.lon,
    });
    m += speed;
    s += 1;
  }
  return samples;
}

export function rideFit(spec: RideSpec, startMs: number): Uint8Array {
  return encodeRide(simulateRide(spec), startMs, 10_000);
}

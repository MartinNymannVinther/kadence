/**
 * Rollout: how far the bike travels on one turn of the pedals in a
 * given gear, the measure DCU limits for the young classes
 * (src/modules/dcu/gearing.ts). rollout = chainring teeth ÷ sprocket
 * teeth × wheel circumference. A commissaire checks the biggest gear —
 * the biggest chainring with the smallest sprocket — by rolling the bike
 * backwards one pedal turn (docs/research/klasser-og-gearing.md, 3.4).
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type TyreId = "23" | "25" | "28" | "30" | "32";

/**
 * Wheel circumference for a 700C wheel by tyre width, in millimetres,
 * from Garmin's table ("Wheel Size and Circumference"). The real figure
 * moves with the tyre's brand, the rim's width, the pressure and wear;
 * DCU's own examples for 25 mm work out at about 2112 mm. Only a
 * measurement on the bike is certain, and the calculator says so.
 */
export const TYRES: Record<TyreId, number> = {
  "23": 2096,
  "25": 2105,
  "28": 2136,
  "30": 2146,
  "32": 2155,
};

export const TYRE_IDS = Object.keys(TYRES) as TyreId[];

/**
 * Below this distance under the limit a bike is "close": tyre pressure,
 * wear and the way it is measured move a rollout by a few centimetres. A
 * British guide advises staying 5–10 cm under (gearcalc.co.uk, 2026);
 * Kadence warns at 5.
 */
export const CLOSE_MARGIN_M = 0.05;

/** Smallest and largest teeth the calculator accepts, so a typo stays a typo. */
export const TEETH = { ringMin: 20, ringMax: 60, cogMin: 9, cogMax: 52 } as const;

export function rolloutM(ring: number, cog: number, circumferenceMm: number): number {
  return (ring / cog) * (circumferenceMm / 1000);
}

export type GearStatus = "free" | "within" | "close" | "over";

export function gearStatus(rollout: number, limitM: number | null): GearStatus {
  if (limitM === null) return "free";
  if (rollout > limitM) return "over";
  if (limitM - rollout < CLOSE_MARGIN_M) return "close";
  return "within";
}

/** Rounding guard: 48/14 at a limit that is exactly 48/14 must count as legal. */
const EPSILON = 1e-9;

/** The biggest chainring that keeps this sprocket within the limit. */
export function largestRing(cog: number, limitM: number, circumferenceMm: number): number {
  return Math.floor((limitM * 1000 * cog) / circumferenceMm + EPSILON);
}

/** The smallest sprocket that keeps this chainring within the limit. */
export function smallestCog(ring: number, limitM: number, circumferenceMm: number): number {
  return Math.ceil((ring * circumferenceMm) / (limitM * 1000) - EPSILON);
}

export type BikeCheck = {
  ring: number;
  cog: number;
  rolloutM: number;
  status: GearStatus;
  /** Metres under the limit (negative when over); null with free gearing. */
  marginM: number | null;
  /** With this smallest sprocket, the biggest chainring that passes. */
  largestRing: number | null;
  /** With this big chainring, the smallest sprocket that passes. */
  smallestCog: number | null;
};

/** The bike's biggest gear against the class's limit. */
export function checkBike(
  ring: number,
  cog: number,
  circumferenceMm: number,
  limitM: number | null,
): BikeCheck {
  const rollout = rolloutM(ring, cog, circumferenceMm);
  return {
    ring,
    cog,
    rolloutM: rollout,
    status: gearStatus(rollout, limitM),
    marginM: limitM === null ? null : limitM - rollout,
    largestRing: limitM === null ? null : largestRing(cog, limitM, circumferenceMm),
    smallestCog: limitM === null ? null : smallestCog(ring, limitM, circumferenceMm),
  };
}

/** The table of the biggest legal chainring for each smallest sprocket. */
export function ringTable(
  cogs: readonly number[],
  limitM: number,
  circumferenceMm: number,
): { cog: number; ring: number; rolloutM: number }[] {
  return cogs.map((cog) => {
    const ring = largestRing(cog, limitM, circumferenceMm);
    return { cog, ring, rolloutM: rolloutM(ring, cog, circumferenceMm) };
  });
}

/** A bicycle chain's pitch, half an inch, in millimetres. */
export const CHAIN_PITCH_MM = 12.7;

/**
 * The pitch radius of a chainring or sprocket: where the chain's pins sit
 * on a wheel of `teeth` teeth, so the drawing's rings grow with the
 * teeth chosen. r = pitch ÷ (2 · sin(180° ÷ teeth)).
 */
export function pitchRadiusMm(teeth: number): number {
  return CHAIN_PITCH_MM / (2 * Math.sin(Math.PI / teeth));
}

/** How many times the rear wheel turns for one turn of the pedals. */
export function wheelTurns(ring: number, cog: number): number {
  return ring / cog;
}

export function validTeeth(ring: number, cog: number): boolean {
  return (
    Number.isInteger(ring) &&
    Number.isInteger(cog) &&
    ring >= TEETH.ringMin &&
    ring <= TEETH.ringMax &&
    cog >= TEETH.cogMin &&
    cog <= TEETH.cogMax
  );
}

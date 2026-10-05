import {
  cassetteFor,
  CHAINRINGS,
  ORDINARY_COGS,
  type CassettePick,
  type ChainringFamily,
} from "./gear-products";
import { largestRing, rolloutM, smallestCog } from "./gearing";

/**
 * A concrete build for the gear chosen on the sliders (ADR 0055): which
 * cassette and which chainring would give it, and when the gear is over
 * the class's limit, the two nearest builds that hold — one keeping the
 * chainring, one keeping the sprocket. Built only from the parts in
 * gear-products.ts. The reader chooses two rings in front or one, and
 * every function takes that `kind`; without it, any ring will do.
 *
 * Pure: imports nothing from the database.
 */

/** The biggest smallest sprocket the calculator knows a cassette for. */
export const MAX_COG = 16;

/** A drawing of a sprocket ladder needs the largest sprocket of an ordinary cassette too. */
export const ORDINARY_RANGE: Record<number, readonly [number, number]> = {
  10: [10, 33], // SRAM XG-1270 10-33 (SRAM support)
  11: [11, 30], // Shimano CS-R8100/R9200 11-30 (probikestock)
};

export type RingPick = { family: ChainringFamily; set: readonly number[] };

/** Two rings in front, one, or either. */
export type RingKind = ChainringFamily["kind"] | undefined;

const families = (kind: RingKind) =>
  kind === undefined ? CHAINRINGS : CHAINRINGS.filter((f) => f.kind === kind);

export type Build = {
  ring: number;
  cog: number;
  rolloutM: number;
  /** True when the sprocket is an ordinary cassette's and no product is named. */
  ordinary: boolean;
  /** The cassette suggested first — 12-speed where one exists — and an 11-speed besides. */
  cassette: CassettePick | null;
  cassette11: CassettePick | null;
  /** The first product whose big ring is `ring`, doubles before singles. */
  chainring: RingPick | null;
};

export function ringProduct(ring: number, kind?: RingKind): RingPick | null {
  for (const family of families(kind)) {
    const set = family.sets.find(([big]) => big === ring);
    if (set) return { family, set };
  }
  return null;
}

/** The biggest ring at most `max` teeth that some product in the list carries. */
export function biggestRingUpTo(max: number, kind?: RingKind): number | null {
  const rings = families(kind)
    .flatMap((f) => f.sets.map(([big]) => big!))
    .filter((r) => r <= max);
  return rings.length > 0 ? Math.max(...rings) : null;
}

export function buildFor(
  ring: number,
  cog: number,
  circumferenceMm: number,
  kind?: RingKind,
): Build {
  const ordinary = ORDINARY_COGS.includes(cog);
  const twelve = ordinary ? null : cassetteFor(cog, 12);
  const eleven = ordinary ? null : cassetteFor(cog, 11);
  return {
    ring,
    cog,
    rolloutM: rolloutM(ring, cog, circumferenceMm),
    ordinary,
    cassette: twelve ?? eleven,
    cassette11: twelve ? eleven : null,
    chainring: ringProduct(ring, kind),
  };
}

export type Proposal =
  | {
      kind: "fits";
      build: Build;
      /** The ring asked for when no product carries it and a smaller one is used. */
      asked: number | null;
    }
  | { kind: "over"; keepRing: Build | null; keepCog: Build | null; needCog: number };

/**
 * The build for the chosen ring and sprocket. Within the limit (or with
 * free gearing) it is the gear itself, on the nearest smaller ring a
 * product carries if none carries the one chosen. Over the limit it is
 * two builds that hold: the chosen ring with the smallest sprocket that
 * passes, and the chosen sprocket with the biggest ring that passes.
 */
export function propose(
  ring: number,
  cog: number,
  limitM: number | null,
  circumferenceMm: number,
  kind?: RingKind,
): Proposal {
  if (limitM === null || rolloutM(ring, cog, circumferenceMm) <= limitM) {
    const used = ringProduct(ring, kind) ? ring : (biggestRingUpTo(ring, kind) ?? ring);
    return {
      kind: "fits",
      build: buildFor(used, cog, circumferenceMm, kind),
      asked: used === ring ? null : ring,
    };
  }
  const needCog = smallestCog(ring, limitM, circumferenceMm);
  const ringUsed = ringProduct(ring, kind) ? ring : biggestRingUpTo(ring, kind);
  const keepRing =
    needCog <= MAX_COG && ringUsed !== null
      ? buildFor(ringUsed, needCog, circumferenceMm, kind)
      : null;
  const legalRing = biggestRingUpTo(largestRing(cog, limitM, circumferenceMm), kind);
  const keepCog = legalRing !== null ? buildFor(legalRing, cog, circumferenceMm, kind) : null;
  return { kind: "over", keepRing, keepCog, needCog };
}

/**
 * The sprockets of a cassette for a drawing: `speeds` of them from the
 * smallest to the largest, spaced evenly by ratio. Only the ends are
 * the real cassette's; the ones between are an illustration.
 */
export function sprocketLadder(smallest: number, largest: number, speeds: number): number[] {
  return Array.from({ length: speeds }, (_, i) =>
    Math.round(smallest * (largest / smallest) ** (i / (speeds - 1))),
  );
}

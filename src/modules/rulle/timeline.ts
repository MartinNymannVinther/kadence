import { expandPlan, targetRange, type PlannedStep, type Thresholds } from "@/modules/load";
import { cadenceOf, powerPct } from "@/modules/workouts/export";
import { flattenSteps, type BikeStructure } from "@/modules/workouts/structure";

/**
 * A planned bike session as Rulle rides it: one block per step, repeats
 * unrolled (the plan-against-ride's `expandPlan`, so both read a session
 * the same way), each with the watts to hold and the watts that count.
 *
 * - `watts` is what an ERG trainer holds: the one power the workout files
 *   write for the target (`powerPct`, ZONE_FTP_RIDE for a zone) times the
 *   rider's FTP. A block with no power in it — an RPE, "open", a sprint —
 *   has none and is ridden freely; so is every block for a rider whose
 *   FTP nobody has set, since percent of nothing is no watts.
 * - `band` is what counts as riding the block: the target's own range for
 *   the rider (a zone's band, a share of FTP as written), widened to five
 *   per cent either side of `watts` where the range is narrower, so a
 *   step written as "95–95 %" is not missed by one watt.
 * - `bpm` is the pulse, for a target in heart rate and for a zone when
 *   the rider's threshold heart rate is known.
 *
 * The rider's intensity (100 % unless they turned it) scales both. Pure.
 */

/** Either side of the watts, the least that still counts as on target. */
export const ON_TARGET_SLACK = 0.05;

export type Band = { low: number; high: number };

export type Block = PlannedStep & {
  /** Seconds from the session's start to this block's end. */
  to: number;
  /** The watts an ERG trainer holds at full intensity; null when the block is ridden freely. */
  watts: number | null;
  band: Band | null;
  bpm: Band | null;
  cadence: number | null;
};

export type SessionTimeline = { blocks: Block[]; seconds: number };

export type BlockNow = {
  index: number;
  block: Block;
  /** Seconds left of the block. */
  remaining: number;
  /** Seconds ridden into it. */
  into: number;
};

/** Where on target the rider is: in the band, below it, above it, or free of one. */
export type Standing = "on" | "under" | "over" | "free" | "unknown";

function usable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function buildTimeline(structure: BikeStructure, rider: Thresholds): SessionTimeline {
  const ftp = usable(rider.ftp) ? rider.ftp : null;
  // In expandPlan's order, repeats unrolled; these keep the steps' cadence.
  const steps = flattenSteps(structure);
  const blocks = expandPlan(structure).map((step, i): Block => {
    const range = targetRange(step.target, rider);
    const pct = powerPct(step.target);
    const watts = ftp !== null && pct !== null ? Math.round((pct / 100) * ftp) : null;
    return {
      ...step,
      to: step.from + step.seconds,
      watts,
      band: watts === null ? null : widen(range?.watts ?? null, watts),
      bpm: range?.bpm ?? null,
      cadence: cadenceOf(steps[i] ?? {}),
    };
  });
  return { blocks, seconds: blocks.at(-1)?.to ?? 0 };
}

/** The block the session is in at `second`, or null once it is over. */
export function blockAt(timeline: SessionTimeline, second: number): BlockNow | null {
  if (second < 0) return null;
  const index = timeline.blocks.findIndex((b) => second < b.to);
  if (index < 0) return null;
  const block = timeline.blocks[index]!;
  return { index, block, remaining: block.to - second, into: second - block.from };
}

/** The watts to hold, at the rider's intensity; null for a free block. */
export function ergWatts(block: Block, intensity: number): number | null {
  return block.watts === null ? null : Math.round(block.watts * intensity);
}

/** The band at the rider's intensity. */
export function scaledBand(block: Block, intensity: number): Band | null {
  if (!block.band) return null;
  return {
    low: Math.round(block.band.low * intensity),
    high: Math.round(block.band.high * intensity),
  };
}

/** On target, under or over, for the watts the rider is putting out now (a few seconds' average). */
export function standing(block: Block, watts: number | null, intensity: number): Standing {
  const band = scaledBand(block, intensity);
  if (!band) return "free";
  if (watts === null) return "unknown";
  if (watts < band.low) return "under";
  if (watts > band.high) return "over";
  return "on";
}

function widen(band: Band | null, watts: number): Band {
  const low = Math.round(watts * (1 - ON_TARGET_SLACK));
  const high = Math.round(watts * (1 + ON_TARGET_SLACK));
  if (!band) return { low, high };
  return { low: Math.min(band.low, low), high: Math.max(band.high, high) };
}

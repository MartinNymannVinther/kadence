import { standing, type Block, type SessionTimeline } from "@/modules/rulle";

/** A block counts as ridden on target when this share of its seconds were, and this share of it was ridden. */
const ON_TARGET_SHARE = 0.75;
const RIDDEN_SHARE = 0.9;

/**
 * Whether a session was ridden as it was written (ADR 0034): every block
 * with watts to hold ridden, and on target for most of it — nothing
 * skipped, the ride not ended early. What "Today's little things" says
 * with its one mark that is not a joke.
 */
export class OnTarget {
  private readonly tallies: { seconds: number; on: number }[] = [];
  private skipped = false;

  constructor(private readonly timeline: SessionTimeline | null) {}

  /** A second ridden in block `index`, at this 3-second power and intensity. */
  second(index: number, block: Block, power3s: number | null, intensity: number): void {
    if (!block.band) return;
    const tally = (this.tallies[index] ??= { seconds: 0, on: 0 });
    tally.seconds += 1;
    if (standing(block, power3s, intensity) === "on") tally.on += 1;
  }

  skip(): void {
    this.skipped = true;
  }

  /** Null for a session with no block to hold, or a ride nothing measured the watts of. */
  verdict(measured: boolean): boolean | null {
    if (!this.timeline || !measured) return null;
    const held = this.timeline.blocks.flatMap((block, i) => (block.band ? [{ block, i }] : []));
    if (held.length === 0) return null;
    if (this.skipped) return false;
    return held.every(({ block, i }) => {
      const tally = this.tallies[i];
      return (
        tally !== undefined &&
        tally.seconds >= block.seconds * RIDDEN_SHARE &&
        tally.on >= tally.seconds * ON_TARGET_SHARE
      );
    });
  }
}

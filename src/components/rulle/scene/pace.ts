/**
 * Watches how fast the frames come, and gives the picture fewer pixels a
 * step at a time when the device cannot keep up: a slow tablet is better
 * served by a picture a little soft that moves smoothly than by a sharp
 * one that stutters. It only steps down, never up again during a ride — a
 * frame that is on time says nothing about how much time was to spare,
 * and a picture that changes sharpness back and forth is worse than one
 * that stays a little soft.
 */

/** Frames in each verdict: a second and a half at sixty a second. */
const WINDOW = 90;
/** Left out at the start, while the landscape is still being built and sent to the GPU. */
const WARM_UP = 120;
/** The median frame, seconds, above which the device is behind: fewer than 45 a second. */
const SLOW = 1 / 45;
/** Verdicts in a row it takes to step down: one slow moment is not a slow device. */
const IN_A_ROW = 2;
/** What each step takes off the ratio of the canvas's pixels to the page's. */
const STEP = 0.25;

export class Pace {
  private seen = 0;
  private window: number[] = [];
  private slow = 0;

  constructor(
    private ratio: number,
    private readonly floor: number,
  ) {}

  /** A frame came `seconds` after the last: the new pixel ratio when it is time for fewer pixels, else null. */
  frame(seconds: number): number | null {
    // No frames for a while — a hidden tab, a pause — says nothing about the device.
    if (!(seconds > 0) || seconds > 0.25) return null;
    if (++this.seen <= WARM_UP) return null;
    this.window.push(seconds);
    if (this.window.length < WINDOW) return null;
    const median = this.window.sort((a, b) => a - b)[this.window.length >> 1]!;
    this.window = [];
    this.slow = median > SLOW ? this.slow + 1 : 0;
    if (this.slow < IN_A_ROW || this.ratio <= this.floor) return null;
    this.slow = 0;
    this.ratio = Math.max(this.floor, this.ratio - STEP);
    return this.ratio;
  }
}

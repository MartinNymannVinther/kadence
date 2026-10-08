/**
 * Development only: the rider's way along the route run faster, or
 * backwards — to look at a route's far end, a city's finish or a climb
 * without riding there first. Only where the rider is shown moves: the
 * landscape, the map and the profile. What is recorded is what was ridden.
 */

/** The speeds offered, times the rider's own. */
export const WARPS = [1, 2, 4, 8, 20] as const;
/** Metres a second a warp runs from where the rider barely moves. */
const FROM = 8;

export class Warp {
  /** Times the rider's speed along the route; negative runs it backwards. */
  factor = 1;
  private shift = 0;

  /**
   * Metres a second the shown place runs away from the ridden one, going
   * `speed`: the rider's, and the challenger's by the same rule (`race.ts`).
   */
  rate(speed: number): number {
    return this.factor === 1 ? 0 : (this.factor - 1) * Math.max(speed, FROM);
  }

  /** `seconds` more ridden at `speed`: the shown place runs on. */
  advance(speed: number, seconds: number): void {
    this.shift += this.rate(speed) * seconds;
  }

  /** Where the rider is shown: ridden `distance` in, `since` seconds after the last step. */
  shown(distance: number, speed: number, since = 0): number {
    return distance + this.shift + this.rate(speed) * since;
  }
}

import { swayAt } from "@/modules/rulle";

/**
 * The cheat code's bike (ADR 0045): typed SPURT, or the rider tapped five
 * times, and the keys hold the bike's speed and its line on the road — up
 * to 120 km/h, from kerb to kerb. Let go, and it keeps the speed it has.
 * Only where the rider is shown moves, as with the developer's warp: the
 * watts, the heart rate, the cadence, the time and the distance recorded
 * are what was ridden, and the trainer never feels it. Turned off, the
 * rider glides back to their own line and rides on from where the cheat
 * left them. No React and no browser in it.
 */

export const CHEAT = {
  /** The top speed, m/s: 120 km/h. */
  top: 120 / 3.6,
  /** How fast the speed rises and falls under the keys, m/s each second. */
  faster: 5,
  slower: 9,
  /** How fast the bike crosses the road under the keys, m/s, and how far from the middle it may go. */
  across: 3.2,
  edge: 2.6,
  /** The most the bike leans into a turn, radians, and how quickly it gets there. */
  lean: 0.32,
  leanRate: 6,
} as const;

/** A key held one way or the other, or neither. */
export type Push = -1 | 0 | 1;

export class Cheat {
  on = false;
  /** Faster (1), slower (-1), or holding the speed (0). */
  throttle: Push = 0;
  /** Right (1), left (-1), or straight on (0). */
  steer: Push = 0;
  private bikeSpeed = 0;
  private bikeLine: number | null = null;
  private leaning = 0;
  private shift = 0;

  /** Turns the cheat on or off; on, from the speed and the place the rider is shown at. */
  toggle(speed: number, shown: number): void {
    this.on = !this.on;
    this.throttle = 0;
    this.steer = 0;
    if (!this.on) return;
    this.bikeSpeed = Math.max(0, Math.min(CHEAT.top, speed));
    this.bikeLine ??= swayAt(shown);
  }

  /**
   * `seconds` ridden at `speed` (the true one), the rider shown `shown`
   * metres along: the speed and the line under the keys, and the place
   * shown running ahead of the ridden one, or behind it.
   */
  advance(speed: number, shown: number, seconds: number): void {
    if (this.on) {
      const change = this.throttle > 0 ? CHEAT.faster : this.throttle < 0 ? -CHEAT.slower : 0;
      this.bikeSpeed = Math.max(0, Math.min(CHEAT.top, this.bikeSpeed + change * seconds));
      this.shift += (this.bikeSpeed - speed) * seconds;
    }
    const lean = this.on ? -this.steer * CHEAT.lean : 0;
    this.leaning += (lean - this.leaning) * (1 - Math.exp(-seconds * CHEAT.leanRate));
    if (this.bikeLine === null) return;
    const step = CHEAT.across * seconds;
    if (this.on) {
      this.bikeLine = Math.max(
        -CHEAT.edge,
        Math.min(CHEAT.edge, this.bikeLine + this.steer * step),
      );
      return;
    }
    // Off: back to the rider's own line, at the same pace, and then the line is theirs again.
    const own = swayAt(shown);
    const gap = own - this.bikeLine;
    this.bikeLine = Math.abs(gap) <= step ? null : this.bikeLine + Math.sign(gap) * step;
  }

  /** What the keys hold now; nothing while the cheat is off. */
  hold(throttle: Push, steer: Push): void {
    if (!this.on) return;
    this.throttle = throttle;
    this.steer = steer;
  }

  /** Where the rider is shown, ridden `distance` in at `speed`, `since` seconds after the last step. */
  shown(distance: number, speed: number, since = 0): number {
    return distance + this.shift + (this.on ? (this.bikeSpeed - speed) * since : 0);
  }

  /** The speed the rider is shown going. */
  speed(speed: number): number {
    return this.on ? this.bikeSpeed : speed;
  }

  /** Metres right of the road's middle the rider is shown; null where the rider's own line is. */
  get line(): number | null {
    return this.bikeLine;
  }

  /** How far the bike leans into the turn, radians: positive to the left. */
  get lean(): number {
    return this.leaning;
  }
}

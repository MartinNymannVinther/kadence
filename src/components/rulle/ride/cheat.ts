import { swayAt } from "@/modules/rulle";
import { nextSpeed } from "@/modules/rulle/physics";
import { WattDial, type WattUnit } from "./watt-dial";

/**
 * The cheat code's bike (ADR 0045): typed SPURT, or the rider tapped five
 * times, and the keys hold the bike's speed and its line on the road — up
 * to 120 km/h, from kerb to kerb. Let go, and it keeps the speed it has.
 * Typed WATT (ADR 0048), the keys set the watts instead (`watt-dial.ts`),
 * and the bike goes as fast as those watts take an avatar of the weight
 * chosen up the road and down it.
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

/** SPURT holds the speed, WATT the watts. */
export type CheatMode = "speed" | "watts";

/** What the screen shows of the cheat: null while it is off. */
export type CheatState = { mode: CheatMode; watts: number; kg: number; unit: WattUnit } | null;

export class Cheat {
  on = false;
  mode: CheatMode = "speed";
  readonly dial = new WattDial();
  /** Faster (1), slower (-1), or holding the speed (0). */
  throttle: Push = 0;
  /** Right (1), left (-1), or straight on (0). */
  steer: Push = 0;
  private bikeSpeed = 0;
  private bikeLine: number | null = null;
  private leaning = 0;
  private shift = 0;

  /**
   * The code for `mode` typed: off if it is the one on, on — or over to it
   * from the other — if not. On, from the speed and the place the rider is
   * shown at; WATT from the watts that hold that speed on `grade`.
   */
  toggle(speed: number, shown: number, mode: CheatMode = "speed", grade = 0): void {
    const switching = this.on && this.mode !== mode;
    this.on = switching || !this.on;
    this.throttle = 0;
    this.steer = 0;
    this.dial.hold(0);
    if (!this.on) return;
    if (!switching) this.bikeSpeed = Math.max(0, Math.min(CHEAT.top, speed));
    this.mode = mode;
    if (mode === "watts") this.dial.startFrom(this.bikeSpeed, grade);
    this.bikeLine ??= swayAt(shown);
  }

  /**
   * `seconds` ridden at `speed` (the true one), the rider shown `shown`
   * metres along where the road climbs `grade` and pushes an `air` share of
   * the air (less in the challenger's wheel): the speed and the line under
   * the keys, and the place shown running ahead of the ridden one, or
   * behind it.
   */
  advance(speed: number, shown: number, seconds: number, grade = 0, air = 1): void {
    if (this.on && this.mode === "watts") {
      this.dial.advance(seconds);
      const { watts, massKg } = this.dial;
      this.bikeSpeed = nextSpeed(this.bikeSpeed, watts, grade, seconds, massKg, air);
    } else if (this.on) {
      const change = this.throttle > 0 ? CHEAT.faster : this.throttle < 0 ? -CHEAT.slower : 0;
      this.bikeSpeed = Math.max(0, Math.min(CHEAT.top, this.bikeSpeed + change * seconds));
    }
    if (this.on) this.shift += (this.bikeSpeed - speed) * seconds;
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

  /** What the keys hold now; nothing while the cheat is off. Up and down are watts on WATT. */
  hold(throttle: Push, steer: Push): void {
    if (!this.on) return;
    this.throttle = throttle;
    this.steer = steer;
    if (this.mode === "watts") this.dial.hold(throttle);
  }

  /** What the screen shows of it. */
  state(): CheatState {
    if (!this.on) return null;
    const { watts, kg, unit } = this.dial;
    return { mode: this.mode, watts, kg, unit };
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

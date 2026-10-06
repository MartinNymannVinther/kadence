import {
  CHALLENGE,
  challengerEffort,
  challengerWatts,
  jumpAt,
  nextSpeed,
  reserveAfter,
  SPRINTER,
  swayAt,
  wattsFor,
  type ChallengerEffort,
  type Rival as Who,
} from "@/modules/rulle";

/**
 * Who races the rider (`race.ts`): the challenger on his own plan of
 * watts (ADR 0049), or the sprinter on the rider's wheel (ADR 0050). Each
 * takes his step of the race from where both were before it, and says
 * how he rides for the landscape. No React and no browser in it.
 */

/** Metres right of the road's middle he rides alongside on: the rider's left. */
export const ALONGSIDE = 0.55;

/** One step of the race. */
export type Step = {
  /** His speed, m/s; where he is; and where the rider is and how fast they are shown going. */
  v: number;
  him: number;
  rider: number;
  seen: number;
  /** His metres to the line; seconds since the start; and this step's. */
  left: number;
  since: number;
  seconds: number;
  /** The road where he is, and the share of the air he pushes: less in the rider's wheel. */
  grade: number;
  air: number;
  /** Metres a second he is shown going at a speed: the developer's warp on top (`warp.ts`). */
  travel: (v: number) => number;
};

/** His speed after the step, and how fast he is shown moving through it. */
export type Move = { v: number; pace: number };
/** How he rides now: his posture's cue, his legs, and how high he is in the air. */
export type Form = { effort: ChallengerEffort; cadence: number; jump: number };

export interface Rival {
  readonly who: Who;
  readonly massKg: number;
  /** How fast he moves across the road, m/s. */
  readonly across: number;
  ride(step: Step): Move;
  /** The line he heads for, `ahead` metres behind the rider (less than nothing: ahead of them). */
  aim(ahead: number, him: number): number;
  form(): Form;
}

/** The challenger: his own watts whatever the rider does; alongside while level, else in the leader's line. */
export class Challenger implements Rival {
  readonly who = "challenger";
  readonly massKg = CHALLENGE.massKg;
  readonly across = 1.2;
  private watts = 0;

  ride(s: Step): Move {
    this.watts = challengerWatts(s.since, s.left);
    const v = nextSpeed(s.v, this.watts, s.grade, s.seconds, this.massKg, s.air);
    return { v, pace: s.travel(v) };
  }

  aim(ahead: number, him: number): number {
    return Math.abs(ahead) < 2.5 ? ALONGSIDE : swayAt(him);
  }

  form(): Form {
    const effort = challengerEffort(this.watts);
    return { effort, cadence: effort === "steady" ? 94 : 110, jump: 0 };
  }
}

/**
 * The sprinter: on the rider's wheel for as long as his reserve lets him —
 * what it costs worked out from the physics, his weight, his size and the
 * slipstream — and at his critical power once it is gone; from 200 metres
 * out 1150 W, if he has anything left, and the last 15 metres in the air.
 */
export class Sprinter implements Rival {
  readonly who = "sprinter";
  readonly massKg = SPRINTER.massKg;
  readonly across = 2.4;
  private reserve: number = SPRINTER.wPrime;
  private sprinting = false;
  private left = Infinity;

  ride(s: Step): Move {
    this.left = s.left;
    const air = s.air * SPRINTER.air;
    if (!this.sprinting && s.left <= SPRINTER.sprintFrom && this.reserve > 0) this.sprinting = true;
    if (this.sprinting) {
      const watts = s.left <= SPRINTER.throwFrom ? 0 : SPRINTER.sprintWatts;
      this.reserve = reserveAfter(this.reserve, watts, s.seconds);
      const v = nextSpeed(s.v, watts, s.grade, s.seconds, this.massKg, air);
      return { v, pace: s.travel(v) };
    }
    // The speed that keeps him on the wheel, and the watts it takes.
    const off = s.rider - SPRINTER.wheel - s.him;
    const want = Math.max(0, s.seen + Math.max(-1, Math.min(1.5, 0.8 * off)));
    const need = wattsFor(s.v, want, s.seconds, s.grade, this.massKg, air);
    const can = Math.min(SPRINTER.sprintWatts, SPRINTER.cp + this.reserve / s.seconds);
    if (need <= can) {
      this.reserve = reserveAfter(this.reserve, need, s.seconds);
      // Under the warp he runs on with the rider, and closes up at an unwarped pace.
      return { v: want, pace: s.travel(s.seen) + want - s.seen };
    }
    this.reserve = reserveAfter(this.reserve, can, s.seconds);
    const v = nextSpeed(s.v, can, s.grade, s.seconds, this.massKg, air);
    return { v, pace: s.travel(v) };
  }

  /** Into the rider's line once he is back off their wheel; out beside them to come past in the sprint. */
  aim(ahead: number, him: number): number {
    if (this.sprinting) return Math.abs(ahead) < 3 ? ALONGSIDE : swayAt(him);
    return ahead > 1.6 ? swayAt(him) : ALONGSIDE;
  }

  form(): Form {
    if (!this.sprinting) return { effort: "steady", cadence: 92, jump: 0 };
    if (this.left > SPRINTER.throwFrom) return { effort: "sprint", cadence: 115, jump: 0 };
    return { effort: "throw", cadence: 0, jump: jumpAt(this.left) };
  }
}

/** A rival for a race: the sprinter fresh, or the challenger. */
export const rivalOf = (who: Who): Rival =>
  who === "sprinter" ? new Sprinter() : new Challenger();

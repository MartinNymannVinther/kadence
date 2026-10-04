import {
  CHALLENGE,
  challengeIn,
  challengerWatts,
  courseAt,
  draft,
  nextSpeed,
  PHYSICS,
  swayAt,
  type ChallengerAt,
  type ChallengeStart,
  type Course,
} from "@/modules/rulle";

/**
 * The challenger's race (ADR 0049), where the rider is shown: when the
 * rider comes to a place he turns up (`challengeIn`), he comes up from
 * behind and races them for two kilometres on his own plan of watts, and
 * sits on their wheel when they attack. Behind him the rider pushes less
 * air, and is shown going faster for it: a shift like the cheat code's
 * (`shown.ts`), so what is recorded is still what was ridden. A trainer
 * holding the session's watts leaves nothing to race with, so he only
 * turns up where the rider sets their own. No React and no browser in it.
 */

/** What the screen shows of a race: on, with what is left and the gap; or over, and who won. */
export type RaceLive =
  | { phase: "racing"; left: number; gap: number; hill: boolean; seconds: number }
  | { phase: "over"; won: boolean; margin: number }
  | null;

/** Metres right of the road's middle he rides alongside on: the rider's left. */
const ALONGSIDE = 0.55;
/** How fast he moves across the road, metres a second. */
const ACROSS = 1.2;
/** He sits this far behind a wheel he follows, metres. */
const WHEEL = 1;
/** He comes up from this far behind, this much faster. */
const COMES_UP = { behind: 6, faster: 2 };
/** Seconds the result stays up, and he with it, after the line; and the watts he eases to. */
const AFTER = 8;
const EASY = 180;

type Running = {
  start: ChallengeStart;
  end: number;
  him: number;
  v: number;
  seconds: number;
  line: number;
  /** The rider's speed as shown in his wheel, which runs back to their own out of it. */
  drafted: number;
  over: { won: boolean; margin: number; left: number } | null;
};

export class Race {
  private shift = 0;
  private considered = -1;
  private next: ChallengeStart | null = null;
  private run: Running | null = null;
  private rider = 0;

  constructor(private readonly course: Course) {}

  /** Metres the rider is shown ahead for the slipstream, `since` seconds after the last step. */
  shown(speed: number, since = 0): number {
    const run = this.run;
    return this.shift + (run && !run.over ? (run.drafted - speed) * since : 0);
  }

  /** The speed the rider is shown going: in his wheel, the slipstream's. */
  speed(speed: number): number {
    return this.run && !this.run.over ? this.run.drafted : speed;
  }

  /** Has him come up now, at `rider` metres, whatever the stretch says: the scheduled start, and a test's. */
  begin(rider: number, speed: number, hill = false): void {
    this.run = {
      start: { at: rider, hill },
      end: rider + CHALLENGE.length,
      him: rider - COMES_UP.behind,
      v: speed + COMES_UP.faster,
      seconds: 0,
      line: ALONGSIDE,
      drafted: speed,
      over: null,
    };
  }

  /**
   * `seconds` more, the rider shown at `rider` going `speed` on `watts`;
   * `free` when the rider sets their own watts, and he may turn up.
   */
  advance(rider: number, speed: number, watts: number, seconds: number, free: boolean): void {
    const moved = seconds > 0 ? (rider - this.rider) / seconds : speed;
    this.rider = rider;
    if (!this.run) this.schedule(rider, speed, free);
    const run = this.run;
    if (!run || seconds <= 0) return;
    if (run.over) {
      run.v = nextSpeed(run.v, EASY, this.grade(run.him), seconds, CHALLENGE.massKg);
      run.him += run.v * seconds;
      run.over.left -= seconds;
      if (run.over.left <= 0) this.run = null;
      return;
    }
    const ahead = rider - run.him;
    this.ride(run, ahead, moved, seconds);
    // The rider in his wheel pushes less air; out of it, back to their own speed.
    const air = draft(run.him - rider);
    run.drafted =
      air < 1
        ? nextSpeed(run.drafted, watts, this.grade(rider), seconds, PHYSICS.massKg, air)
        : run.drafted + (speed - run.drafted) * (1 - Math.exp(-seconds / 2));
    this.shift += (run.drafted - speed) * seconds;
    if (rider >= run.end || run.him >= run.end)
      run.over = { won: rider >= run.him, margin: Math.abs(rider - run.him), left: AFTER };
  }

  live(): RaceLive {
    const run = this.run;
    if (!run) return null;
    if (run.over) return { phase: "over", won: run.over.won, margin: run.over.margin };
    const left = Math.max(0, run.end - this.rider);
    const gap = this.rider - run.him;
    return { phase: "racing", left, gap, hill: run.start.hill, seconds: run.seconds };
  }

  /** Where he is for the landscape, `since` seconds after the last step; null with no race. */
  at(since = 0): ChallengerAt | null {
    const run = this.run;
    if (!run) return null;
    const sprinting = !run.over && (run.end - run.him <= 200 || run.seconds < 7);
    return {
      distance: run.him + run.v * since,
      line: run.line,
      speed: run.v,
      cadence: run.over ? 80 : sprinting ? 110 : 96,
      standing: sprinting,
    };
  }

  /** His step: his plan, or faster to get on the rider's wheel when they are ahead. */
  private ride(run: Running, ahead: number, riderSpeed: number, seconds: number): void {
    const grade = this.grade(run.him);
    const air = draft(ahead);
    const go = (watts: number) => nextSpeed(run.v, watts, grade, seconds, CHALLENGE.massKg, air);
    let v = go(challengerWatts(run.seconds, run.end - run.him));
    if (ahead > WHEEL + 0.2) {
      const wanted = riderSpeed + 0.6 * (ahead - WHEEL);
      v = Math.max(v, Math.min(go(CHALLENGE.chaseWatts), wanted));
    }
    run.v = v;
    run.him += v * seconds;
    run.seconds += seconds;
    // Alongside while level; in the leader's line once one is ahead.
    const aim = Math.abs(ahead) < 2.5 ? ALONGSIDE : swayAt(run.him);
    const step = ACROSS * seconds;
    run.line += Math.max(-step, Math.min(step, aim - run.line));
  }

  /** The stretch the rider is in, and whether he turns up in it now. */
  private schedule(rider: number, speed: number, free: boolean): void {
    const k = Math.floor(rider / CHALLENGE.every);
    if (k > this.considered) {
      this.considered = k;
      this.next = challengeIn(this.course, k);
    }
    const next = this.next;
    if (!next || rider < next.at) return;
    this.next = null;
    // A trainer holding the watts leaves nothing to race with: he lets the rider be.
    if (free) this.begin(rider, speed, next.hill);
  }

  private grade(at: number): number {
    return courseAt(this.course, at).grade;
  }
}

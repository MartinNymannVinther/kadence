import {
  CHALLENGE,
  challengeIn,
  challengerWatts,
  courseAt,
  draft,
  nextSpeed,
  PHYSICS,
  resistance,
  swayAt,
  type ChallengerAt,
  type ChallengeStart,
  type Course,
} from "@/modules/rulle";

/**
 * The challenger's race (ADR 0049), where the rider is shown: when the
 * rider comes to a place he turns up (`challengeIn`), he comes up beside
 * them, rides at their speed while ten seconds are counted down, and
 * races them for two kilometres on his own plan of watts, sitting on
 * their wheel when they attack. Behind him the rider pushes less
 * air, and is shown going faster for it: a shift like the cheat code's
 * (`shown.ts`), so what is recorded is still what was ridden. A trainer
 * holding the session's watts leaves nothing to race with, so he only
 * turns up where the rider sets their own. No React and no browser in it.
 */

/** What the screen shows of a race: counted down; on, with what is left and the gap; or over, and who won. */
export type RaceLive =
  | { phase: "countdown"; count: number; hill: boolean }
  | { phase: "racing"; left: number; gap: number; hill: boolean; seconds: number }
  | { phase: "over"; won: boolean; margin: number }
  | null;

/** Metres right of the road's middle he rides alongside on: the rider's left. */
const ALONGSIDE = 0.55;
/** How fast he moves across the road, metres a second. */
const ACROSS = 1.2;
/** He sits this far behind a wheel he follows, metres. */
const WHEEL = 1;
/** He comes up from this far behind, and closes up to the rider's side this fast at most. */
const COMES_UP = { behind: 5, closing: 1.5 };
/** Seconds the result stays up, and he with it, after the line; and the watts he eases to. */
const AFTER = 8;
const EASY = 180;

type Running = {
  start: ChallengeStart;
  /** Seconds still to count down; 0 once the race is on. */
  count: number;
  /** Where it ends, set at the start: Infinity while counting down. */
  end: number;
  /** His watts at the start, which he builds up from. */
  from: number;
  him: number;
  v: number;
  seconds: number;
  line: number;
  /** What his wheel adds to the rider's own speed, m/s: it fades out of it, and never takes away. */
  bonus: number;
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
    return this.shift + (run && !run.over ? run.bonus * since : 0);
  }

  /** The speed the rider is shown going: in his wheel, the slipstream's. */
  speed(speed: number): number {
    return this.run && !this.run.over ? speed + this.run.bonus : speed;
  }

  /** Has him come up now, at `rider` metres, whatever the stretch says: the scheduled start, and a test's. */
  begin(rider: number, speed: number, hill = false): void {
    this.run = {
      start: { at: rider, hill },
      count: CHALLENGE.countdown,
      end: Infinity,
      from: 0,
      him: rider - COMES_UP.behind,
      v: speed,
      seconds: 0,
      line: ALONGSIDE,
      bonus: 0,
      over: null,
    };
  }

  /**
   * `seconds` more, the rider shown at `rider` going `speed` on `watts`;
   * `free` when the rider sets their own watts, and he may turn up.
   */
  advance(rider: number, speed: number, watts: number, seconds: number, free: boolean): void {
    // Where the rider was at the last step, as he still is: the two are compared there.
    const was = this.rider;
    const moved = seconds > 0 ? (rider - was) / seconds : speed;
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
    if (run.count > 0) {
      this.countDown(run, was, rider, moved, seconds);
      run.bonus = 0;
      return;
    }
    // Both from where they were before either moved: the one behind is in the other's wheel.
    const ahead = was - run.him;
    const air = draft(-ahead);
    this.ride(run, ahead, moved, seconds);
    // The rider in his wheel pushes less air; out of it, back to their own speed.
    run.bonus =
      air < 1
        ? Math.max(
            0,
            nextSpeed(speed + run.bonus, watts, this.grade(rider), seconds, PHYSICS.massKg, air) -
              speed,
          )
        : run.bonus * Math.exp(-seconds / 2);
    this.shift += run.bonus * seconds;
    if (rider >= run.end || run.him >= run.end)
      run.over = { won: rider >= run.him, margin: Math.abs(rider - run.him), left: AFTER };
  }

  live(): RaceLive {
    const run = this.run;
    if (!run) return null;
    if (run.over) return { phase: "over", won: run.over.won, margin: run.over.margin };
    if (run.count > 0)
      return { phase: "countdown", count: Math.ceil(run.count), hill: run.start.hill };
    const left = Math.max(0, run.end - this.rider);
    const gap = this.rider - run.him;
    return { phase: "racing", left, gap, hill: run.start.hill, seconds: run.seconds };
  }

  /** Where he is for the landscape, `since` seconds after the last step; null with no race. */
  at(since = 0): ChallengerAt | null {
    const run = this.run;
    if (!run) return null;
    const on = !run.over && run.count === 0;
    const sprinting = on && (run.end - run.him <= 200 || run.seconds < CHALLENGE.build);
    return {
      distance: run.him + run.v * since,
      finish: run.count > 0 ? null : run.end,
      line: run.line,
      speed: run.v,
      cadence: run.over ? 80 : sprinting ? 110 : 94,
      standing: sprinting,
    };
  }

  /** His step: his plan, or faster to get on the rider's wheel when they are ahead. */
  private ride(run: Running, ahead: number, riderSpeed: number, seconds: number): void {
    const grade = this.grade(run.him);
    const air = draft(ahead);
    const go = (watts: number) => nextSpeed(run.v, watts, grade, seconds, CHALLENGE.massKg, air);
    let v = go(challengerWatts(run.seconds, run.end - run.him, run.from));
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

  /**
   * The countdown: up beside the rider and then at their very speed; at
   * its end the race is on, two kilometres from there, and he starts from
   * the watts that held that speed.
   */
  private countDown(
    run: Running,
    was: number,
    rider: number,
    riderSpeed: number,
    seconds: number,
  ): void {
    const behind = was - run.him;
    run.v = Math.max(0, riderSpeed + Math.max(-1, Math.min(COMES_UP.closing, 0.8 * behind)));
    run.him += run.v * seconds;
    run.count = Math.max(0, run.count - seconds);
    if (run.count > 0) return;
    run.end = rider + CHALLENGE.length;
    run.seconds = 0;
    const holding = run.v * resistance(run.v, this.grade(run.him), CHALLENGE.massKg);
    run.from = Math.max(100, holding);
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

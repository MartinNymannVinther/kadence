import {
  CHALLENGE,
  courseAt,
  draft,
  nextSpeed,
  PHYSICS,
  type ChallengerAt,
  type ChallengeStart,
  type Course,
  type Rival as Who,
} from "@/modules/rulle";
import { Encounters } from "./encounters";
import { ALONGSIDE, Challenger, rivalOf, type Rival } from "./rivals";
import { Warp } from "./warp";

/**
 * The challenger's race (ADR 0074), where the rider is shown: when the
 * rider comes to a place one turns up (`challengeIn`) — the challenger or
 * the sprinter (ADR 0075), half the time each — he comes up beside them
 * and offers a race. Said yes to, or called by his code, he rides at
 * their speed while ten seconds are counted down, and races them for two
 * kilometres: the challenger on his own plan of watts, whatever they do,
 * the sprinter on their wheel; each his own way (`rivals.ts`). Said no
 * to, or not answered, he drops back and is gone. Behind him the rider pushes
 * less air, and is shown going faster for it: a shift like the cheat
 * code's (`shown.ts`), so what is recorded is still what was ridden;
 * behind the rider, so does he. Under the developer's warp he runs on as
 * the rider does, faster or backwards, from his own speed (`warp.ts`). He
 * only comes on a free ride, never into a session — of himself, or called
 * by JOHAN or HYLDTOFT. No React and no browser in it.
 */

/** What the screen shows of a race: counted down; on, with what is left and the gap; or over, and who won. */
export type RaceLive =
  | { phase: "offer"; wait: number; hill: boolean; who: Who }
  | { phase: "countdown"; count: number; hill: boolean; who: Who }
  | { phase: "racing"; left: number; gap: number; hill: boolean; seconds: number }
  | { phase: "over"; won: boolean; margin: number }
  | null;

/** He comes up from this far behind, and closes up to the rider's side this fast at most. */
const COMES_UP = { behind: 5, closing: 1.5 };
/** Seconds he waits beside the rider for an answer to his offer. */
const OFFER = 15;
/** Seconds the result stays up, and he with it, after the line; and the watts he eases to. */
const AFTER = 8;
const EASY = 180;

type Running = {
  start: ChallengeStart;
  rival: Rival;
  /** Seconds he still waits for an answer; 0 once there is one, or for a race he was called to. */
  offer: number;
  /** Seconds still to count down; 0 once the race is on. */
  count: number;
  /** Where it ends, set at the start: Infinity while counting down. */
  end: number;
  him: number;
  v: number;
  /** Metres a second he is shown going: `v`, and the warp on top of it. */
  pace: number;
  seconds: number;
  line: number;
  /** What his wheel adds to the rider's own speed, m/s: it fades out of it, and never takes away. */
  bonus: number;
  /** At the line, or turned down: `quiet` then, with nothing to say. */
  over: { won: boolean; margin: number; left: number; quiet?: boolean } | null;
};

export class Race {
  private shift = 0;
  private run: Running | null = null;
  private rider = 0;
  private speedNow = 0;
  /** Whether the ride is free, no session in it: where he may come. */
  private free = false;
  /** The share of the air the rider pushes at the last step: less in his wheel. */
  air = 1;
  private readonly encounters: Encounters;

  constructor(
    private readonly course: Course,
    private readonly warp = new Warp(),
  ) {
    this.encounters = new Encounters(course);
  }

  /** Metres the rider is shown ahead for the slipstream, `since` seconds after the last step. */
  shown(since = 0): number {
    const run = this.run;
    return this.shift + (run && !run.over ? run.bonus * since : 0);
  }

  /** The speed the rider is shown going: in his wheel, the slipstream's. */
  speed(speed: number): number {
    return this.run && !this.run.over ? speed + this.run.bonus : speed;
  }

  /**
   * Has him come up now, at `rider` metres, whatever the stretch says: to
   * `offer` a race, as of himself, or straight to the countdown, as a
   * code or a test calls him.
   */
  begin(
    rider: number,
    speed: number,
    hill = false,
    rival: Rival = new Challenger(),
    offer = false,
  ): void {
    this.run = {
      start: { at: rider, hill, who: rival.who },
      rival,
      offer: offer ? OFFER : 0,
      count: CHALLENGE.countdown,
      end: Infinity,
      him: rider - COMES_UP.behind,
      v: speed,
      pace: this.travel(speed),
      seconds: 0,
      line: ALONGSIDE,
      bonus: 0,
      over: null,
    };
  }

  /** Called by name (JOHAN, HYLDTOFT): he comes now, on a free ride, with no offer; into a session, not at all. */
  call(who: Who = "challenger"): void {
    if (this.free) this.begin(this.rider, this.speedNow, false, rivalOf(who));
  }

  /** The rider's answer to his offer: yes, and the count begins; no, and he drops back and is gone. */
  answer(yes: boolean): void {
    const run = this.run;
    if (!run || run.offer <= 0) return;
    run.offer = 0;
    if (!yes) this.leave(run);
  }

  /**
   * `seconds` more, the rider shown at `rider` going `speed` on `watts`;
   * `free` on a ride with no session, where he may come. `cheat` is the
   * speed a cheat code shows the rider going, while one is on: the cheat
   * takes the slipstream itself (`air`), and nothing is added here.
   */
  advance(
    rider: number,
    speed: number,
    watts: number,
    seconds: number,
    free: boolean,
    cheat: number | null = null,
  ): void {
    this.air = 1;
    // Where the rider was at the last step, as he still is: the two are compared there.
    const was = this.rider;
    const seen = cheat ?? this.speed(speed);
    this.rider = rider;
    this.speedNow = seen;
    this.free = free;
    const due = this.run ? null : this.encounters.due(rider);
    // A session is the coach's: he only comes on a free ride, and asks first.
    if (due && free) this.begin(rider, speed, due.hill, rivalOf(due.who), true);
    const run = this.run;
    if (!run || seconds <= 0) return;
    if (run.over) {
      run.v = nextSpeed(run.v, EASY, this.grade(run.him), seconds, run.rival.massKg);
      this.move(run, this.travel(run.v), seconds);
      run.over.left -= seconds;
      if (run.over.left <= 0) this.run = null;
      return;
    }
    if (run.offer > 0 || run.count > 0) {
      this.alongside(run, was, seen, seconds);
      run.bonus = 0;
      if (run.offer > 0) {
        run.offer = Math.max(0, run.offer - seconds);
        if (run.offer === 0) this.leave(run);
        return;
      }
      run.count = Math.max(0, run.count - seconds);
      if (run.count > 0) return;
      run.end = rider + CHALLENGE.length;
      run.seconds = 0;
      return;
    }
    // Both from where they were before either moved: the one behind is in the other's wheel.
    const ahead = was - run.him;
    const air = draft(-ahead);
    this.air = air;
    this.ride(run, was, seen, seconds);
    // The rider in his wheel pushes less air; out of it, back to their own speed.
    run.bonus =
      cheat !== null
        ? 0
        : air < 1
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
    const { hill, who } = run.start;
    if (run.over) return run.over.quiet ? null : { phase: "over", ...run.over };
    if (run.offer > 0) return { phase: "offer", wait: Math.ceil(run.offer), hill, who };
    if (run.count > 0) {
      return { phase: "countdown", count: Math.ceil(run.count), hill, who };
    }
    const left = Math.max(0, run.end - this.rider);
    const gap = this.rider - run.him;
    return { phase: "racing", left, gap, hill: run.start.hill, seconds: run.seconds };
  }

  /** Where he is for the landscape, `since` seconds after the last step; null with no race. */
  at(since = 0): ChallengerAt | null {
    const run = this.run;
    if (!run) return null;
    const on = !run.over && run.count === 0;
    const form = on
      ? run.rival.form()
      : { effort: "steady" as const, cadence: run.over ? 80 : 94, jump: 0 };
    return {
      distance: run.him + run.pace * since,
      finish: run.count > 0 ? null : run.end,
      line: run.line,
      speed: run.v,
      ...form,
      who: run.rival.who,
    };
  }

  /** His step, his own way (`rivals.ts`), in the rider's wheel when they are ahead of him. */
  private ride(run: Running, rider: number, seen: number, seconds: number): void {
    const ahead = rider - run.him;
    const { v, pace } = run.rival.ride({
      v: run.v,
      him: run.him,
      rider,
      seen,
      left: run.end - run.him,
      since: run.seconds,
      seconds,
      grade: this.grade(run.him),
      air: draft(ahead),
      travel: (at) => this.travel(at),
    });
    run.v = v;
    this.move(run, pace, seconds);
    run.seconds += seconds;
    const step = run.rival.across * seconds;
    run.line += Math.max(-step, Math.min(step, run.rival.aim(ahead, run.him) - run.line));
  }

  /**
   * Through the offer and the countdown: up beside the rider and then at
   * their very speed. Under the warp he runs on with the rider, and closes
   * up at an unwarped pace.
   */
  private alongside(run: Running, was: number, seen: number, seconds: number): void {
    const behind = was - run.him;
    const v = Math.max(0, seen + Math.max(-1, Math.min(COMES_UP.closing, 0.8 * behind)));
    this.move(run, this.travel(seen) + v - seen, seconds);
    run.v = v;
  }

  /** Turned down: he eases off and drops back, with no result to show. */
  private leave(run: Running): void {
    run.over = { won: false, margin: 0, left: AFTER, quiet: true };
  }

  /** Metres a second he is shown going at `v`: as the rider is, faster or backwards under the warp. */
  private travel(v: number): number {
    return v + this.warp.rate(v);
  }

  private move(run: Running, pace: number, seconds: number): void {
    run.pace = pace;
    run.him += pace * seconds;
  }

  private grade(at: number): number {
    return courseAt(this.course, at).grade;
  }
}

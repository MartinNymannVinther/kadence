import { courseAt, type ChallengerAt, type Course, type CoursePoint } from "@/modules/rulle";
import { Cheat } from "./cheat";
import { Race } from "./race";
import { Warp } from "./warp";

/** Where the rider is shown, for the landscape: the place, the speed, and the cheat's line and lean. */
export type ShownAt = CoursePoint & {
  speed: number;
  distance: number;
  line: number | null;
  lean: number;
  cheat: boolean;
  /** The challenger, while he races or rides on after it (ADR 0049). */
  challenger: ChallengerAt | null;
};

/**
 * Where the rider is shown, as against where they have ridden (ADR 0045):
 * moved on by the developer's warp (`warp.ts`), by the challenger's
 * slipstream (`race.ts`, ADR 0049) and by the cheat codes (`cheat.ts`),
 * each a shift of its own. What is recorded is always what was ridden;
 * only the landscape, the map and the profile follow this.
 */
export class Shown {
  readonly warp = new Warp();
  readonly cheat = new Cheat();
  readonly race: Race;

  constructor(private readonly course: Course) {
    this.race = new Race(course);
  }

  /**
   * `seconds` more ridden at `speed` on `watts`, `distance` in: the shifts
   * run on. `free` when the rider sets their own watts, for the challenger.
   */
  advance(distance: number, speed: number, seconds: number, watts = 0, free = false): void {
    this.warp.advance(speed, seconds);
    this.race.advance(this.place(distance, speed), speed, watts, seconds, free);
    const place = this.place(distance, speed);
    this.cheat.advance(speed, place, seconds, courseAt(this.course, place).grade);
  }

  /** Where the rider is shown: ridden `distance` in at `speed`, `since` seconds after the last step. */
  place(distance: number, speed: number, since = 0): number {
    const before = this.warp.shown(distance, speed, since) + this.race.shown(speed, since);
    return this.cheat.shown(before, speed, since);
  }

  /** The speed the rider is shown going: the cheat's while it is on, else the slipstream's. */
  speed(speed: number): number {
    return this.cheat.speed(this.race.speed(speed));
  }

  /** All of it at once, ridden `distance` in at `speed`, `since` seconds after the last step. */
  at(course: Course, distance: number, speed: number, since: number, riding: boolean): ShownAt {
    const place = this.place(distance, speed, since);
    const { line, lean, on } = this.cheat;
    const shown = { distance: place, speed: riding ? this.speed(speed) : 0, line, lean, cheat: on };
    return { ...courseAt(course, place), ...shown, challenger: this.race.at(riding ? since : 0) };
  }
}

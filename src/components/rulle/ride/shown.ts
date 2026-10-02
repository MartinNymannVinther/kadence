import { courseAt, type Course, type CoursePoint } from "@/modules/rulle";
import { Cheat } from "./cheat";
import { Warp } from "./warp";

/** Where the rider is shown, for the landscape: the place, the speed, and the cheat's line and lean. */
export type ShownAt = CoursePoint & {
  speed: number;
  distance: number;
  line: number | null;
  lean: number;
  cheat: boolean;
};

/**
 * Where the rider is shown, as against where they have ridden (ADR 0045):
 * moved on by the developer's warp (`warp.ts`) and by the cheat code
 * (`cheat.ts`), each a shift of its own. What is recorded is always what
 * was ridden; only the landscape, the map and the profile follow this.
 */
export class Shown {
  readonly warp = new Warp();
  readonly cheat = new Cheat();

  /**
   * `seconds` more ridden at `speed`, `distance` in: the shifts run on.
   * `gradeAt` is the road's climb at a place, for the WATT cheat's avatar.
   */
  advance(
    distance: number,
    speed: number,
    seconds: number,
    gradeAt?: (at: number) => number,
  ): void {
    this.warp.advance(speed, seconds);
    const place = this.place(distance, speed);
    this.cheat.advance(speed, place, seconds, gradeAt?.(place) ?? 0);
  }

  /** Where the rider is shown: ridden `distance` in at `speed`, `since` seconds after the last step. */
  place(distance: number, speed: number, since = 0): number {
    return this.cheat.shown(this.warp.shown(distance, speed, since), speed, since);
  }

  /** The speed the rider is shown going: the cheat's, while it is on. */
  speed(speed: number): number {
    return this.cheat.speed(speed);
  }

  /** All of it at once, ridden `distance` in at `speed`, `since` seconds after the last step. */
  at(course: Course, distance: number, speed: number, since: number, riding: boolean): ShownAt {
    const place = this.place(distance, speed, since);
    const { line, lean, on } = this.cheat;
    const shown = { distance: place, speed: riding ? this.speed(speed) : 0, line, lean, cheat: on };
    return { ...courseAt(course, place), ...shown };
  }
}

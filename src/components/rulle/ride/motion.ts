import { courseAt, nextSpeed, type Course } from "@/modules/rulle";
import { Shown, type ShownAt } from "./shown";

/**
 * The rider along the course: the speed the physics give the watts, the
 * distance ridden, and where the rider is shown (`Shown`: the warp, the
 * cheat codes, the challenger). Pulled out of the engine to keep it under
 * the line limit; no React and no browser in it.
 */

/** Watts the landscape moves at when nothing measures them and the block names none. */
export const DRAWN_WATTS = 150;

export class Motion {
  speed = 0;
  distance = 0;
  readonly shown: Shown;
  private movedAt = 0;

  constructor(private readonly course: Course) {
    this.shown = new Shown(course);
  }

  /** The ride starts, or goes on after a pause, now. */
  from(now: number): void {
    this.movedAt = now;
  }

  stop(): void {
    this.speed = 0;
  }

  /** The road where the rider is: its grade (rise over run) and height. */
  here(): { grade: number; ele: number } {
    const at = courseAt(this.course, this.distance);
    return { grade: at.grade, ele: at.ele };
  }

  /**
   * A tick while riding: `watts` are the measured ones, or the block's
   * (or `DRAWN_WATTS`) when nothing measures them; `free` says the ride
   * has no session, for what is shown on the way.
   */
  step(now: number, watts: number, free: boolean): void {
    const dt = Math.min(1, Math.max(0, (now - this.movedAt) / 1000));
    this.movedAt = now;
    this.speed = nextSpeed(this.speed, watts, this.here().grade, dt);
    this.distance += this.speed * dt;
    this.shown.advance(this.distance, this.speed, dt, watts, free);
  }

  /** Where the rider is shown now, between ticks too: the scene asks every frame. */
  positionAt(now: number, riding: boolean): ShownAt {
    const since = riding ? Math.min(1, Math.max(0, now - this.movedAt) / 1000) : 0;
    return this.shown.at(
      this.course,
      this.distance + this.speed * since,
      this.speed,
      since,
      riding,
    );
  }
}

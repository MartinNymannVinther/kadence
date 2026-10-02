import type * as THREE from "three";
import { inside, lapAlong, type Course, type RaceDay } from "@/modules/rulle";
import { bumpAt } from "./race-props";

/**
 * How race day's road feels under the wheels (ADR 0036): the cobbles,
 * that shake the bike and the picture, and the speed bumps, that lift it.
 */
export class RaceRoad {
  private clock = 0;

  constructor(
    private readonly course: Course,
    private readonly day: RaceDay,
  ) {}

  /** How much the road shakes here: 1 on the cobbles, else 0. */
  rumble(distance: number): number {
    const L = this.course.length;
    return this.day.cobbles.some((s) => inside(s, distance, L)) ? 1 : 0;
  }

  /**
   * Shakes the bike on the cobbles: two quick beats that never quite fall
   * together — stones, not a motor — harder the faster it goes. How much
   * the road shakes here, for the camera.
   */
  jolt(bike: THREE.Object3D, distance: number, speed: number, seconds: number): number {
    this.clock += seconds;
    const rumble = this.rumble(distance);
    if (rumble === 0) return 0;
    const t = this.clock * 2 * Math.PI;
    const hard = Math.min(1, speed / 6);
    bike.position.y += (Math.sin(t * 13) * 0.5 + Math.sin(t * 17.3) * 0.5) * 0.012 * hard;
    bike.rotation.z += Math.sin(t * 15.1) * 0.012 * hard;
    return rumble;
  }

  /** How high the road stands here over a speed bump, metres. */
  lift(distance: number): number {
    const L = this.course.length;
    let most = 0;
    for (const b of this.day.bumps) most = Math.max(most, bumpAt(lapAlong(distance - b, L)));
    return most;
  }
}

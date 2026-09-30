import * as THREE from "three";
import { courseAt, type Chalk, type Course } from "@/modules/rulle";
import { spectator, type Spectator } from "./folk";
import type { Ground } from "./ground";
import { groundPoint, roadPoint, roadYaw } from "./road-point";
import { chalkPlate, disposeTextured } from "./text-plates";

/**
 * The steepest climb (ADR 0034), made a little like a mountain in a grand
 * tour: the rider's name in chalk on the road, "almost there" near the
 * top, and someone in red at the roadside who shakes a cowbell as the
 * rider comes by.
 */

export class ChalkClimb {
  readonly group = new THREE.Group();
  private readonly plates: THREE.Mesh[] = [];
  private readonly fan: Spectator;
  private readonly rung = new Set<number>();

  constructor(
    private readonly course: Course,
    ground: Ground,
    material: THREE.Material,
    private readonly chalk: Chalk,
    words: { name: string; top: string },
    private readonly ring: () => void,
  ) {
    for (const [at, text] of [
      [chalk.name, words.name],
      [chalk.top, words.top],
    ] as const) {
      const plate = chalkPlate(text, 5.8, 9);
      const holder = new THREE.Group();
      holder.rotation.order = "YXZ";
      holder.position.copy(roadPoint(course, at, 0.2));
      holder.position.y += 0.01;
      holder.rotation.y = roadYaw(course, at);
      holder.rotation.x = Math.atan(courseAt(course, at).grade);
      holder.add(plate);
      this.plates.push(plate);
      this.group.add(holder);
    }
    this.fan = spectator(material);
    this.fan.group.position.copy(groundPoint(course, ground, chalk.bell, 4.6));
    this.fan.group.rotation.y = roadYaw(course, chalk.bell) + Math.PI / 2;
    this.group.add(this.fan.group);
  }

  frame(distance: number, seconds: number): void {
    const lap = Math.floor(distance / this.course.length);
    const along = distance - lap * this.course.length;
    const near = along > this.chalk.bell - 45 && along < this.chalk.bell + 12;
    this.fan.ringing = near;
    if (near && !this.rung.has(lap) && along > this.chalk.bell - 30) {
      this.rung.add(lap);
      this.ring();
    }
    this.fan.animate(seconds, 0);
  }

  dispose(): void {
    for (const plate of this.plates) disposeTextured(plate);
    this.fan.dispose();
  }
}

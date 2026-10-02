import * as THREE from "three";
import { courseAt, hash, type Course } from "@/modules/rulle";
import { person } from "./finish-line";
import { spectator, type Spectator } from "./folk";
import { personOf } from "./folk-look";
import type { Ground } from "./ground";
import { PALETTE as P } from "./palette";
import { freeze } from "./props";
import { groundPoint, roadPoint, roadYaw } from "./road-point";
import { box, merged } from "./shapes";
import { disposeTextured, polkaBannerTexture } from "./text-plates";

/**
 * The top of a hill sprint the organiser marks (ADR 0046), as the
 * bakkespurt on Pederstrup: a banner in a climber's red dots over the
 * road, a white line across it, people along the last of the climb with
 * their arms up, and one with a cowbell who rings it as the rider comes.
 * Every time over the line counts, for today's little things. Nobody is
 * timed and nothing is won (ADR 0013).
 */

/** The banner's legs, metres either side of the road's middle. */
const HALF = 4.2;
/** People stand along this much of the climb before the line, and a little after it. */
const BEFORE = 70;
const AFTER = 12;
const CLOTHES = [P.flagRed, P.jersey, P.cowWhite, P.raincoat, P.denim, P.flagRed, P.hoodie];

export class HillSprints {
  readonly group = new THREE.Group();
  private readonly faces: THREE.Mesh[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly fans: Spectator[] = [];
  private readonly rung = new Set<string>();
  private last: number | null = null;

  constructor(
    private readonly course: Course,
    ground: Ground,
    material: THREE.Material,
    /** Metres along the lap of each line. */
    private readonly lines: readonly number[],
    word: string,
    private readonly hooks: { crossed: () => void; ring: () => void },
  ) {
    const people: THREE.BufferGeometry[] = [];
    lines.forEach((along, n) => {
      // The banner on its two legs, facing down the climb; its words on both faces.
      const gantry = new THREE.Group();
      gantry.position.copy(roadPoint(course, along, 0));
      gantry.rotation.y = roadYaw(course, along);
      const legs = merged([
        box(0.22, 5.3, 0.22, P.post, -HALF, 2.4, 0),
        box(0.22, 5.3, 0.22, P.post, HALF, 2.4, 0),
        box(0.7, 0.3, 0.7, P.dark, -HALF, -0.1, 0),
        box(0.7, 0.3, 0.7, P.dark, HALF, -0.1, 0),
      ]);
      this.shapes.push(legs);
      gantry.add(new THREE.Mesh(legs, material));
      for (const side of [1, -1]) {
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(HALF * 2 - 0.25, 1.0),
          new THREE.MeshLambertMaterial({ map: polkaBannerTexture(word) }),
        );
        banner.position.set(0, 4.55, side * 0.03);
        banner.rotation.y = side > 0 ? 0 : Math.PI;
        this.faces.push(banner);
        gantry.add(banner);
      }
      // The line, white across the road, tilted as the road is.
      const line = new THREE.Group();
      line.rotation.order = "YXZ";
      line.position.copy(roadPoint(course, along, 0));
      line.position.y += 0.012;
      line.rotation.y = roadYaw(course, along);
      line.rotation.x = Math.atan(courseAt(course, along).grade);
      const paint = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 0.4),
        new THREE.MeshBasicMaterial({
          color: P.line,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      paint.rotation.x = -Math.PI / 2;
      this.faces.push(paint);
      line.add(paint);
      this.group.add(freeze(gantry), freeze(line));
      // The people along the top of the climb, most of them cheering.
      let k = n * 1000;
      for (let at = along - BEFORE; at < along + AFTER; at += 4.2)
        for (const side of [-1, 1]) {
          k++;
          if (hash(k, side, 231) < 0.35) continue;
          const foot = groundPoint(course, ground, at, side * (4.7 + hash(k, 1, 232) * 1.1));
          const yaw = roadYaw(course, at) + (side * Math.PI) / 2;
          // Each somebody of their own, as at the finish (ADR 0045), and now and then a child.
          const tall = hash(k, 3, 234) < 0.12 ? 0.66 : 0.93 + hash(k, 4, 234) * 0.14;
          const looks = personOf(k + 9100);
          const cheering = hash(k, 2, 233) < 0.6;
          people.push(person(foot, yaw, CLOTHES[k % CLOTHES.length]!, cheering, looks, tall));
        }
      const fan = spectator(material);
      fan.group.position.copy(groundPoint(course, ground, along - 16, 5));
      fan.group.rotation.y = roadYaw(course, along - 16) + Math.PI / 2;
      this.fans.push(fan);
      this.group.add(fan.group);
    });
    if (people.length > 0) {
      const crowd = merged(people);
      this.shapes.push(crowd);
      this.group.add(freeze(new THREE.Mesh(crowd, material)));
    }
  }

  /** Counts each line as it is crossed, and rings the cowbell as the rider comes up to it. */
  frame(distance: number, seconds: number): void {
    const L = this.course.length;
    const last = this.last ?? distance;
    this.lines.forEach((along, n) => {
      if (distance > last && Math.floor((distance - along) / L) > Math.floor((last - along) / L))
        this.hooks.crossed();
      const to = (((along - distance) % L) + L) % L;
      const near = to < 50 || to > L - 10;
      const fan = this.fans[n]!;
      fan.ringing = near;
      const key = `${n}:${Math.floor((distance - along + 50) / L)}`;
      if (near && to < 50 && !this.rung.has(key)) {
        this.rung.add(key);
        this.hooks.ring();
      }
      fan.animate(seconds, 0);
    });
    this.last = distance;
  }

  dispose(): void {
    for (const face of this.faces) disposeTextured(face);
    for (const shape of this.shapes) shape.dispose();
    for (const fan of this.fans) fan.dispose();
  }
}

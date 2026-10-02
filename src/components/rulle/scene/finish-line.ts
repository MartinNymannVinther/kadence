import * as THREE from "three";
import { courseAt, hash, type Course } from "@/modules/rulle";
import { spectator, type Spectator } from "./folk";
import { personOf, type Person } from "./folk-look";
import type { Ground } from "./ground";
import { PALETTE as P } from "./palette";
import { freeze } from "./props";
import { groundPoint, roadPoint, roadYaw } from "./road-point";
import { ball, box, merged, rod, v } from "./shapes";
import { bannerTexture, checkerTexture, disposeTextured } from "./text-plates";

/**
 * The finish of a race's course (ADR 0035), where its lap ends and the
 * next begins: an arch over the road with its banner, the checkered line
 * across the asphalt, crowd barriers along the last stretch with people
 * behind them, and one with a cowbell by the line — on race day in a city
 * the crowd is race day's own (ADR 0036), and the line has the cowbell
 * alone. Every time over it counts, for today's little things.
 */

/** Metres of barriers before the line, and after it. */
const BEFORE = 120;
const AFTER = 25;
/** The arch's legs, metres either side of the road's middle. */
const HALF = 4.4;
const CLOTHES = [P.jersey, P.flagRed, P.denim, P.raincoat, P.hoodie, P.cowWhite, P.stripe];

export class FinishLine {
  readonly group = new THREE.Group();
  private readonly faces: THREE.Mesh[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly fan: Spectator;
  private lap = 0;
  private rung = -1;

  constructor(
    private readonly course: Course,
    ground: Ground,
    material: THREE.Material,
    word: string,
    private readonly hooks: { crossed: () => void; ring: () => void },
    crowd = true,
  ) {
    const L = course.length;
    // The arch, facing along the road; its banner on both faces.
    const arch = new THREE.Group();
    arch.position.copy(roadPoint(course, 0, 0));
    arch.rotation.y = roadYaw(course, 0);
    const frame = merged([
      box(0.8, 5.5, 0.8, P.cap, -HALF, 2.45, 0),
      box(0.8, 5.5, 0.8, P.cap, HALF, 2.45, 0),
      box(HALF * 2 + 0.8, 1.25, 0.9, P.cap, 0, 5.0, 0),
      box(1.2, 0.35, 1.2, P.dark, -HALF, -0.12, 0),
      box(1.2, 0.35, 1.2, P.dark, HALF, -0.12, 0),
    ]);
    this.shapes.push(frame);
    arch.add(new THREE.Mesh(frame, material));
    for (const side of [1, -1]) {
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(HALF * 2 - 0.3, 1.0),
        new THREE.MeshLambertMaterial({ map: bannerTexture(word) }),
      );
      banner.position.set(0, 5.0, side * 0.46);
      banner.rotation.y = side > 0 ? 0 : Math.PI;
      this.faces.push(banner);
      arch.add(banner);
    }
    // The line, flat on the road, tilted as the road is.
    const line = new THREE.Group();
    line.rotation.order = "YXZ";
    line.position.copy(roadPoint(course, 0, 0));
    line.position.y += 0.012;
    line.rotation.y = roadYaw(course, 0);
    line.rotation.x = Math.atan(courseAt(course, 0).grade);
    const checks = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 0.75),
      new THREE.MeshBasicMaterial({
        map: checkerTexture(),
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    checks.rotation.x = -Math.PI / 2;
    this.faces.push(checks);
    line.add(checks);
    // Barriers along both edges, and the people behind them near the line.
    const parts: THREE.BufferGeometry[] = [];
    for (let at = L - BEFORE; crowd && at < L + AFTER; at += 2.4)
      for (const side of [-1, 1]) parts.push(barrier(course, ground, at, side));
    let k = 0;
    for (let at = L - 75; crowd && at < L - 4; at += 5.5)
      for (const side of [-1, 1]) {
        if (hash(k, side, 211) < 0.3) {
          k++;
          continue;
        }
        const foot = groundPoint(course, ground, at, side * (4.6 + hash(k, 1, 212) * 0.8));
        const yaw = roadYaw(course, at) + (side * Math.PI) / 2;
        // Each somebody of their own: a skin, hair, a height, and now and then a child.
        const tall = hash(k, 3, 213) < 0.12 ? 0.66 : 0.93 + hash(k, 4, 213) * 0.14;
        const looks = personOf(k + 8100);
        parts.push(
          person(foot, yaw, CLOTHES[k % CLOTHES.length]!, hash(k, 2, 213) < 0.5, looks, tall),
        );
        k++;
      }
    const people = parts.length > 0 ? merged(parts) : null;
    if (people) this.shapes.push(people);
    this.fan = spectator(material);
    this.fan.group.position.copy(groundPoint(course, ground, L - 12, 4.9));
    this.fan.group.rotation.y = roadYaw(course, L - 12) + Math.PI / 2;
    this.group.add(freeze(arch), freeze(line), this.fan.group);
    if (people) this.group.add(freeze(new THREE.Mesh(people, material)));
  }

  /** Counts the line as it is crossed, and rings the cowbell as the rider comes to it. */
  frame(distance: number, seconds: number): void {
    const L = this.course.length;
    const lap = Math.floor(distance / L);
    if (lap > this.lap) {
      this.lap = lap;
      this.hooks.crossed();
    }
    const along = distance - lap * L;
    const near = along > L - 50;
    this.fan.ringing = near || along < 10;
    if (near && this.rung !== lap) {
      this.rung = lap;
      this.hooks.ring();
    }
    this.fan.animate(seconds, 0);
  }

  dispose(): void {
    for (const face of this.faces) disposeTextured(face);
    for (const shape of this.shapes) shape.dispose();
    this.fan.dispose();
  }
}

/** A section of crowd barrier, 2.4 m, galvanised, standing on the verge. */
function barrier(course: Course, ground: Ground, at: number, side: number): THREE.BufferGeometry {
  const a = groundPoint(course, ground, at, side * 3.35);
  const b = groundPoint(course, ground, at + 2.3, side * 3.35);
  const up = (p: THREE.Vector3, h: number) => v(p.x, p.y + h, p.z);
  const parts = [
    rod(a, up(a, 1.1), 0.025, P.metal, 4),
    rod(b, up(b, 1.1), 0.025, P.metal, 4),
    rod(up(a, 1.1), up(b, 1.1), 0.025, P.metal, 4),
    rod(up(a, 0.15), up(b, 0.15), 0.02, P.metal, 4),
  ];
  for (let i = 1; i < 6; i++) {
    const p = a.clone().lerp(b, i / 6);
    parts.push(rod(up(p, 0.15), up(p, 1.1), 0.012, P.metal, 3));
  }
  return merged(parts);
}

/** Someone watching: facing the road, in a jacket of `color`, maybe with both arms up. */
export function person(
  foot: THREE.Vector3,
  yaw: number,
  color: string,
  cheering: boolean,
  looks: Person,
  tall: number,
) {
  const arm = (x: number) =>
    cheering
      ? rod(v(x, 1.38, 0), v(x * 1.6, 1.95, -0.05), 0.05, color)
      : rod(v(x, 1.38, 0), v(x * 1.3, 0.95, -0.02), 0.05, color);
  return merged([
    rod(v(-0.1, 0, 0), v(-0.1, 0.86, 0), 0.07, looks.trousers),
    rod(v(0.1, 0, 0), v(0.1, 0.86, 0), 0.07, looks.trousers),
    rod(v(0, 0.84, 0), v(0, 1.42, 0), 0.19, color, 6),
    arm(-0.2),
    arm(0.2),
    ball(0.12, looks.skin, 0, 1.6, 0),
    box(0.25, 0.09, 0.25, looks.hair, 0, 1.69, 0.03),
  ])
    .scale(tall, tall, tall)
    .rotateY(yaw)
    .translate(foot.x, foot.y, foot.z);
}

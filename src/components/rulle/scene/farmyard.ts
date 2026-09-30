import * as THREE from "three";
import { flagsOf, hash, herdsOf, type Course, type Herd } from "@/modules/rulle";
import { cowBody, cowHead, fence, flagCloth, flagPole, NECK, wave } from "./farm-life";
import type { Ground } from "./ground";
import { freeze } from "./props";
import { groundPoint, roadYaw } from "./road-point";

/**
 * The herds and the flags along the route (ADR 0034), the same on every
 * lap. Cows graze in fenced fields beside the road; the ones that are not
 * grazing turn their heads to watch the rider go by, and each herd is
 * counted as it is passed. The flags blow against the rider, whichever
 * way the road runs: the Danish head wind, which never lets up.
 */

type HerdDrawn = {
  herd: Herd;
  index: number;
  heads: THREE.InstancedMesh;
  cows: Cow[];
  middle: THREE.Vector3;
};
type Cow = { neck: THREE.Vector3; yaw: number; grazing: boolean };

const WATCHING = 90;
const HEAD_TURN = 1.2;

/** Whether a place lies in one of the herds' fields, where no tree should grow. */
export function inPaddocks(course: Course, ground: Ground): (x: number, z: number) => boolean {
  const herds = herdsOf(course);
  return (x, z) => {
    const near = ground.nearest(x, z);
    if (near.index < 0 || near.d < 6 || near.d > 70) return false;
    const along = near.index * course.step;
    return herds.some((herd) => {
      if (along < herd.at - 15 || along > herd.at + herd.length + 15) return false;
      const here = groundPoint(course, ground, along, 0);
      const right = groundPoint(course, ground, along, 1).sub(here);
      return Math.sign((x - here.x) * right.x + (z - here.z) * right.z) === herd.side;
    });
  };
}

export class Farmyard {
  readonly group = new THREE.Group();
  private readonly herds: HerdDrawn[] = [];
  private readonly flags: { cloth: THREE.Mesh; holder: THREE.Group; rest: Float32Array }[] = [];
  private readonly cloth = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly counted = new Set<string>();
  private t = 0;

  constructor(
    private readonly course: Course,
    private readonly ground: Ground,
    private readonly material: THREE.Material,
    private readonly seen: (count: number) => void,
  ) {
    herdsOf(course).forEach((herd, index) => this.addHerd(herd, index));
    for (const flag of flagsOf(course)) {
      const foot = groundPoint(course, ground, flag.at, flag.side * 10.8);
      const pole = flagPole(8);
      const geometry = flagCloth(1.9);
      this.geometries.push(pole, geometry);
      const polemesh = new THREE.Mesh(pole, material);
      polemesh.position.copy(foot);
      const holder = new THREE.Group();
      holder.position.set(foot.x, foot.y + 7.9, foot.z);
      const cloth = new THREE.Mesh(geometry, this.cloth);
      holder.add(cloth);
      this.group.add(freeze(polemesh), holder);
      const rest = Float32Array.from(geometry.getAttribute("position").array as Float32Array);
      this.flags.push({ cloth, holder, rest });
    }
  }

  /** Flags blowing, heads turning, and a herd counted as it is passed. */
  frame(distance: number, eye: THREE.Vector3, seconds: number): void {
    this.t += seconds;
    // Against the rider: the cloth, made along +z, points back the way the rider came.
    const against = roadYaw(this.course, distance);
    for (const flag of this.flags) {
      flag.holder.rotation.y = against;
      if (flag.holder.position.distanceToSquared(eye) < 700 * 700)
        wave(flag.cloth.geometry, flag.rest, this.t);
    }
    const length = this.course.length;
    const lap = Math.floor(distance / length);
    const along = distance - lap * length;
    for (const drawn of this.herds) {
      const key = `${lap}:${drawn.index}`;
      if (
        !this.counted.has(key) &&
        along > drawn.herd.at + drawn.herd.length / 2 &&
        along < drawn.herd.at + drawn.herd.length + 400
      ) {
        this.counted.add(key);
        this.seen(drawn.herd.cows);
      }
      if (drawn.middle.distanceTo(eye) < WATCHING + drawn.herd.length) this.watch(drawn, eye);
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const h of this.herds) h.heads.dispose();
    this.cloth.dispose();
  }

  private addHerd(herd: Herd, index: number): void {
    const { course, ground, material } = this;
    const posts: THREE.Vector3[] = [];
    for (let s = 0; s <= herd.length; s += 3.5)
      posts.push(groundPoint(course, ground, herd.at + s, herd.side * 11.5));
    const rails = fence(posts);
    const body = cowBody(herd.red);
    const head = cowHead(herd.red);
    this.geometries.push(rails, body, head);
    const bodies = new THREE.InstancedMesh(body, material, herd.cows);
    const heads = new THREE.InstancedMesh(head, material, herd.cows);
    const cows: Cow[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < herd.cows; k++) {
      const s = 12 + hash(index, k, 311) * (herd.length - 24);
      const at = groundPoint(
        course,
        ground,
        herd.at + s,
        herd.side * (14 + hash(index, k, 312) * 22),
      );
      at.y -= 0.05;
      const yaw = hash(index, k, 313) * Math.PI * 2;
      q.setFromAxisAngle(up, yaw);
      bodies.setMatrixAt(k, m.compose(at, q, new THREE.Vector3(1, 1, 1)));
      const neck = NECK.clone().applyQuaternion(q).add(at);
      cows.push({ neck, yaw, grazing: hash(index, k, 314) < 0.45 });
    }
    const middle = groundPoint(course, ground, herd.at + herd.length / 2, herd.side * 25);
    const drawn = { herd, index, heads, cows, middle };
    this.pose(drawn, null);
    bodies.computeBoundingSphere();
    heads.computeBoundingSphere();
    this.group.add(freeze(new THREE.Mesh(rails, material)), freeze(bodies), freeze(heads));
    this.herds.push(drawn);
  }

  private watch(drawn: HerdDrawn, eye: THREE.Vector3): void {
    this.pose(drawn, eye);
  }

  /** Each head down in the grass, or turned toward `eye` as far as a neck turns. */
  private pose(drawn: HerdDrawn, eye: THREE.Vector3 | null): void {
    const m = new THREE.Matrix4();
    const e = new THREE.Euler(0, 0, 0, "YXZ");
    drawn.cows.forEach((cow, k) => {
      let yaw = cow.yaw;
      if (!cow.grazing && eye) {
        const toward = Math.atan2(-(eye.x - cow.neck.x), -(eye.z - cow.neck.z));
        let turn = toward - cow.yaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        yaw = cow.yaw + Math.max(-HEAD_TURN, Math.min(HEAD_TURN, turn));
      }
      e.set(cow.grazing ? -0.95 : 0.05, yaw, 0);
      m.compose(cow.neck, new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1));
      drawn.heads.setMatrixAt(k, m);
    });
    drawn.heads.instanceMatrix.needsUpdate = true;
  }
}

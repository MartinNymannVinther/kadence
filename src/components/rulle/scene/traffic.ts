import * as THREE from "three";
import {
  courseAt,
  punctureOnLap,
  ridersOnLap,
  type Course,
  type Rider,
  type Seen,
} from "@/modules/rulle";
import type { Ground } from "./ground";
import { KITS, NpcRider, puncture } from "./npc-rider";
import { PALETTE } from "./palette";
import { freeze } from "./props";
import { groundPoint, roadPoint, roadYaw } from "./road-point";

/**
 * The road's traffic of riders (ADR 0035), where `ridersOnLap` puts them:
 * those coming the other way in the far lane, many with a hand raised as
 * they pass; those ahead, slower, near the verge, to be caught and passed;
 * those from behind, faster, passing on the left; a few together now and
 * then. Once in a while someone at the roadside mending a puncture. Riders
 * come from a small pool and go back to it; none is ever raced or timed.
 */

type Member = {
  npc: NpcRider;
  distance: number;
  offset: number;
  speed: number;
  /** Along the road (1) or against it (-1). */
  way: 1 | -1;
  greets: boolean;
};

/** Where each kind appears, metres from the rider, and where it rides across the road. */
const APPEAR = { oncoming: 280, ahead: 170, behind: -45 } as const;
const LANE = { oncoming: -1.7, ahead: 2.3, behind: -0.35 } as const;
const GAP = 2.4;
/** Farther than this ahead, or this far behind, a rider is let go. */
const AHEAD = 420;
const BEHIND = 60;
const POOL = 12;

export class Traffic {
  readonly group = new THREE.Group();
  private lap = -1;
  private plan: Rider[] = [];
  private next = 0;
  private readonly members: Member[] = [];
  private readonly pool: NpcRider[] = [];
  private readonly legs = new THREE.MeshLambertMaterial({ color: PALETTE.skin, flatShading: true });
  private flat: { at: number; lap: number; mesh: THREE.Mesh; counted: boolean } | null = null;
  private greeted = new Set<number>();

  constructor(
    private readonly course: Course,
    private readonly ground: Ground,
    private readonly material: THREE.Material,
    private readonly seen: (key: keyof Seen, count: number) => void,
  ) {}

  frame(distance: number, speed: number, seconds: number, paused: boolean): void {
    const length = this.course.length;
    const lap = Math.floor(distance / length);
    const along = distance - lap * length;
    if (lap !== this.lap) {
      this.lap = lap;
      // A city's closed course is ridden one way: nobody comes the other.
      this.plan = ridersOnLap(this.course, lap).filter(
        (r) => !this.ground.city || r.kind !== "oncoming",
      );
      this.next = 0;
      while (this.next < this.plan.length && this.plan[this.next]!.at < along) this.next++;
      this.puncture(lap);
    }
    const due = this.plan[this.next];
    if (due && along >= due.at - Math.max(0, APPEAR[due.kind]) * 0.6) {
      if (!paused) this.start(due, distance);
      this.next++;
    }
    for (const m of [...this.members]) this.move(m, distance, seconds);
    this.mend(distance);
  }

  dispose(): void {
    for (const npc of [...this.pool, ...this.members.map((m) => m.npc)]) npc.dispose();
    this.legs.dispose();
    if (this.flat) this.flat.mesh.geometry.dispose();
  }

  private take(kit: number, seed: number): NpcRider {
    // Pooled riders keep the kit they were made in: a new kit is a new rider.
    const found = this.pool.findIndex((n) => n.group.userData.kit === kit % KITS.length);
    const npc =
      found >= 0
        ? this.pool.splice(found, 1)[0]!
        : new NpcRider(this.material, kit, seed, this.legs);
    npc.group.userData.kit = kit % KITS.length;
    npc.group.rotation.order = "YXZ";
    this.group.add(npc.group);
    return npc;
  }

  private start(rider: Rider, distance: number): void {
    const room = POOL - this.members.length;
    const count = Math.min(rider.count, room);
    for (let i = 0; i < count; i++) {
      // A club out riding wears one kit; two riders, one each.
      const kit = rider.count > 2 ? rider.seed : rider.seed + i * 3;
      const way = rider.kind === "oncoming" ? -1 : 1;
      // In line, a wheel's length or so apart; two abreast now and then, coming the other way.
      const abreast = rider.kind === "oncoming" && rider.count === 2 && i === 1;
      this.members.push({
        npc: this.take(kit, rider.seed + i),
        distance: distance + APPEAR[rider.kind] + (abreast ? 0.4 : i * GAP * (way === 1 ? -1 : 1)),
        offset: LANE[rider.kind] + (abreast ? -0.7 : 0),
        speed: rider.speed,
        way,
        greets: rider.greets && i === 0,
      });
    }
  }

  private move(m: Member, distance: number, seconds: number): void {
    m.distance += m.way * m.speed * seconds;
    const group = m.npc.group;
    group.position.copy(roadPoint(this.course, m.distance, m.offset));
    group.rotation.y = roadYaw(this.course, m.distance) + (m.way === 1 ? 0 : Math.PI);
    group.rotation.x = m.way * Math.atan(courseAt(this.course, m.distance).grade);
    const gap = m.distance - distance;
    const greeting = m.greets && m.way === -1 && gap > -2 && gap < 30;
    if (greeting && !this.greeted.has(m.npc.group.id)) {
      this.greeted.add(m.npc.group.id);
      this.seen("waves", 1);
    }
    m.npc.animate(seconds, m.speed, greeting);
    if (gap > AHEAD || gap < -BEHIND) {
      this.members.splice(this.members.indexOf(m), 1);
      this.group.remove(group);
      this.greeted.delete(group.id);
      this.pool.push(m.npc);
    }
  }

  /** The lap's puncture, if it has one, beside the road where it is; counted as it is passed. */
  private puncture(lap: number): void {
    if (this.flat) {
      this.group.remove(this.flat.mesh);
      this.flat.mesh.geometry.dispose();
      this.flat = null;
    }
    const found = punctureOnLap(this.course, lap);
    if (!found) return;
    const mesh = new THREE.Mesh(puncture(lap), this.material);
    mesh.position.copy(groundPoint(this.course, this.ground, found.at, 4.3));
    mesh.rotation.y = roadYaw(this.course, found.at) + Math.PI / 2;
    this.group.add(freeze(mesh));
    this.flat = { at: found.at, lap, mesh, counted: false };
  }

  private mend(distance: number): void {
    const flat = this.flat;
    if (!flat || flat.counted) return;
    if (distance - flat.lap * this.course.length > flat.at) {
      flat.counted = true;
      this.seen("puncture", 1);
    }
  }
}

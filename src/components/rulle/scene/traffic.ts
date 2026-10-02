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
import { personOf } from "./folk-look";
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
 * A rider steering about on the cheat code (ADR 0045) is made way for.
 */

type Member = {
  npc: NpcRider;
  distance: number;
  offset: number;
  /** Where across the road it rides when nobody is in the way. */
  home: number;
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
/** Making way: this near along the road and across it, to this far beside, at this pace (m/s). */
const WAY = { along: 10, across: 1.6, beside: 1.7, pace: 2.5, edge: 2.7 } as const;

export class Traffic {
  readonly group = new THREE.Group();
  private lap = -1;
  private plan: Rider[] = [];
  private next = 0;
  private readonly members: Member[] = [];
  private readonly pool: NpcRider[] = [];
  /** The bare shins, a material for each skin. */
  private readonly legs = new Map<string, THREE.MeshLambertMaterial>();
  private readonly shorts = new THREE.MeshLambertMaterial({
    color: PALETTE.shorts,
    flatShading: true,
  });
  private flat: { at: number; lap: number; mesh: THREE.Mesh; counted: boolean } | null = null;
  private greeted = new Set<number>();

  constructor(
    private readonly course: Course,
    private readonly ground: Ground,
    private readonly material: THREE.Material,
    private readonly seen: (key: keyof Seen, count: number) => void,
  ) {}

  /** On by `seconds`; `line` is where the cheat code has the rider across the road, if it has. */
  frame(
    distance: number,
    speed: number,
    seconds: number,
    paused: boolean,
    line: number | null = null,
  ): void {
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
    for (const m of [...this.members]) this.move(m, distance, seconds, line);
    this.mend(distance);
  }

  dispose(): void {
    for (const npc of [...this.pool, ...this.members.map((m) => m.npc)]) npc.dispose();
    for (const legs of this.legs.values()) legs.dispose();
    this.shorts.dispose();
    if (this.flat) this.flat.mesh.geometry.dispose();
  }

  private take(kit: number, seed: number): NpcRider {
    // Pooled riders keep the kit they were made in: a new kit is a new rider.
    const found = this.pool.findIndex((n) => n.group.userData.kit === kit % KITS.length);
    const npc = found >= 0 ? this.pool.splice(found, 1)[0]! : this.rider(kit, seed);
    npc.group.userData.kit = kit % KITS.length;
    npc.group.rotation.order = "YXZ";
    this.group.add(npc.group);
    return npc;
  }

  /** A new rider in a kit, with a skin of their own. */
  private rider(kit: number, seed: number): NpcRider {
    const { skin } = personOf(seed + 5200);
    let legs = this.legs.get(skin);
    if (!legs) {
      legs = new THREE.MeshLambertMaterial({ color: skin, flatShading: true });
      this.legs.set(skin, legs);
    }
    return new NpcRider(this.material, kit, seed, legs, this.shorts, skin);
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
        home: LANE[rider.kind] + (abreast ? -0.7 : 0),
        speed: rider.speed,
        way,
        greets: rider.greets && i === 0,
      });
    }
  }

  private move(m: Member, distance: number, seconds: number, line: number | null): void {
    m.distance += m.way * m.speed * seconds;
    m.offset = makeWay(m, distance, seconds, line);
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
    const mesh = new THREE.Mesh(puncture(lap, personOf(lap + 6100).skin), this.material);
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

/** Where across the road a rider rides now: out of the way of one steering about, or home again. */
function makeWay(m: Member, distance: number, seconds: number, line: number | null): number {
  let want = m.home;
  if (line !== null && Math.abs(m.distance - distance) < WAY.along) {
    if (Math.abs(m.home - line) < WAY.across) {
      // Beside the rider on its own side, or the other side where its own runs off the road.
      const side = m.home >= line ? 1 : -1;
      want = line + side * WAY.beside;
      if (Math.abs(want) > WAY.edge) want = line - side * WAY.beside;
    }
  }
  const gap = want - m.offset;
  return m.offset + Math.sign(gap) * Math.min(Math.abs(gap), WAY.pace * seconds);
}

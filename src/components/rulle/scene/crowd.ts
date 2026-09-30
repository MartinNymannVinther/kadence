import * as THREE from "three";
import {
  crowdAt,
  hash,
  inside,
  lapAlong,
  lapGap,
  RACE_DAY,
  type City,
  type Course,
  type RaceDay,
  type Side,
} from "@/modules/rulle";
import type { Ground } from "./ground";
import { PALETTE as P } from "./palette";
import { FLAGS, farShape, flagShape, spectatorShape, type FlagKind, type Pose } from "./race-folk";
import { BARRIER_LENGTH, barrierShape } from "./race-props";
import { groundPoint, roadYaw } from "./road-point";
import { treeMaterial } from "./trees";

/**
 * Who lines a city's course on race day (ADR 0036), and the barriers they
 * stand behind: as thick as `crowdAt` says, in rows along the kerb, each
 * one somebody of their own — a pose, a jacket, now and then a flag — and
 * those with their arms up bouncing on their toes. Thousands of them, so
 * drawn as copies of a few shapes (instanced), in parts of the lap: only
 * the parts near the rider are drawn at all, and those further off in a
 * plainer shape. Nobody in the crowd casts a shadow; the barriers do.
 */

/** Metres of lap in each part; parts this far ahead of the rider, or this far behind, are drawn. */
const PART = 200;
const AHEAD = 650;
const BEHIND = 120;
/** Parts whose middle is further ahead than this are drawn plain. */
const NEAR = 260;
/** Metres between two people in a row, and between rows; the first row's distance from the middle. */
const APART = 0.95;
const ROWS = 0.72;
const FIRST = 3.62;
const BEHIND_BARRIERS = 3.85;
/** The barriers stand at the kerb. */
const BARRIER = 3.3;

type Kind = { near: THREE.BufferGeometry; far: THREE.BufferGeometry | null; lively: boolean };
type Copies = { kind: Kind; matrices: THREE.Matrix4[]; colors: THREE.Color[] };
type Part = { from: number; near: THREE.Group; far: THREE.Group; always: THREE.Group };

export class Crowd {
  readonly group = new THREE.Group();
  private readonly parts: Part[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly still = treeMaterial();
  private readonly lively: THREE.MeshLambertMaterial;
  private readonly time = { value: 0 };

  constructor(
    private readonly course: Course,
    ground: Ground,
    day: RaceDay,
    city: City,
    private readonly barrierMaterial: THREE.Material,
    private readonly options: { calm: boolean; light: boolean },
  ) {
    // With less motion asked for, nobody bounces.
    this.lively = options.calm ? this.still : livelyMaterial(this.time);
    const L = course.length;
    const kind = (
      near: THREE.BufferGeometry,
      far: THREE.BufferGeometry | null,
      lively: boolean,
    ) => {
      this.shapes.push(near);
      if (far) this.shapes.push(far);
      return { near, far, lively };
    };
    const plain = farShape(null);
    this.shapes.push(plain);
    const poses = (["down", "up", "clap"] as Pose[]).map((pose) =>
      kind(spectatorShape(pose), plain, pose === "up"),
    );
    const flags = FLAGS[city].map((flag: FlagKind) => kind(flagShape(flag), farShape(flag), true));
    const barrier = kind(barrierShape(), null, false);
    const jackets = JACKETS[city].map((c) => new THREE.Color(c));
    const fill = options.light ? 0.5 : 1;
    const barriered = (d: number, side: Side) =>
      inside(day.finish, d, L) ||
      day.bends.some(
        (b) => b.marked && b.outside === side && lapGap(b.along, d, L) < RACE_DAY.bendBarriers,
      );

    for (let from = 0; from < L; from += PART) {
      const to = Math.min(L, from + PART);
      const copies = new Map<Kind, Copies>();
      const add = (what: Kind, at: THREE.Vector3, yaw: number, color = WHITE) => {
        const entry = copies.get(what) ?? { kind: what, matrices: [], colors: [] };
        entry.matrices.push(
          new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(UP, yaw), ONE),
        );
        entry.colors.push(color);
        copies.set(what, entry);
      };
      for (const side of [1, -1] as const) {
        // The barriers, section after section.
        for (let d = from; d < to; d += BARRIER_LENGTH + 0.05)
          if (barriered(d, side))
            add(barrier, groundPoint(course, ground, d, side * BARRIER), roadYaw(course, d));
        // The people, row after row.
        let k = Math.round(from / APART);
        for (let d = from; d < to; d += APART, k++) {
          const crowd = crowdAt(day, course, d, side);
          const first = barriered(d, side) ? BEHIND_BARRIERS : FIRST;
          const near = lapGap(d, 0, L) < 150;
          for (let row = 0; row < crowd.rows; row++) {
            const seed = row * 2 + (side > 0 ? 1 : 0);
            if (hash(k, seed, 771) >= crowd.fill * fill) continue;
            const along = d + (hash(k, seed, 772) - 0.5) * 0.4;
            const off = first + row * ROWS + hash(k, seed, 773) * 0.2;
            const foot = groundPoint(course, ground, along, side * off);
            // Facing the road, turned toward where the riders come from.
            const turn = side * (Math.PI / 2 + 0.25 + hash(k, seed, 774) * 0.45);
            const yaw = roadYaw(course, along) + turn;
            const r = hash(k, seed, 775);
            const jacket = jackets[Math.floor(hash(k, seed, 776) * jackets.length)]!;
            // Nearer the line, more flags and more arms in the air.
            if (r < (near ? 0.3 : 0.18))
              add(flags[Math.floor(hash(k, seed, 777) * flags.length)]!, foot, yaw, jacket);
            else add(poses[r < (near ? 0.55 : 0.38) ? 1 : r < 0.6 ? 2 : 0]!, foot, yaw, jacket);
          }
        }
      }
      if (copies.size === 0) continue;
      const part: Part = {
        from,
        near: new THREE.Group(),
        far: new THREE.Group(),
        always: new THREE.Group(),
      };
      for (const { kind: what, matrices, colors } of copies.values()) {
        const material =
          what === barrier ? barrierMaterial : what.lively ? this.lively : this.still;
        const into = what.far ? part.near : part.always;
        into.add(copiesOf(what.near, material, matrices, colors, what !== barrier));
        if (what.far) part.far.add(copiesOf(what.far, material, matrices, colors, true));
      }
      for (const group of [part.near, part.far, part.always]) {
        group.matrixAutoUpdate = false;
        group.visible = false;
        this.group.add(group);
      }
      this.parts.push(part);
    }
  }

  /** Makes way round a place: nobody in the crowd stands within `r` metres of it (a café, in a pause). */
  clearAround(x: number, z: number, r: number): void {
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    for (const part of this.parts)
      for (const group of [part.near, part.far])
        for (const child of group.children) {
          const mesh = child as THREE.InstancedMesh;
          let changed = false;
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, m);
            p.setFromMatrixPosition(m);
            if (Math.hypot(p.x - x, p.z - z) > r) continue;
            mesh.setMatrixAt(i, m.scale(NONE));
            changed = true;
          }
          if (changed) mesh.instanceMatrix.needsUpdate = true;
        }
  }

  /** Draws the parts near the rider, `along` metres into the lap; the crowd bounces on. */
  frame(along: number, seconds: number): void {
    if (!this.options.calm) this.time.value += seconds;
    const L = this.course.length;
    for (const part of this.parts) {
      const ahead = lapAlong(part.from + PART / 2 - along, L);
      const behind = ahead > L - BEHIND - PART / 2;
      const shown = ahead < AHEAD + PART / 2 || behind;
      const close = ahead < NEAR || behind;
      part.always.visible = shown;
      part.near.visible = shown && close;
      part.far.visible = shown && !close;
    }
  }

  dispose(): void {
    for (const shape of this.shapes) shape.dispose();
    for (const part of this.parts)
      for (const group of [part.near, part.far, part.always])
        for (const child of group.children) (child as THREE.InstancedMesh).dispose();
    this.still.dispose();
    this.lively.dispose();
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);
const NONE = new THREE.Vector3(0, 0, 0);
const WHITE = new THREE.Color(1, 1, 1);

/** The jackets in the crowd: Denmark's red and white in Copenhagen; Canada's red and Québec's blue in Montréal. */
const JACKETS: Record<City, readonly string[]> = {
  kobenhavn: [...P.jackets, P.flagRed, P.flagRed, "#f2efe8"],
  montreal: [...P.jackets, P.flagRed, P.flagRed, "#2f5d9a"],
};

function copiesOf(
  shape: THREE.BufferGeometry,
  material: THREE.Material,
  matrices: THREE.Matrix4[],
  colors: THREE.Color[],
  shadowless: boolean,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(shape, material, matrices.length);
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, colors[i]!);
  });
  mesh.computeBoundingSphere();
  mesh.matrixAutoUpdate = false;
  // Thousands of people would cost more in shadows than theirs are worth.
  mesh.userData.shadowless = shadowless;
  return mesh;
}

/**
 * The crowd's material for those with their arms up or a flag: flat-shaded
 * and jacketed like the rest (`treeMaterial`), and bouncing on their toes,
 * each at a beat of its own.
 */
function livelyMaterial(time: { value: number }): THREE.MeshLambertMaterial {
  const material = treeMaterial();
  const jackets = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    jackets(shader, renderer);
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          "#ifdef USE_INSTANCING",
          "float beat = instanceMatrix[3].x * 1.37 + instanceMatrix[3].z * 0.61;",
          "transformed.y += 0.08 * max(0.0, sin(uTime * 7.0 + beat));",
          "#endif",
        ].join("\n"),
      );
  };
  material.customProgramCacheKey = () => "rulle-crowd-lively";
  return material;
}

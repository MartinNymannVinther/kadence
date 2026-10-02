import * as THREE from "three";
import {
  crowdAt,
  hash,
  inside,
  lapGap,
  RACE_DAY,
  type City,
  type Course,
  type RaceDay,
  type Side,
} from "@/modules/rulle";
import type { Ground } from "./ground";
import { LapParts, type Kind } from "./lap-parts";
import { PALETTE as P } from "./palette";
import { FLAGS, farShape, flagShape, spectatorShape, type Pose } from "./race-folk";
import { folkMaterial } from "./folk-look";
import { BARRIER_LENGTH, barrierShape } from "./race-props";
import { groundPoint, roadYaw } from "./road-point";

/**
 * Who lines a city's course on race day (ADR 0036), and the barriers they
 * stand behind: as thick as `crowdAt` says, in rows along the kerb, each
 * one somebody of their own — a pose, a jacket, now and then a flag, a
 * skin, hair, trousers and a height of their own (`folkMaterial`, ADR
 * 0045), and children in the front row — and those with their arms up or
 * a flag bouncing on their toes. Thousands of them, so copies of a few
 * shapes in parts of the lap (`LapParts`), the far ones plainer. Nobody
 * in the crowd casts a shadow; the barriers do.
 */

/** Metres between two people in a row, and between rows; the first row's distance from the middle. */
const APART = 0.95;
const ROWS = 0.72;
const FIRST = 3.62;
const BEHIND_BARRIERS = 3.85;
/** The barriers stand at the kerb. */
const BARRIER = 3.3;
/** Grown-ups this much shorter or taller than the shape, at most; a child in the front row this often. */
const HEIGHTS = 0.08;
const CHILDREN = 0.14;

export class Crowd {
  private readonly parts: LapParts;
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly people = new Set<THREE.BufferGeometry>();
  private readonly still = folkMaterial();
  private readonly lively: THREE.MeshLambertMaterial;
  private readonly time = { value: 0 };

  constructor(
    course: Course,
    ground: Ground,
    day: RaceDay,
    city: City,
    barrierMaterial: THREE.Material,
    private readonly options: { calm: boolean; light: boolean },
  ) {
    this.parts = new LapParts(course, { part: 200, ahead: 650, behind: 120, near: 260 });
    // With less motion asked for, nobody bounces.
    this.lively = options.calm ? this.still : livelyMaterial(this.time);
    const L = course.length;
    const plain = this.keep(farShape(null));
    const person = (shape: THREE.BufferGeometry, far: THREE.BufferGeometry, lively: boolean) => {
      this.people.add(this.keep(shape)).add(far);
      const kind: Kind = {
        shape,
        plain: far,
        material: lively ? this.lively : this.still,
        shadowless: true,
      };
      return kind;
    };
    const poses = (["down", "up", "clap"] as Pose[]).map((pose) =>
      person(spectatorShape(pose), plain, pose === "up"),
    );
    const flags = FLAGS[city].map((flag) =>
      person(flagShape(flag), this.keep(farShape(flag)), true),
    );
    const barrier: Kind = { shape: this.keep(barrierShape()), material: barrierMaterial };
    const jackets = JACKETS[city].map((c) => new THREE.Color(c));
    const fill = options.light ? 0.5 : 1;
    const barriered = (d: number, side: Side) =>
      inside(day.finish, d, L) ||
      day.bends.some(
        (b) => b.marked && b.outside === side && lapGap(b.along, d, L) < RACE_DAY.bendBarriers,
      );

    for (const side of [1, -1] as const) {
      // The barriers, section after section.
      for (let d = 0; d < L; d += BARRIER_LENGTH + 0.05)
        if (barriered(d, side))
          this.parts.add(
            barrier,
            d,
            groundPoint(course, ground, d, side * BARRIER),
            roadYaw(course, d),
          );
      // The people, row after row.
      let k = 0;
      for (let d = 0; d < L; d += APART, k++) {
        const crowd = crowdAt(day, course, d, side);
        const first = barriered(d, side) ? BEHIND_BARRIERS : FIRST;
        const nearLine = lapGap(d, 0, L) < 150;
        for (let row = 0; row < crowd.rows; row++) {
          const seed = row * 2 + (side > 0 ? 1 : 0);
          if (hash(k, seed, 771) >= crowd.fill * fill) continue;
          const along = d + (hash(k, seed, 772) - 0.5) * 0.4;
          const off = first + row * ROWS + hash(k, seed, 773) * 0.2;
          const foot = groundPoint(course, ground, along, side * off);
          // Facing the road, turned toward where the riders come from.
          const turn = side * (Math.PI / 2 + 0.25 + hash(k, seed, 774) * 0.45);
          const r = hash(k, seed, 775);
          const jacket = jackets[Math.floor(hash(k, seed, 776) * jackets.length)]!;
          // Nearer the line, more flags and more arms in the air.
          const kind =
            r < (nearLine ? 0.3 : 0.18)
              ? flags[Math.floor(hash(k, seed, 777) * flags.length)]!
              : poses[r < (nearLine ? 0.55 : 0.38) ? 1 : r < 0.6 ? 2 : 0]!;
          // Children stand at the front, where they can see.
          const child = row === 0 && hash(k, seed, 778) < CHILDREN;
          const tall = child
            ? 0.62 + hash(k, seed, 779) * 0.1
            : 1 + (hash(k, seed, 779) * 2 - 1) * HEIGHTS;
          this.parts.add(kind, d, foot, roadYaw(course, along) + turn, jacket, tall);
        }
      }
    }
    this.parts.build();
  }

  get group(): THREE.Group {
    return this.parts.group;
  }

  /** Makes way round a place: nobody in the crowd stands within `r` metres of it (a café, in a pause). */
  clearAround(x: number, z: number, r: number): void {
    this.parts.clearAround(x, z, r, (shape) => this.people.has(shape));
  }

  /** Draws the parts near the rider, `along` metres into the lap; the crowd bounces on. */
  frame(along: number, seconds: number): void {
    if (!this.options.calm) this.time.value += seconds;
    this.parts.frame(along);
  }

  dispose(): void {
    this.parts.dispose();
    for (const shape of this.shapes) shape.dispose();
    this.still.dispose();
    this.lively.dispose();
  }

  private keep(shape: THREE.BufferGeometry): THREE.BufferGeometry {
    this.shapes.push(shape);
    return shape;
  }
}

/** The jackets in the crowd: Denmark's red and white in Copenhagen; Canada's red and Québec's blue in Montréal. */
const JACKETS: Record<City, readonly string[]> = {
  kobenhavn: [...P.jackets, P.flagRed, P.flagRed, "#f2efe8"],
  montreal: [...P.jackets, P.flagRed, P.flagRed, "#2f5d9a"],
};

/**
 * The crowd's material for those with their arms up or a flag: flat-shaded
 * and dressed like the rest (`folkMaterial`), and bouncing on their toes,
 * each at a beat of its own.
 */
function livelyMaterial(time: { value: number }): THREE.MeshLambertMaterial {
  const material = folkMaterial();
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

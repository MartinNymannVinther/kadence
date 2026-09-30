import * as THREE from "three";
import { CITIES, hash, lapGap, toPlane, type City, type Course } from "@/modules/rulle";
import type { Ground } from "./ground";
import { LapParts, type Kind } from "./lap-parts";
import { PALETTE as P } from "./palette";
import { painted } from "./props";
import { clothShape, FLAGS } from "./race-folk";
import { groundPoint, roadYaw } from "./road-point";
import { bar, box, merged, rod, v } from "./shapes";
import { drawnHeight } from "./terrain";
import { treeMaterial } from "./trees";

/**
 * A city's own face (ADR 0036), beside its race day: its street lights —
 * in Copenhagen lamps hung on wires across the street, in Montréal lamps
 * on posts leaning over it; the stones of the cemeteries the course runs
 * past, an obelisk among them now and then; the landmark by the course
 * the map has no building for, Mont-Royal's cross; and the country's
 * flags on their poles by the finish line.
 */

/** Metres between two street lamps. */
const LAMPS_APART = { wires: 32, posts: 36 } as const;
/** Cemeteries' stones: this far from the road's middle, rows this far apart. */
const STONES = { from: 10, to: 64, apart: 3.2 } as const;

export class CityFace {
  readonly group = new THREE.Group();
  private readonly parts: LapParts;
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly stones = treeMaterial();

  constructor(course: Course, ground: Ground, city: City, material: THREE.Material) {
    const face = CITIES[city];
    const L = course.length;
    this.parts = new LapParts(course, { part: 250, ahead: 700, behind: 150, near: 700 });
    this.group.add(this.parts.group);

    // The street lamps, all round the lap but under the finish arch.
    const lamp: Kind = {
      shape: this.keep(face.lamps === "wires" ? wireLamp() : postLamp()),
      material,
    };
    const apart = LAMPS_APART[face.lamps];
    for (let d = apart / 2, k = 0; d < L; d += apart, k++) {
      if (lapGap(d, 0, L) < 20) continue;
      // A post stands on one side, the next on the other; a wire spans the street.
      const side = face.lamps === "posts" && k % 2 === 1 ? -1 : 1;
      const at = groundPoint(course, ground, d, 0);
      this.parts.add(lamp, d, at, roadYaw(course, d) + (side < 0 ? Math.PI : 0));
    }

    // The stones of the cemeteries beside the course: white here, each its own stone's colour.
    const slab: Kind = { shape: this.keep(slabShape()), material: this.stones, shadowless: true };
    const obelisk: Kind = { shape: this.keep(obeliskShape()), material: this.stones };
    const greys = STONE_COLOURS.map((c) => new THREE.Color(c));
    for (const side of [1, -1] as const)
      for (let d = 0, k = 0; d < L; d += STONES.apart, k++)
        for (let off = STONES.from; off < STONES.to; off += STONES.apart) {
          const at = groundPoint(course, ground, d, side * off);
          if (ground.patch(at.x, at.z).kind !== "cemetery") continue;
          const r = hash(k, Math.round(off * side), 921);
          if (r > 0.72) continue;
          const kind = r < 0.03 ? obelisk : slab;
          const colour = greys[Math.floor(hash(k, Math.round(off), 922) * greys.length)]!;
          const yaw = roadYaw(course, d) + (hash(k, off, 923) - 0.5) * 0.2;
          this.parts.add(kind, d, at, yaw, colour, 0.8 + hash(k, off, 924) * 0.45);
        }
    this.parts.build();

    // The landmarks, where they stand.
    for (const mark of face.landmarks) {
      const p = toPlane(course.origin, mark.lat, mark.lon);
      const x = p.x;
      const z = -p.y;
      const cross = new THREE.Mesh(this.keep(crossShape(mark.height)), material);
      cross.position.set(x, drawnHeight(ground, x, z) - 0.5, z);
      this.group.add(cross);
    }

    // The country's flags on poles either side of the finish line.
    const flags = FLAGS_AT_FINISH[city];
    flags.forEach((kind, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const along = i < 2 ? -18 : 12;
      const pole = new THREE.Mesh(this.keep(flagpole(kind)), material);
      pole.position.copy(groundPoint(course, ground, along, side * 9));
      pole.rotation.y = roadYaw(course, along) + (side * Math.PI) / 2;
      this.group.add(pole);
    });
  }

  frame(along: number): void {
    this.parts.frame(along);
  }

  dispose(): void {
    this.parts.dispose();
    for (const shape of this.shapes) shape.dispose();
    this.stones.dispose();
  }

  private keep(shape: THREE.BufferGeometry): THREE.BufferGeometry {
    this.shapes.push(shape);
    return shape;
  }
}

/** The flags by the finish: the host's, twice over each side. */
const FLAGS_AT_FINISH: Record<City, (typeof FLAGS)[City][number][]> = {
  kobenhavn: ["dk", "dk", "dk", "dk"],
  montreal: ["ca", "qc", "qc", "ca"],
};

/** Granite, grey and dark, and a pale sandstone: painted per stone. */
const STONE_COLOURS = ["#9a9893", "#86847f", "#6f6d69", "#b3aa98", "#a8a49c"];

/**
 * Copenhagen's street light: a lamp hung over the middle of the street
 * from a wire between two slim poles at the building line, the wire
 * sagging a little to it. Across x, facing -z.
 */
function wireLamp(): THREE.BufferGeometry {
  const H = 7.6;
  const hang = 7.15;
  const pole = (x: number) => rod(v(x, 0, 0), v(x, H + 0.1, 0), 0.05, P.dark, 5, true);
  return merged([
    pole(-8.3),
    pole(8.3),
    bar(v(-8.3, H, 0), v(0, hang, 0), 0.02, P.dark),
    bar(v(0, hang, 0), v(8.3, H, 0), 0.02, P.dark),
    bar(v(0, hang, 0), v(0, hang - 0.25, 0), 0.02, P.dark),
    painted(
      new THREE.CylinderGeometry(0.12, 0.42, 0.22, 8).translate(0, hang - 0.36, 0),
      P.lampHat,
    ),
    painted(
      new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8).translate(0, hang - 0.48, 0),
      P.lampGlass,
    ),
  ]);
}

/** Montréal's street light: a grey post at the kerb, an arm leaning over the road, its lamp. */
function postLamp(): THREE.BufferGeometry {
  const x = 7.7;
  return merged([
    rod(v(x, 0, 0), v(x, 8.2, 0), 0.09, P.lampPost, 6, true),
    bar(v(x, 8.1, 0), v(x - 2.2, 8.6, 0), 0.07, P.lampPost),
    box(0.75, 0.16, 0.34, P.lampPost, x - 2.45, 8.55, 0),
    box(0.6, 0.03, 0.26, P.lampGlass, x - 2.45, 8.46, 0),
  ]);
}

/** A gravestone: a slab of stone, painted per copy, on its plinth. */
function slabShape(): THREE.BufferGeometry {
  return merged([
    box(0.62, 0.78, 0.14, "#ffffff", 0, 0.47, 0),
    box(0.74, 0.1, 0.3, "#ffffff", 0, 0.05, 0.02),
  ]);
}

/** An obelisk on its base, as the old monuments among the stones stand. */
function obeliskShape(): THREE.BufferGeometry {
  return merged([
    box(0.9, 0.5, 0.9, "#ffffff", 0, 0.25, 0),
    painted(
      new THREE.CylinderGeometry(0.2, 0.34, 2.6, 4).rotateY(Math.PI / 4).translate(0, 1.8, 0),
      "#ffffff",
    ),
    painted(
      new THREE.ConeGeometry(0.2, 0.35, 4).rotateY(Math.PI / 4).translate(0, 3.27, 0),
      "#ffffff",
    ),
  ]);
}

/**
 * La croix du mont Royal: a steel lattice cross `height` metres tall, its
 * arms about a third of it across, on a low base. Read as it stands on
 * the skyline: two slender beams of grey steel.
 */
function crossShape(height: number): THREE.BufferGeometry {
  const w = 1.8;
  return merged([
    box(5, 1.2, 5, P.kerb, 0, 0.6, 0),
    box(w, height, w, P.crossSteel, 0, height / 2, 0),
    box(height * 0.35, w, w, P.crossSteel, 0, height * 0.66, 0),
  ]);
}

/** A flagpole, 10 m, its flag at the top blowing out from it along x. */
function flagpole(kind: (typeof FLAGS)[City][number]): THREE.BufferGeometry {
  return merged([
    rod(v(0, 0, 0), v(0, 10, 0), 0.06, P.metal, 6),
    painted(new THREE.SphereGeometry(0.1, 6, 4).translate(0, 10.05, 0), P.brass),
    clothShape(kind).scale(2.6, 2.6, 1).translate(0.06, 8.6, 0),
  ]);
}

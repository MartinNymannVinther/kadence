import * as THREE from "three";
import type { Course, Stretch, Structures } from "@/modules/rulle";
import { ROAD_HALF, type Ground } from "./ground";
import { PALETTE as P } from "./palette";
import { roadPoint, roadYaw } from "./road-point";
import { overpassShapes } from "./overpasses";
import { box, merged } from "./shapes";
import { underpassShapes } from "./underpasses";
import { drawnHeight } from "./terrain";

/**
 * The bridges on the way (ADR 0037), as the landscape draws them: under a
 * bridge the road is on, pairs of piers down to the land or the water
 * below, a crossbeam on each, and at each end the abutment where the
 * bridge meets the land — the deck itself, its edges and its parapets are
 * the road's own (`road.ts`); what passes over the road (`overpasses.ts`);
 * and the railings where the road crosses a tunnel (`underpasses.ts`).
 * One mesh for all of it.
 */

/** How deep the deck is below the road's surface (`road.ts`), and how far apart its piers stand. */
const DEPTH = 1.1;
const PIERS_APART = 16;
/** Less room than this under a deck, and it needs no pier. */
const HEADROOM = 1.2;

export class Bridges {
  readonly group = new THREE.Group();
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });

  constructor(course: Course, ground: Ground, found: Structures) {
    const parts = found.decks.flatMap((deck) => supports(course, ground, deck));
    const shapes = [
      parts.length > 0 ? merged(parts) : null,
      overpassShapes(course, ground, found.overpasses),
      underpassShapes(course, found.underpasses),
    ];
    for (const shape of shapes) {
      if (!shape) continue;
      this.shapes.push(shape);
      const mesh = new THREE.Mesh(shape, this.material);
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
  }

  dispose(): void {
    for (const shape of this.shapes) shape.dispose();
    this.material.dispose();
  }
}

/** A shape made facing -z along the road, stood `along` metres in and `off` right of its middle. */
function placed(
  course: Course,
  shape: THREE.BufferGeometry,
  along: number,
  off: number,
  y: number,
): THREE.BufferGeometry {
  const p = roadPoint(course, along, off);
  return shape.rotateY(roadYaw(course, along)).translate(p.x, y, p.z);
}

/** A deck's piers and its abutments. */
function supports(course: Course, ground: Ground, deck: Stretch): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const under = (along: number) => {
    const road = roadPoint(course, along, 0);
    return { top: road.y - DEPTH, base: drawnHeight(ground, road.x, road.z) };
  };
  const span = deck.to - deck.from;
  const count = Math.max(1, Math.round(span / PIERS_APART) - 1);
  for (let k = 1; k <= count; k++) {
    const along = deck.from + (span * k) / (count + 1);
    const { top, base } = under(along);
    if (top - base < HEADROOM) continue;
    const high = top - base + 0.8;
    for (const side of [-1, 1])
      out.push(
        placed(
          course,
          box(0.9, high, 0.9, P.bridgeShade),
          along,
          side * (ROAD_HALF - 0.4),
          base - 0.8 + high / 2,
        ),
      );
    out.push(
      placed(course, box(2 * ROAD_HALF + 1.2, 0.6, 1.1, P.bridgeShade), along, 0, top - 0.3),
    );
  }
  // Where the bridge meets the land at each end: a wall across, down into it.
  for (const along of [deck.from + 1, deck.to - 1]) {
    const { top, base } = under(along);
    const high = Math.max(1, top - base + 1.5);
    const across = 2 * (ROAD_HALF + 1.15);
    out.push(placed(course, box(across, high, 1.8, P.bridge), along, 0, top - high / 2));
  }
  return out;
}

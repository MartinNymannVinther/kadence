import * as THREE from "three";
import type { StopKind } from "@/modules/rulle";
import { PALETTE as P } from "./palette";
import { building, painted } from "./props";
import { box, merged, rod, v } from "./shapes";
import { drinkShape, type Drink } from "./sitter";
import { boardTexture, disposeTextured, signTexture } from "./text-plates";

/**
 * Where a pause is spent (ADR 0034): a little café with a parasol over
 * its table, or a farm stand with a crate of sodas and an honesty box and
 * a table beside it. Built in its own coordinates facing -z, toward the
 * road: the table at the origin, the rider's chair behind it, the house
 * or the stand behind that, and a place for the bike against the wall.
 */

export type Stop = {
  group: THREE.Group;
  kind: StopKind;
  drink: Drink;
  /** Where the rider sits, and where the bike leans (its turn, and how far it leans). */
  seat: THREE.Vector3;
  bike: { at: THREE.Vector3; yaw: number; lean: number };
  /** Cups or bottles drunk here, left on the table. */
  leave(count: number): void;
  dispose(): void;
};

/** A parasol's canopy in moss and cream stripes. */
function canopy(): THREE.BufferGeometry {
  const cone = new THREE.ConeGeometry(1.25, 0.45, 12).toNonIndexed();
  const count = cone.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  const moss = new THREE.Color(P.parasol);
  const cream = new THREE.Color(P.wall);
  for (let i = 0; i < count; i++) {
    const c = Math.floor(i / 3) % 2 === 0 ? moss : cream;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  cone.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  cone.deleteAttribute("uv");
  cone.computeVertexNormals();
  return cone.translate(0, 2.2, 0);
}

function chair(x: number, z: number, turn: number): THREE.BufferGeometry {
  const parts = [
    box(0.42, 0.04, 0.42, P.chair, 0, 0.46, 0),
    box(0.42, 0.42, 0.04, P.chair, 0, 0.68, 0.2),
  ];
  for (const [lx, lz] of [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ] as const)
    parts.push(rod(v(lx, 0, lz), v(lx, 0.46, lz), 0.02, P.chair, 4));
  return merged(parts).rotateY(turn).translate(x, 0, z);
}

function tableSet(parasol: boolean): THREE.BufferGeometry[] {
  return [
    painted(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 12).translate(0, 0.72, 0), P.metal),
    rod(v(0, 0, 0), v(0, 0.72, 0), 0.03, P.metal),
    box(0.4, 0.03, 0.4, P.metal, 0, 0.015, 0),
    chair(0, 0.58, 0),
    chair(0.72, -0.05, Math.PI / 2),
    ...(parasol ? [rod(v(0, 0.72, 0), v(0, 2.25, 0), 0.025, P.metal), canopy()] : []),
  ];
}

/** The legs of a pavement board, an A standing by the table. */
function aFrame(): THREE.BufferGeometry {
  const panel = (tilt: number, z: number) =>
    painted(new THREE.BoxGeometry(0.6, 0.95, 0.03).rotateX(tilt).translate(0, 0.46, z), P.wood);
  return merged([panel(0.2, -0.09), panel(-0.2, 0.09)]);
}

/** A sign's face, turned to the road. */
function sign(text: string, width: number): THREE.Mesh {
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshLambertMaterial({ map: signTexture(text) }),
  );
  face.rotation.y = Math.PI;
  return face;
}

export function buildStop(
  kind: StopKind,
  material: THREE.Material,
  words: { cafe: string; stand: string },
): Stop {
  const group = new THREE.Group();
  const parts: THREE.BufferGeometry[] = tableSet(kind === "cafe");
  let board: THREE.Mesh;
  if (kind === "cafe") {
    parts.push(
      building(5, 4.2, 2.8, P.roofRed).translate(0.6, 0, 4.4),
      box(1.0, 2.0, 0.06, P.wood, 0.6, 1.0, 2.27),
      box(1.1, 0.9, 0.06, P.glass, -1.0, 1.4, 2.27),
      box(1.1, 0.9, 0.06, P.glass, 2.2, 1.4, 2.27),
    );
    board = sign(words.cafe, 1.7);
    board.position.set(0.6, 3.3, 1.97);
  } else {
    parts.push(
      box(1.8, 0.9, 0.7, P.wood, 0.3, 0.45, 2.4),
      box(0.08, 2.1, 0.08, P.wood, -0.55, 1.05, 2.72),
      box(0.08, 2.1, 0.08, P.wood, 1.15, 1.05, 2.72),
      box(2.1, 0.07, 1.2, P.roofDark, 0.3, 2.12, 2.45),
      box(0.5, 0.3, 0.4, P.parasol, -0.25, 1.05, 2.34),
      box(0.18, 0.16, 0.14, P.dark, 0.95, 0.98, 2.2),
    );
    // Sodas in the crate, their necks out.
    for (let k = 0; k < 6; k++)
      parts.push(
        drinkShape("bottle", true).translate(
          -0.4 + (k % 3) * 0.15,
          0.95,
          2.25 + Math.floor(k / 3) * 0.18,
        ),
      );
    board = sign(words.stand, 1.8);
    board.position.set(0.3, 1.72, 2.04);
  }
  // For the café, a chalkboard by the table too, where the picture of the pause shows it.
  const faces: THREE.Mesh[] = [board];
  if (kind === "cafe") {
    parts.push(aFrame().translate(-1.3, 0, -0.45));
    const chalkboard = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.65),
      new THREE.MeshLambertMaterial({ map: boardTexture(words.cafe) }),
    );
    chalkboard.position.set(-1.3, 0.5, -0.56);
    chalkboard.rotation.set(0.2, Math.PI, 0, "YXZ");
    faces.push(chalkboard);
  }
  const shape = merged(parts);
  group.add(new THREE.Mesh(shape, material), ...faces);
  const empties = new THREE.Group();
  group.add(empties);
  const drink: Drink = kind === "cafe" ? "cup" : "bottle";
  const left: THREE.BufferGeometry[] = [];
  return {
    group,
    kind,
    drink,
    seat: v(0, 0, 0.62),
    bike:
      kind === "cafe"
        ? { at: v(-0.85, 0, 2.05), yaw: -Math.PI / 2, lean: -0.16 }
        : { at: v(1.75, 0, 2.3), yaw: Math.PI / 2, lean: 0.16 },
    leave(count) {
      for (let k = empties.children.length; k < count; k++) {
        const geometry = drinkShape(drink, false);
        left.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0.12 - k * 0.14, 0.735, -0.18 + (k % 2) * 0.1);
        empties.add(mesh);
      }
    },
    dispose() {
      shape.dispose();
      for (const face of faces) disposeTextured(face);
      for (const g of left) g.dispose();
    },
  };
}

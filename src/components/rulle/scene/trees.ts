import * as THREE from "three";
import { hash } from "./noise";
import { PALETTE } from "./palette";
import { at, type Batches, merged, painted } from "./props";

/**
 * The trees, low-poly and flat-shaded: conifers, broadleaves green or
 * turning — or in June all green, and in a Montréal September maples
 * going red (ADR 0036) — birches, and the bushes of a hedge. One shape for each kind,
 * its crown painted white: each copy is given its crown's colour, so a
 * chunk's woods are four instanced meshes, not one for every green. The
 * material (`treeMaterial`) paints a white crown in the copy's colour and
 * leaves a trunk its own.
 */

export type Family = "conifers" | "broadleaves" | "autumn" | "birches" | "bushes";
export type TreeShapes = Record<Family, { geometry: THREE.BufferGeometry; crowns: THREE.Color[] }>;

const CROWN = "#ffffff";

/** A trunk, open at its ends: one stands in the ground and the other in a crown. */
const trunk = (bottom: number, top: number, height: number, color: string = PALETTE.trunk) =>
  painted(at(new THREE.CylinderGeometry(top, bottom, height, 5, 1, true), 0, height / 2, 0), color);

/** A conifer: a cone on a short trunk, 8 m tall. */
function conifer(): THREE.BufferGeometry {
  return merged([
    trunk(0.35, 0.25, 1.6),
    painted(at(new THREE.ConeGeometry(2.3, 6.8, 7), 0, 1.2 + 3.4, 0), CROWN),
  ]);
}

/** A broadleaf: a faceted crown on a trunk, 7.5 m tall. */
function broadleaf(): THREE.BufferGeometry {
  const ball = new THREE.IcosahedronGeometry(2.6, 0);
  ball.scale(1, 1.15, 1);
  return merged([trunk(0.38, 0.26, 2.6), painted(at(ball, 0, 2.6 + 2.3, 0), CROWN)]);
}

/** A birch: a slim white trunk and a tall, narrow crown, 9 m. */
function birch(): THREE.BufferGeometry {
  const top = new THREE.IcosahedronGeometry(1.7, 0);
  top.scale(0.9, 1.75, 0.9);
  return merged([
    trunk(0.22, 0.14, 4.4, PALETTE.birchBark),
    painted(at(top, 0, 4.1 + 2.3, 0), CROWN),
  ]);
}

/** A bush of a hedge: a low, broad crown on the ground, 2.4 m. */
function bush(): THREE.BufferGeometry {
  const ball = new THREE.IcosahedronGeometry(1.5, 0);
  ball.scale(1.15, 0.85, 1.15);
  return painted(at(ball, 0, 1.2, 0), CROWN);
}

const colors = (list: readonly string[]) => list.map((c) => new THREE.Color(c));

/** The season in the leaves: a Danish autumn, June, or maples turning. */
export type Season = "autumn" | "summer" | "maples";

export function treeShapes(season: Season = "autumn"): TreeShapes {
  const leaves = broadleaf();
  // The trees that turn are, in June, only a fresher green; in Montréal, red.
  const turning =
    season === "summer" ? PALETTE.june : season === "maples" ? PALETTE.maples : PALETTE.autumn;
  return {
    conifers: { geometry: conifer(), crowns: colors(PALETTE.trees) },
    broadleaves: { geometry: leaves, crowns: colors(PALETTE.trees) },
    autumn: { geometry: leaves, crowns: colors(turning) },
    birches: {
      geometry: birch(),
      crowns: colors(season === "summer" ? PALETTE.june : PALETTE.birchCrowns),
    },
    bushes: { geometry: bush(), crowns: colors(PALETTE.hedge) },
  };
}

export function disposeTrees(shapes: TreeShapes): void {
  for (const g of new Set(Object.values(shapes).map((s) => s.geometry))) g.dispose();
}

/**
 * The trees' material: flat-shaded like everything else, a white crown
 * painted in its copy's colour and a trunk left its own.
 */
export function treeMaterial(): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <color_vertex>",
      [
        "#include <color_vertex>",
        "#if defined( USE_COLOR ) && defined( USE_INSTANCING_COLOR )",
        "vColor.xyz = min( color.x, min( color.y, color.z ) ) > 0.99 ? instanceColor.xyz : color.xyz;",
        "#endif",
      ].join("\n"),
    );
  };
  return material;
}

/**
 * A tree of a family planted: its crown one of the family's colours, a
 * shade lighter or darker, all of it by the numbers it is given.
 */
export function plant(
  batches: Batches,
  shapes: TreeShapes,
  family: Family,
  position: THREE.Vector3,
  scale: number,
  seed: [number, number],
): void {
  const [a, b] = seed;
  const { geometry, crowns } = shapes[family];
  const crown = crowns[Math.floor(hash(a, b, 98) * crowns.length)]!.clone().multiplyScalar(
    0.9 + hash(a, b, 99) * 0.2,
  );
  batches.add(
    geometry,
    position,
    hash(a, b, 95) * 6,
    new THREE.Vector3(scale, scale * (0.9 + hash(a, b, 96) * 0.3), scale),
    crown,
  );
}

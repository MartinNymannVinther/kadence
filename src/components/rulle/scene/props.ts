import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";

/**
 * The few shapes the landscape is built from, low-poly and flat-shaded:
 * the white posts along a Danish road, tufts of grass, farms with red
 * roofs, a whitewashed church, wind turbines (the trees are `trees.ts`).
 * Each is one geometry with its colours in its vertices, made once and
 * shared by every copy.
 */

/** A geometry in one colour, its faces unshared so flat shading shows them. */
export function painted(geometry: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new THREE.Color(color);
  const count = flat.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  flat.deleteAttribute("uv");
  flat.computeVertexNormals();
  return flat;
}

/**
 * Marks what never moves as such: its place is worked out once, not in
 * every frame. With hundreds of trees, posts and farms around the rider,
 * that is most of what a frame would otherwise spend before it draws.
 */
export function freeze<T extends THREE.Object3D>(object: T): T {
  object.traverse((child) => {
    child.matrixAutoUpdate = false;
    child.updateMatrix();
  });
  return object;
}

export function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts, false);
  if (!geometry) throw new Error("Shapes that do not merge.");
  return geometry;
}

export const at = (geometry: THREE.BufferGeometry, x: number, y: number, z: number) =>
  geometry.translate(x, y, z);

/**
 * Copies of shapes, gathered and then drawn as one instanced mesh per
 * shape: each copy has its place, its turn and size, and a brightness or
 * a colour (a tree's crown, `trees.ts`), so a wood of one green is not a
 * wood of clones.
 */
export class Batches {
  private readonly map = new Map<
    THREE.BufferGeometry,
    { matrices: THREE.Matrix4[]; shades: (number | THREE.Color)[] }
  >();

  add(
    geometry: THREE.BufferGeometry,
    position: THREE.Vector3,
    turn: number,
    scale: THREE.Vector3,
    shade: number | THREE.Color = 1,
  ) {
    const entry = this.map.get(geometry) ?? { matrices: [], shades: [] };
    entry.matrices.push(
      new THREE.Matrix4().compose(
        position,
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn),
        scale,
      ),
    );
    entry.shades.push(shade);
    this.map.set(geometry, entry);
  }

  build(material: THREE.Material): THREE.InstancedMesh[] {
    const meshes: THREE.InstancedMesh[] = [];
    const color = new THREE.Color();
    for (const [geometry, { matrices, shades }] of this.map) {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((m, k) => {
        const shade = shades[k]!;
        mesh.setMatrixAt(k, m);
        mesh.setColorAt(k, typeof shade === "number" ? color.setScalar(shade) : shade);
      });
      mesh.computeBoundingSphere();
      meshes.push(mesh);
    }
    return meshes;
  }
}

/** The white post with a dark band that stands every fifty metres along the road. */
export function roadPost(): THREE.BufferGeometry {
  return merged([
    painted(at(new THREE.BoxGeometry(0.14, 1.0, 0.14), 0, 0.5, 0), PALETTE.post),
    painted(at(new THREE.BoxGeometry(0.15, 0.16, 0.15), 0, 0.84, 0), PALETTE.postBand),
  ]);
}

export function tuft(): THREE.BufferGeometry {
  return painted(at(new THREE.ConeGeometry(0.32, 0.55, 5), 0, 0.27, 0), PALETTE.tuft);
}

/** A gabled building: walls, and a roof of two slopes over them. */
export function building(w: number, d: number, h: number, roof: string): THREE.BufferGeometry {
  const walls = painted(at(new THREE.BoxGeometry(w, h, d), 0, h / 2, 0), PALETTE.wall);
  const ridge = w * 0.42;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.3, 0);
  shape.lineTo(w / 2 + 0.3, 0);
  shape.lineTo(0, ridge);
  shape.closePath();
  const prism = new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false });
  prism.translate(0, h, -(d + 0.6) / 2);
  return merged([walls, painted(prism, roof)]);
}

/** A farm: the house and a long barn at a right angle, red roofs or dark. */
export function farm(seed: number): THREE.BufferGeometry {
  const roof = seed % 3 === 0 ? PALETTE.roofDark : PALETTE.roofRed;
  const house = building(7, 14, 4, roof);
  const barn = building(9, 22, 5.5, roof);
  barn.rotateY(Math.PI / 2);
  barn.translate(12, 0, -9);
  return merged([house, barn]);
}

/** A village church: a whitewashed nave and a tower with a stepped look, a red roof. */
export function church(): THREE.BufferGeometry {
  const nave = building(9, 24, 7, PALETTE.roofRed);
  const tower = painted(at(new THREE.BoxGeometry(7.5, 16, 7.5), 0, 8, 15), PALETTE.tower);
  const cap = painted(
    at(new THREE.ConeGeometry(5.6, 6, 4).rotateY(Math.PI / 4), 0, 16 + 3, 15),
    PALETTE.roofRed,
  );
  return merged([nave, tower, cap]);
}

/** A wind turbine's tower and nacelle; its blades are `turbineBlades`, turning on their own. */
export function turbineTower(): THREE.BufferGeometry {
  return merged([
    painted(at(new THREE.CylinderGeometry(0.9, 1.8, 62, 8), 0, 31, 0), PALETTE.turbine),
    painted(at(new THREE.BoxGeometry(2.2, 2.4, 6), 0, 62.5, 0.5), PALETTE.turbine),
  ]);
}

export function turbineBlades(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const blade = new THREE.BoxGeometry(0.9, 26, 0.3);
    blade.translate(0, 13.5, 0);
    blade.rotateZ((k * 2 * Math.PI) / 3);
    blades.push(painted(blade, PALETTE.turbine));
  }
  blades.push(painted(new THREE.SphereGeometry(1.1, 6, 4), PALETTE.turbine));
  return merged(blades);
}

/** A cloud: a few flattened, faceted puffs. */
export function cloud(seed: number): THREE.BufferGeometry {
  const puffs: THREE.BufferGeometry[] = [];
  const count = 3 + (seed % 3);
  for (let k = 0; k < count; k++) {
    const puff = new THREE.IcosahedronGeometry(30 + ((seed * (k + 3)) % 25), 0);
    puff.scale(1.6, 0.55, 1);
    puff.translate(k * 45 - count * 20, ((seed + k) % 4) * 6, ((seed * k) % 5) * 10);
    puffs.push(painted(puff, PALETTE.cloud));
  }
  return merged(puffs);
}

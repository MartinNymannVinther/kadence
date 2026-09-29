import * as THREE from "three";
import { CHUNK, type ChunkKey } from "./terrain";
import type { Ground } from "./ground";
import { hash } from "./noise";
import { Batches, church, farm, treeShapes, turbineBlades, turbineTower } from "./props";

/**
 * The things on the land, chunk by chunk with the terrain under them:
 * woods where the ground says wood, a lone tree in a field, farms with
 * their red roofs back from the road, now and then a whitewashed village
 * church, and wind turbines turning slowly in the distance. Placed by
 * hashing where they stand, so the same route is the same country.
 */

/** Metres between the places a tree may stand; a chunk holds a whole number of them. */
const TREE_GRID = 20;
const FARM_CHANCE = 0.32;
const CHURCH_CHANCE = 0.03;
const TURBINE_CHANCE = 0.07;
/** Blades turn once in six seconds: calm, and seen from far. */
const BLADE_SPEED = (2 * Math.PI) / 6;

export class Scenery {
  readonly group = new THREE.Group();
  private readonly chunks = new Map<ChunkKey, { object: THREE.Group; blades: THREE.Object3D[] }>();
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  private readonly shapes = {
    trees: treeShapes(),
    farms: [farm(0), farm(1), farm(2)],
    church: church(),
    tower: turbineTower(),
    blades: turbineBlades(),
  };

  constructor(
    private readonly ground: Ground,
    private readonly density = 1,
  ) {}

  add(key: ChunkKey, cx: number, cz: number): void {
    const object = new THREE.Group();
    const blades: THREE.Object3D[] = [];
    this.trees(object, cx, cz);
    const x0 = cx * CHUNK;
    const z0 = cz * CHUNK;
    const spot = (salt: number, min: number, max: number) => {
      const x = x0 + (0.15 + hash(cx, cz, salt) * 0.7) * CHUNK;
      const z = z0 + (0.15 + hash(cx, cz, salt + 1) * 0.7) * CHUNK;
      const d = this.ground.nearest(x, z).d;
      const y = this.ground.height(x, z);
      const ok = d >= min && d <= max && y > 0.6 && this.ground.patch(x, z).kind !== "forest";
      return ok ? new THREE.Vector3(x, y, z) : null;
    };
    const farmAt = hash(cx, cz, 60) < FARM_CHANCE ? spot(61, 45, 900) : null;
    if (farmAt) {
      const mesh = new THREE.Mesh(
        this.shapes.farms[Math.floor(hash(cx, cz, 63) * 3)]!,
        this.material,
      );
      mesh.position.copy(farmAt).setY(farmAt.y - 0.2);
      mesh.rotation.y = hash(cx, cz, 64) * Math.PI * 2;
      object.add(mesh);
    }
    const churchAt = hash(cx, cz, 70) < CHURCH_CHANCE ? spot(71, 120, 1200) : null;
    if (churchAt) {
      const mesh = new THREE.Mesh(this.shapes.church, this.material);
      mesh.position.copy(churchAt).setY(churchAt.y - 0.3);
      mesh.rotation.y = hash(cx, cz, 72) * Math.PI;
      object.add(mesh);
    }
    const turbineAt = hash(cx, cz, 80) < TURBINE_CHANCE ? spot(81, 260, Infinity) : null;
    if (turbineAt) {
      const count = 1 + Math.floor(hash(cx, cz, 83) * 3);
      for (let k = 0; k < count; k++) {
        const x = turbineAt.x + k * 150;
        const z = turbineAt.z - k * 90;
        const tower = new THREE.Mesh(this.shapes.tower, this.material);
        tower.position.set(x, this.ground.height(x, z) - 0.5, z);
        // The wind is from the west, as it mostly is: every rotor faces it.
        tower.rotation.y = -Math.PI / 2;
        const rotor = new THREE.Mesh(this.shapes.blades, this.material);
        rotor.position.set(0, 62.5, 3.6);
        rotor.rotation.z = hash(cx, cz + k, 84) * Math.PI;
        tower.add(rotor);
        blades.push(rotor);
        object.add(tower);
      }
    }
    this.group.add(object);
    this.chunks.set(key, { object, blades });
  }

  remove(key: ChunkKey): void {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    this.group.remove(chunk.object);
    chunk.object.traverse((child) => {
      if (child instanceof THREE.InstancedMesh) child.dispose();
    });
    this.chunks.delete(key);
  }

  /** The turbines turn. */
  animate(seconds: number): void {
    for (const chunk of this.chunks.values())
      for (const rotor of chunk.blades) rotor.rotation.z += BLADE_SPEED * seconds;
  }

  dispose(): void {
    for (const key of [...this.chunks.keys()]) this.remove(key);
    const { trees, farms, church, tower, blades } = this.shapes;
    for (const geometry of [
      ...trees.conifers,
      ...trees.broadleaves,
      ...farms,
      church,
      tower,
      blades,
    ])
      geometry.dispose();
    this.material.dispose();
  }

  /** Woods where the ground is wood, and a rare lone tree in a field. */
  private trees(object: THREE.Group, cx: number, cz: number): void {
    const batches = new Batches();
    const { conifers, broadleaves } = this.shapes.trees;
    const n = CHUNK / TREE_GRID;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        const ia = cx * n + a;
        const ib = cz * n + b;
        if (hash(ia, ib, 90) > this.density) continue;
        const x = (ia + hash(ia, ib, 91)) * TREE_GRID;
        const z = (ib + hash(ia, ib, 92)) * TREE_GRID;
        const forest = this.ground.patch(x, z).kind === "forest";
        if (!forest && hash(ia, ib, 93) > 0.012) continue;
        if (this.ground.nearest(x, z).d < 16) continue;
        const y = this.ground.height(x, z);
        if (y < 0.4) continue;
        const scale = 0.8 + hash(ia, ib, 94) * 0.6;
        const kinds = hash(ia, ib, 97) < (forest ? 0.55 : 0.2) ? conifers : broadleaves;
        batches.add(
          kinds[Math.floor(hash(ia, ib, 98) * kinds.length)]!,
          new THREE.Vector3(x, y - 0.3, z),
          hash(ia, ib, 95) * 6,
          new THREE.Vector3(scale, scale * (0.9 + hash(ia, ib, 96) * 0.3), scale),
          0.9 + hash(ia, ib, 99) * 0.2,
        );
      }
    for (const mesh of batches.build(this.material)) object.add(mesh);
  }
}

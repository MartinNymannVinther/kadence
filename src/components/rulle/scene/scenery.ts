import * as THREE from "three";
import { CITIES } from "@/modules/rulle";
import { foldAround, type Buildings } from "./buildings";
import type { Ground } from "./ground";
import { LandScenery } from "./land-scenery";
import { hash } from "./noise";
import { Batches, church, farm, freeze, turbineBlades, turbineTower } from "./props";
import { CHUNK, drawnHeight, type ChunkKey } from "./terrain";
import { disposeTrees, treeMaterial, treeShapes, type TreeShapes } from "./trees";
import { plantWoods } from "./woods";

/**
 * The things on the land, chunk by chunk with the terrain under them. On
 * the real land round a route that comes with Kadence (ADR 0035), what is
 * there: woods, tree rows and hedges, towns and farms, streams, wind
 * turbines (`LandScenery`). On any other route, a country made up to fit
 * it: woods where the ground says wood, a lone tree in a field, farms
 * with their red roofs back from the road, now and then a whitewashed
 * village church, and wind turbines turning slowly in the distance.
 * Placed by hashing where they stand, so the same route is the same
 * country.
 */

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
  private readonly leaves = treeMaterial();
  private readonly shapes: {
    trees: TreeShapes;
    farms: THREE.BufferGeometry[];
    church: THREE.BufferGeometry;
    tower: THREE.BufferGeometry;
    blades: THREE.BufferGeometry;
  };
  private readonly land: LandScenery | null;

  /** Circles where a stop was put, kept clear from then on. */
  private readonly cleared: { x: number; z: number; r: number }[] = [];

  constructor(
    private readonly ground: Ground,
    private readonly density = 1,
    /** Where nothing of this may stand: the herds' fields. */
    private readonly blocked: (x: number, z: number) => boolean = () => false,
    /** What streams are drawn in. */
    private readonly water: THREE.Material = new THREE.MeshBasicMaterial(),
  ) {
    this.shapes = {
      // A city's trees as they stand on its race day (ADR 0036).
      trees: treeShapes(ground.city ? CITIES[ground.city].trees : "autumn"),
      farms: [farm(0), farm(1), farm(2)],
      church: church(),
      tower: turbineTower(),
      blades: turbineBlades(),
    };
    this.land = ground.land ? new LandScenery(ground.land, ground) : null;
  }

  /** Makes room at a place: what stands within `r` metres goes, and nothing grows there again. */
  clearAround(x: number, z: number, r: number): void {
    this.cleared.push({ x, z, r });
    for (const { object } of this.chunks.values()) {
      clearIn(object, x, z, r);
      for (const child of object.children)
        if (child.userData.parts) foldAround(child as Buildings, x, z, r);
    }
  }

  private free(x: number, z: number): boolean {
    return !this.blocked(x, z) && this.cleared.every((c) => Math.hypot(x - c.x, z - c.z) > c.r);
  }

  add(key: ChunkKey, cx: number, cz: number): void {
    const object = new THREE.Group();
    const blades: THREE.Object3D[] = [];
    const batches = new Batches();
    const free = (x: number, z: number) => this.free(x, z);
    plantWoods(batches, this.shapes.trees, this.ground, cx, cz, this.density, free);
    if (this.land) {
      for (const mesh of this.land.build(
        cx,
        cz,
        batches,
        this.shapes.trees,
        this.material,
        this.water,
        this.density,
        free,
      ))
        object.add(mesh);
      this.land
        .turbines(cx, cz)
        .forEach((t, k) => this.turbine(object, blades, t.x, t.z, cx, cz + k));
    } else this.madeUp(object, blades, cx, cz);
    for (const mesh of batches.build(this.leaves)) object.add(mesh);
    freeze(object);
    // The rotors are all that moves here.
    for (const rotor of blades) rotor.matrixAutoUpdate = true;
    this.group.add(object);
    this.chunks.set(key, { object, blades });
  }

  remove(key: ChunkKey): void {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    this.group.remove(chunk.object);
    chunk.object.traverse((child) => {
      if (child instanceof THREE.InstancedMesh) child.dispose();
      else if (child instanceof THREE.Mesh && child.userData.own) child.geometry.dispose();
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
    disposeTrees(trees);
    for (const geometry of [...farms, church, tower, blades]) geometry.dispose();
    this.material.dispose();
    this.leaves.dispose();
  }

  /** A wind turbine, its rotor facing the westerly. */
  private turbine(
    object: THREE.Group,
    blades: THREE.Object3D[],
    x: number,
    z: number,
    cx: number,
    cz: number,
  ): void {
    const tower = new THREE.Mesh(this.shapes.tower, this.material);
    tower.position.set(x, drawnHeight(this.ground, x, z) - 0.5, z);
    // The wind is from the west, as it mostly is: every rotor faces it.
    tower.rotation.y = -Math.PI / 2;
    const rotor = new THREE.Mesh(this.shapes.blades, this.material);
    rotor.position.set(0, 62.5, 3.6);
    rotor.rotation.z = hash(cx, cz, 84) * Math.PI;
    tower.add(rotor);
    blades.push(rotor);
    object.add(tower);
  }

  /** The made-up country's farm, church and turbines in a chunk, by chance. */
  private madeUp(object: THREE.Group, blades: THREE.Object3D[], cx: number, cz: number): void {
    const x0 = cx * CHUNK;
    const z0 = cz * CHUNK;
    const spot = (salt: number, min: number, max: number) => {
      const x = x0 + (0.15 + hash(cx, cz, salt) * 0.7) * CHUNK;
      const z = z0 + (0.15 + hash(cx, cz, salt + 1) * 0.7) * CHUNK;
      const d = this.ground.nearest(x, z).d;
      const y = this.ground.height(x, z);
      const kind = this.ground.patch(x, z).kind;
      const ok =
        d >= min &&
        d <= max &&
        y > 0.6 &&
        (kind === "field" || kind === "pasture") &&
        this.free(x, z);
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
      for (let k = 0; k < count; k++)
        this.turbine(object, blades, turbineAt.x + k * 150, turbineAt.z - k * 90, cx, cz + k);
    }
  }
}

/** Takes out of `object` every copy of a shape, and every shape, standing within `r` of a place. */
export function clearIn(object: THREE.Object3D, x: number, z: number, r: number): void {
  const m = new THREE.Matrix4();
  const at = new THREE.Vector3();
  const none = new THREE.Matrix4().makeScale(0, 0, 0);
  object.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) {
      let changed = false;
      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, m);
        at.setFromMatrixPosition(m);
        if (Math.hypot(at.x - x, at.z - z) <= r) {
          child.setMatrixAt(i, none);
          changed = true;
        }
      }
      if (changed) child.instanceMatrix.needsUpdate = true;
    } else if (
      child instanceof THREE.Mesh &&
      child.parent === object &&
      !child.userData.own &&
      Math.hypot(child.position.x - x, child.position.z - z) <= r
    )
      child.visible = false;
  });
}

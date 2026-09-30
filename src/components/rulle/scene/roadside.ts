import * as THREE from "three";
import type { Course } from "@/modules/rulle";
import { groundAt, ROAD_HALF } from "./ground";
import { hash } from "./noise";
import { Batches, roadPost, tuft } from "./props";
import { sections } from "./road";
import { clearIn } from "./scenery";
import { disposeTrees, plant, treeMaterial, treeShapes, type Family } from "./trees";

/**
 * What stands close to the road, where the eye catches it at the edge of
 * the picture: this is where the sense of speed comes from. A white post
 * every fifty metres on both sides, as on any Danish country road; tufts
 * of grass along the verges; now and then a tree a few metres off. Built
 * in half-kilometre lengths, each shown only while the rider is near it.
 */

const LENGTH = 50;
const SHOWN_WITHIN = 1400;

export class Roadside {
  readonly group = new THREE.Group();
  private readonly parts: { center: THREE.Vector3; object: THREE.Group }[] = [];
  private readonly post = roadPost();
  private readonly tuft = tuft();
  private readonly trees = treeShapes();
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  private readonly leaves = treeMaterial();

  constructor(
    course: Course,
    density = 1,
    /** Where no tree may stand: the herds' fields, and water. */
    blocked: (x: number, z: number) => boolean = () => false,
  ) {
    const all = sections(course);
    const n = course.outAndBack ? Math.ceil(all.length / 2) : all.length;
    const everyPost = Math.max(1, Math.round(50 / course.step));
    for (let start = 0; start < n; start += LENGTH) {
      const batches = new Batches();
      const trees = new Batches();
      const center = new THREE.Vector3();
      const end = Math.min(n, start + LENGTH);
      for (let i = start; i < end; i++) {
        const s = all[i]!;
        center.add(new THREE.Vector3(s.cx, s.cy, s.cz));
        // Stood on the verge (or the land beyond it) `off` metres from the road's middle.
        const at = (off: number, embed: number) =>
          new THREE.Vector3(
            s.cx + s.rx * off,
            s.cy + groundAt(off, s.sunk) - embed,
            s.cz + s.rz * off,
          );
        const size = (k: number) => new THREE.Vector3(k, k, k);
        if (i % everyPost === 0)
          for (const side of [-1, 1])
            batches.add(this.post, at(side * (ROAD_HALF + 1.3), 0.1), 0, size(1));
        for (let k = 0; k < Math.round(3 * density); k++) {
          const side = hash(i, k, 41) < 0.5 ? -1 : 1;
          const off = side * (ROAD_HALF + 0.6 + hash(i, k, 42) * 5.5);
          const shade = 0.85 + hash(i, k, 43) * 0.3;
          batches.add(
            this.tuft,
            at(off, 0.08),
            hash(i, k, 44) * 6,
            size(0.7 + hash(i, k, 45) * 0.8),
            shade,
          );
        }
        const side = hash(i, 1, 47) < 0.5 ? -1 : 1;
        // Within the flat beside the road, where the land is where the verge says it is.
        const off = side * (ROAD_HALF + 8 + hash(i, 2, 48) * 6);
        if (hash(i, 0, 46) < 0.16 * density && !blocked(s.cx + s.rx * off, s.cz + s.rz * off)) {
          const roll = hash(i, 3, 49);
          const kind: Family =
            roll < 0.3
              ? "conifers"
              : roll < 0.52
                ? "autumn"
                : roll < 0.62
                  ? "birches"
                  : "broadleaves";
          plant(trees, this.trees, kind, at(off, 0.3), 0.8 + hash(i, 6, 52) * 0.5, [i, 4051]);
        }
      }
      center.divideScalar(Math.max(1, end - start));
      const object = new THREE.Group();
      for (const mesh of batches.build(this.material)) object.add(mesh);
      for (const mesh of trees.build(this.leaves)) object.add(mesh);
      this.group.add(object);
      this.parts.push({ center, object });
    }
  }

  /** Makes room at a place for a stop: what stands within `r` metres goes. */
  clearAround(x: number, z: number, r: number): void {
    for (const part of this.parts) clearIn(part.object, x, z, r);
  }

  update(camera: THREE.Vector3): void {
    for (const part of this.parts)
      part.object.visible = part.center.distanceTo(camera) < SHOWN_WITHIN;
  }

  dispose(): void {
    this.post.dispose();
    this.tuft.dispose();
    disposeTrees(this.trees);
    this.material.dispose();
    this.leaves.dispose();
    for (const part of this.parts)
      for (const child of part.object.children) (child as THREE.InstancedMesh).dispose();
  }
}

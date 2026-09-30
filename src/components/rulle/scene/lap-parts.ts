import * as THREE from "three";
import { lapAlong, type Course } from "@/modules/rulle";

/**
 * Copies of a few shapes all along a lap (ADR 0036) — a crowd and its
 * barriers, the street lamps, the stones of a cemetery — drawn as
 * instanced meshes in parts of the lap: only the parts near the rider are
 * drawn at all, and those further ahead in a plainer shape, where a kind
 * has one. The shapes and materials stay their owner's.
 */

export type Kind = {
  shape: THREE.BufferGeometry;
  material: THREE.Material;
  /** Drawn instead of `shape` further off; none, and it is drawn as it is. */
  plain?: THREE.BufferGeometry;
  /** A crowd of thousands would cost more in shadows than theirs are worth. */
  shadowless?: boolean;
};

export type Reach = {
  /** Metres of lap in each part. */
  part: number;
  /** Parts this far ahead of the rider, or this far behind, are drawn. */
  ahead: number;
  behind: number;
  /** Parts whose middle is further ahead than this are drawn plain. */
  near: number;
};

type Copies = { matrices: THREE.Matrix4[]; colors: THREE.Color[] };
type Part = { from: number; near: THREE.Group; far: THREE.Group; always: THREE.Group };

const UP = new THREE.Vector3(0, 1, 0);
const WHITE = new THREE.Color(1, 1, 1);
const NONE = new THREE.Vector3(0, 0, 0);

export class LapParts {
  readonly group = new THREE.Group();
  private readonly pending = new Map<number, Map<Kind, Copies>>();
  private readonly parts: Part[] = [];

  constructor(
    private readonly course: Course,
    private readonly reach: Reach,
  ) {}

  /** A copy of a kind `along` metres into the lap, standing at `at`, turned `yaw`, in `color`. */
  add(kind: Kind, along: number, at: THREE.Vector3, yaw: number, color = WHITE, scale = 1): void {
    const index = Math.floor(lapAlong(along, this.course.length) / this.reach.part);
    const part = this.pending.get(index) ?? new Map<Kind, Copies>();
    const copies = part.get(kind) ?? { matrices: [], colors: [] };
    copies.matrices.push(
      new THREE.Matrix4().compose(
        at,
        new THREE.Quaternion().setFromAxisAngle(UP, yaw),
        new THREE.Vector3(scale, scale, scale),
      ),
    );
    copies.colors.push(color);
    part.set(kind, copies);
    this.pending.set(index, part);
  }

  /** Makes the meshes, once every copy is added. */
  build(): void {
    for (const [index, kinds] of this.pending) {
      const part: Part = {
        from: index * this.reach.part,
        near: new THREE.Group(),
        far: new THREE.Group(),
        always: new THREE.Group(),
      };
      for (const [kind, { matrices, colors }] of kinds) {
        const shadowless = kind.shadowless ?? false;
        const mesh = copiesOf(kind.shape, kind.material, matrices, colors, shadowless);
        if (!kind.plain) {
          part.always.add(mesh);
          continue;
        }
        part.near.add(mesh);
        part.far.add(copiesOf(kind.plain, kind.material, matrices, colors, shadowless));
      }
      for (const group of [part.near, part.far, part.always]) {
        group.matrixAutoUpdate = false;
        group.visible = false;
        this.group.add(group);
      }
      this.parts.push(part);
    }
    this.pending.clear();
  }

  /** Draws the parts near the rider, `along` metres into the lap. */
  frame(along: number): void {
    const L = this.course.length;
    const { part: size, ahead: reach, behind: back, near } = this.reach;
    for (const part of this.parts) {
      const ahead = lapAlong(part.from + size / 2 - along, L);
      const behind = ahead > L - back - size / 2;
      const shown = ahead < reach + size / 2 || behind;
      const close = ahead < near || behind;
      part.always.visible = shown;
      part.near.visible = shown && close;
      part.far.visible = shown && !close;
    }
  }

  /** Makes way round a place: no copy of a kind for which `moves` says so stands within `r` metres of it. */
  clearAround(
    x: number,
    z: number,
    r: number,
    moves: (kind: THREE.BufferGeometry) => boolean,
  ): void {
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    for (const part of this.parts)
      for (const group of [part.near, part.far, part.always])
        for (const child of group.children) {
          const mesh = child as THREE.InstancedMesh;
          if (!moves(mesh.geometry)) continue;
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

  dispose(): void {
    for (const part of this.parts)
      for (const group of [part.near, part.far, part.always])
        for (const child of group.children) (child as THREE.InstancedMesh).dispose();
  }
}

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
  mesh.userData.shadowless = shadowless;
  return mesh;
}

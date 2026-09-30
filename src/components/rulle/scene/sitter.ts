import * as THREE from "three";
import type { PauseStage } from "@/modules/rulle";
import { PALETTE as P } from "./palette";
import { ball, box, Limb, merged, rod, v } from "./shapes";
import { zSprite } from "./text-plates";

/**
 * The rider at the table, in the pause (ADR 0034): sat on a chair whose
 * seat is 0.46 m up, facing -z across the table, in the jersey and a
 * cycling cap. A sip now and then; after three minutes the paper; after
 * ten, asleep over the table, the z's rising and a cat keeping watch.
 */

const SHOULDERS = [v(-0.17, 0.96, 0.03), v(0.17, 0.96, 0.03)];
const REST = [v(-0.12, 0.77, -0.36), v(0.14, 0.77, -0.38)];
const MOUTH = v(0.04, 1.12, -0.13);
const READING = [v(-0.2, 0.98, -0.3), v(0.2, 0.98, -0.3)];

export type Drink = "cup" | "bottle";

export function drinkShape(drink: Drink, full: boolean): THREE.BufferGeometry {
  if (drink === "cup")
    return merged([
      box(0.08, 0.08, 0.08, P.metal, 0, 0.04, 0),
      box(0.07, 0.01, 0.07, full ? P.coffee : P.metal, 0, 0.081, 0),
      box(0.03, 0.04, 0.012, P.metal, 0.05, 0.045, 0),
    ]);
  return merged([
    box(0.07, 0.16, 0.07, P.bottle, 0, 0.08, 0),
    box(0.035, 0.07, 0.035, P.bottle, 0, 0.19, 0),
    box(0.04, 0.02, 0.04, P.stripe, 0, 0.235, 0),
  ]);
}

export class Sitter {
  readonly group = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly arms: { upper: Limb; lower: Limb }[];
  private readonly held: THREE.Mesh;
  private readonly paper: THREE.Mesh;
  private readonly cat = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly zs: THREE.Sprite[];
  private readonly materials: THREE.Material[];
  private stage: PauseStage = "cafe";
  private t = 0;

  constructor(material: THREE.Material, drink: Drink) {
    const still = merged([
      rod(v(-0.1, 0.5, 0.05), v(-0.11, 0.52, -0.36), 0.075, P.shorts),
      rod(v(0.1, 0.5, 0.05), v(0.11, 0.52, -0.36), 0.075, P.shorts),
      rod(v(-0.11, 0.52, -0.36), v(-0.11, 0.06, -0.4), 0.055, P.skin),
      rod(v(0.11, 0.52, -0.36), v(0.11, 0.06, -0.4), 0.055, P.skin),
      box(0.1, 0.06, 0.2, P.dark, -0.11, 0.03, -0.44),
      box(0.1, 0.06, 0.2, P.dark, 0.11, 0.03, -0.44),
      rod(v(0, 0.48, 0.06), v(0, 1.0, 0.02), 0.17, P.jersey, 6),
    ]);
    this.group.add(new THREE.Mesh(still, material));
    this.head.position.set(0, 1.04, 0.02);
    this.head.add(
      new THREE.Mesh(
        merged([
          ball(0.12, P.skin, 0, 0.14, -0.02),
          ball(0.125, P.cap, 0, 0.19, -0.01, [1, 0.62, 1]),
          box(0.17, 0.02, 0.11, P.cap, 0, 0.17, -0.15),
        ]),
        material,
      ),
    );
    this.group.add(this.head);
    const sleeve = new THREE.MeshLambertMaterial({ color: P.jerseyLight, flatShading: true });
    const skin = new THREE.MeshLambertMaterial({ color: P.skin, flatShading: true });
    this.materials = [sleeve, skin];
    this.arms = SHOULDERS.map(() => ({
      upper: new Limb(0.045, sleeve),
      lower: new Limb(0.04, skin),
    }));
    for (const arm of this.arms) this.group.add(arm.upper.mesh, arm.lower.mesh);
    this.held = new THREE.Mesh(drinkShape(drink, true), material);
    this.paper = new THREE.Mesh(box(0.5, 0.34, 0.01, P.paper), material);
    this.paper.position.set(0, 1.0, -0.33);
    this.paper.rotation.x = -0.25;
    this.group.add(this.held, this.paper);
    // The cat, on the table beside the cups.
    this.cat.add(
      new THREE.Mesh(
        merged([
          ball(0.1, P.cat, 0, 0.1, 0, [0.8, 1, 1.25]),
          ball(0.07, P.cat, 0, 0.23, -0.09),
          box(0.03, 0.05, 0.02, P.cat, -0.04, 0.3, -0.09),
          box(0.03, 0.05, 0.02, P.cat, 0.04, 0.3, -0.09),
        ]),
        material,
      ),
    );
    this.tail.position.set(0, 0.04, 0.1);
    this.tail.add(new THREE.Mesh(rod(v(0, 0, 0), v(0.06, 0.02, 0.22), 0.018, P.cat), material));
    this.cat.add(this.tail);
    this.cat.position.set(-0.28, 0.74, -0.48);
    this.cat.rotation.y = Math.PI * 0.8;
    this.group.add(this.cat);
    this.zs = [0, 1, 2].map(() => zSprite());
    this.group.add(...this.zs);
    this.set("cafe");
  }

  set(stage: PauseStage): void {
    this.stage = stage;
    this.paper.visible = stage === "second";
    this.cat.visible = stage === "asleep";
    for (const z of this.zs) z.visible = stage === "asleep";
    this.held.visible = stage !== "asleep";
    this.head.rotation.x = stage === "asleep" ? -0.6 : 0;
  }

  animate(seconds: number): void {
    this.t += seconds;
    const t = this.t;
    // A sip every six seconds, two seconds at the mouth; reading, now and then.
    const sip = Math.max(0, Math.sin(((t % 6) / 6) * Math.PI * 2 - 1.2));
    const hands =
      this.stage === "asleep"
        ? [v(-0.08, 0.8, -0.3), v(0.08, 0.8, -0.3)]
        : this.stage === "second" && t % 9 < 6
          ? READING
          : [REST[0]!, REST[1]!.clone().lerp(MOUTH, Math.min(1, sip * 1.6))];
    this.arms.forEach((arm, i) => {
      const shoulder = SHOULDERS[i]!;
      const hand = hands[i]!;
      const elbow = shoulder
        .clone()
        .lerp(hand, 0.5)
        .add(v(i === 0 ? -0.08 : 0.08, -0.14, 0.06));
      arm.upper.between(shoulder, elbow);
      arm.lower.between(elbow, hand);
    });
    this.held.position.copy(hands[1]!).add(v(0.02, -0.03, 0));
    this.tail.rotation.y = Math.sin(t * 2.2) * 0.6;
    this.zs.forEach((z, i) => {
      const phase = (t * 0.45 + i / 3) % 1;
      z.position.set(0.05 + phase * 0.25, 1.35 + phase * 0.5, -0.1);
      (z.material as THREE.SpriteMaterial).opacity = Math.sin(phase * Math.PI);
    });
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && !(child.geometry instanceof THREE.CylinderGeometry))
        child.geometry.dispose();
      if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).map?.dispose();
        child.material.dispose();
      }
    });
    for (const m of this.materials) m.dispose();
  }
}

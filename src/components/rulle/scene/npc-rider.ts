import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { painted } from "./props";
import { ball, box, jointed, knee, Limb, merged, rod, v } from "./shapes";

/**
 * The other riders on the road (ADR 0035), and someone mending a puncture.
 * A rider is one merged shape — the bike and the body in a kit of its own
 * — a right arm that can be raised in greeting, and legs that pedal: two
 * meshes and four limbs, so a group costs little. Facing -z, like the
 * rider (`RiderFigure`), and a little simpler.
 */

/** Kits, jersey and sleeves, and helmets: muted like the landscape, none the rider's own moss. */
export const KITS: readonly [string, string][] = [
  ["#34506e", "#e4e8ec"],
  ["#b0463c", "#f1ece3"],
  ["#d6a84a", "#2e2c29"],
  ["#2e2c29", "#8a979f"],
  ["#3f7a78", "#e8efec"],
  ["#c7773e", "#2e2c29"],
  ["#ece8df", "#34506e"],
];
const HELMETS = ["#f3f0ea", "#2e2c29", "#b0463c", "#34506e"];

const WHEEL = 0.34;
const BB = v(0, 0.3, 0.05);

/** The bike: wheels, frame, saddle and bars. */
function bike(): THREE.BufferGeometry[] {
  const wheel = (z: number) =>
    painted(
      new THREE.TorusGeometry(WHEEL, 0.03, 4, 14).rotateY(Math.PI / 2).translate(0, WHEEL, z),
      P.tyre,
    );
  return [
    wheel(0.52),
    wheel(-0.5),
    rod(v(0, WHEEL, 0.52), BB, 0.022, P.frame),
    rod(BB, v(0, 0.86, 0.2), 0.022, P.frame),
    rod(v(0, WHEEL, 0.52), v(0, 0.86, 0.2), 0.02, P.frame),
    rod(v(0, 0.86, 0.2), v(0, 0.84, -0.4), 0.022, P.frame),
    rod(BB, v(0, 0.84, -0.4), 0.024, P.frame),
    rod(v(0, 0.84, -0.4), v(0, WHEEL, -0.5), 0.02, P.frame),
    rod(v(-0.21, 0.95, -0.47), v(0.21, 0.95, -0.47), 0.02, P.frame),
    box(0.12, 0.04, 0.26, P.dark, 0, 0.9, 0.2),
  ];
}

export class NpcRider {
  readonly group = new THREE.Group();
  private readonly legs: { thigh: Limb; shin: Limb; side: number }[] = [];
  private readonly arm: THREE.Group;
  private readonly shape: THREE.BufferGeometry;
  private crank: number;
  private raised = 0;

  constructor(
    material: THREE.Material,
    kit: number,
    seed: number,
    leg: THREE.Material,
    shorts: THREE.Material,
  ) {
    const [jersey, sleeve] = KITS[kit % KITS.length]!;
    const helmet = HELMETS[seed % HELMETS.length]!;
    this.shape = merged([
      ...bike(),
      rod(v(0, 0.98, 0.19), v(0, 1.36, -0.27), 0.17, jersey, 6),
      rod(v(0, 0.99, 0.2), v(0, 1.05, 0.12), 0.18, P.shorts, 6),
      ball(0.12, P.skin, 0, 1.49, -0.38),
      ball(0.135, helmet, 0, 1.53, -0.37, [1, 0.72, 1.15]),
      rod(v(-0.16, 1.34, -0.25), v(-0.19, 1.14, -0.4), 0.045, sleeve),
      rod(v(-0.19, 1.14, -0.4), v(-0.2, 0.97, -0.47), 0.04, P.skin),
    ]);
    this.group.add(new THREE.Mesh(this.shape, material));
    const shoulder = v(0.16, 1.34, -0.25);
    this.arm = jointed(
      merged([
        rod(shoulder, v(0.19, 1.14, -0.4), 0.045, sleeve),
        rod(v(0.19, 1.14, -0.4), v(0.2, 0.97, -0.47), 0.04, P.skin),
      ]),
      material,
      shoulder,
    );
    this.group.add(this.arm);
    for (const side of [-1, 1]) {
      // Bib shorts down to the knee, bare shins below them.
      const thigh = new Limb(0.07, shorts);
      const shin = new Limb(0.05, leg);
      this.group.add(thigh.mesh, shin.mesh);
      this.legs.push({ thigh, shin, side });
    }
    this.crank = (seed % 628) / 100;
    this.animate(0, 0, false);
  }

  /** On by `seconds` at `speed`; `greet` raises the right hand from the bar. */
  animate(seconds: number, speed: number, greet: boolean): void {
    this.crank += seconds * (speed > 0.5 ? speed * 0.95 : 0);
    this.raised += ((greet ? 1 : 0) - this.raised) * Math.min(1, seconds * 6);
    // Up and a little out, as a rider lifts a hand off the bar to say hello.
    this.arm.rotation.set(-this.raised * 1.9, 0, -this.raised * 0.5);
    for (const leg of this.legs) {
      const angle = this.crank + (leg.side > 0 ? 0 : Math.PI);
      const hip = v(leg.side * 0.1, 0.98, 0.17);
      const foot = v(leg.side * 0.11, BB.y - 0.17 * Math.sin(angle), BB.z - 0.17 * Math.cos(angle));
      const k = knee(hip, foot, 0.47, 0.46);
      leg.thigh.between(hip, k);
      leg.shin.between(k, foot);
    }
  }

  dispose(): void {
    this.shape.dispose();
  }
}

/**
 * Someone mending a puncture at the roadside: the bike upside down on its
 * saddle and bars, the front wheel off on the grass, and its rider down
 * on one knee with the tube in both hands. Facing -z; one merged shape.
 */
export function puncture(kit: number): THREE.BufferGeometry {
  const [jersey, sleeve] = KITS[kit % KITS.length]!;
  const upsideDown = merged(bike().slice(1))
    .rotateZ(Math.PI)
    .translate(0, 1.0, 0)
    .translate(-0.9, 0, 0.2);
  return merged([
    upsideDown,
    painted(
      new THREE.TorusGeometry(WHEEL, 0.03, 4, 14).rotateX(Math.PI / 2).translate(0.8, 0.04, 0.55),
      P.tyre,
    ),
    // Down on the right knee, facing the road.
    rod(v(0.1, 0.02, 0.15), v(0.1, 0.45, 0.02), 0.07, P.shorts),
    rod(v(0.1, 0.45, 0.02), v(0.1, 0.5, -0.3), 0.07, P.shorts),
    rod(v(-0.1, 0.02, -0.25), v(-0.1, 0.45, -0.25), 0.055, P.skin),
    rod(v(-0.1, 0.45, -0.25), v(-0.1, 0.5, 0.05), 0.07, P.shorts),
    rod(v(0, 0.5, 0.05), v(0, 1.0, -0.05), 0.17, jersey, 6),
    ball(0.12, P.skin, 0, 1.18, -0.08),
    ball(0.125, P.cap, 0, 1.23, -0.07, [1, 0.62, 1]),
    rod(v(-0.16, 0.95, -0.05), v(-0.12, 0.72, -0.35), 0.045, sleeve),
    rod(v(0.16, 0.95, -0.05), v(0.12, 0.72, -0.35), 0.045, sleeve),
    // The tube, a black ring held between the hands.
    painted(new THREE.TorusGeometry(0.22, 0.015, 3, 12).translate(0, 0.72, -0.42), P.tyre),
    rod(v(0.45, 0.02, -0.3), v(0.62, 0.02, -0.05), 0.02, P.dark, 4),
  ]);
}

import * as THREE from "three";
import { personOf, type Person } from "./folk-look";
import { PALETTE as P } from "./palette";
import { ball, box, jointed, knee, Limb, merged, rod, v, wheel } from "./shapes";

/**
 * What passes on the road (ADR 0034), low-poly like everything else: an
 * electric cargo bike with a child in the box, a car, and a youngster on
 * an electric scooter in a full-face helmet. Each faces -z, stands on
 * y = 0 and moves only the parts that move.
 */

export type Figure = {
  group: THREE.Group;
  /** Moves the moving parts on by `seconds`, at `speed` m/s. */
  animate(seconds: number, speed: number): void;
  dispose(): void;
};

const lambert = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });

/** A Christiania bike with a motor: the box in front, the child facing the parent, a rain jacket. */
export function cargoBike(material: THREE.Material, person: Person = personOf(0)): Figure {
  const group = new THREE.Group();
  const body = merged([
    box(0.86, 0.06, 0.8, P.cargoBox, 0, 0.36, -1.15),
    box(0.06, 0.42, 0.8, P.cargoBox, -0.4, 0.6, -1.15),
    box(0.06, 0.42, 0.8, P.cargoBox, 0.4, 0.6, -1.15),
    box(0.86, 0.42, 0.06, P.cargoBox, 0, 0.6, -1.55),
    box(0.86, 0.3, 0.06, P.cargoBox, 0, 0.54, -0.75),
    wheel(0.24, 0.07, P.tyre, -0.36, -1.1),
    wheel(0.24, 0.07, P.tyre, 0.36, -1.1),
    wheel(0.33, 0.05, P.tyre, 0, 0.55),
    rod(v(0, 0.42, -0.75), v(0, 0.95, 0.12), 0.035, P.frame),
    rod(v(0, 0.95, 0.12), v(0, 0.33, 0.55), 0.025, P.frame),
    rod(v(0, 0.4, -0.75), v(0, 0.33, 0.55), 0.03, P.frame),
    rod(v(0, 0.6, -0.76), v(0, 1.02, -0.62), 0.025, P.frame),
    rod(v(-0.3, 1.02, -0.62), v(0.3, 1.02, -0.62), 0.02, P.frame),
    box(0.16, 0.05, 0.26, P.dark, 0, 0.98, 0.12),
    // The motor's battery on the frame: why it goes 25 and not a bit more.
    box(0.12, 0.12, 0.34, P.dark, 0, 0.66, -0.36),
    // The parent, upright in a rain jacket.
    rod(v(0, 1.0, 0.1), v(0, 1.5, -0.06), 0.17, P.raincoat, 6),
    ball(0.11, person.skin, 0, 1.69, -0.09),
    ball(0.125, P.frame, 0, 1.73, -0.08, [1, 0.75, 1.1]),
    rod(v(-0.17, 1.44, -0.08), v(-0.29, 1.03, -0.6), 0.045, P.raincoat),
    rod(v(0.17, 1.44, -0.08), v(0.29, 1.03, -0.6), 0.045, P.raincoat),
    // The child on the bench at the front, facing back toward the parent.
    box(0.7, 0.05, 0.22, P.wood, 0, 0.62, -1.42),
    rod(v(0, 0.66, -1.4), v(0, 0.98, -1.35), 0.12, P.denim, 6),
    ball(0.09, person.skin, 0, 1.1, -1.33),
    ball(0.1, P.kidHelmet, 0, 1.15, -1.34, [1, 0.8, 1.1]),
  ]);
  group.add(new THREE.Mesh(body, material));
  const shoulder = v(0.1, 0.96, -1.33);
  const arm = jointed(rod(shoulder, v(0.26, 1.24, -1.24), 0.035, P.denim), material, shoulder);
  group.add(arm);
  const trousers = lambert(person.trousers);
  const legs = [0, 1].map(() => ({
    thigh: new Limb(0.065, trousers),
    shin: new Limb(0.05, trousers),
  }));
  for (const leg of legs) group.add(leg.thigh.mesh, leg.shin.mesh);
  let crank = 0;
  let wave = 0;
  const animate = (seconds: number, speed: number) => {
    // A motor does much of the work: an easy, steady cadence.
    crank += seconds * (speed > 0.5 ? 6.5 : 0);
    wave += seconds;
    legs.forEach((leg, i) => {
      const angle = crank + i * Math.PI;
      const side = i === 0 ? -1 : 1;
      const hip = v(side * 0.1, 1.0, 0.1);
      const foot = v(side * 0.12, 0.42 - 0.16 * Math.sin(angle), -0.02 - 0.16 * Math.cos(angle));
      const k = knee(hip, foot, 0.46, 0.46);
      leg.thigh.between(hip, k);
      leg.shin.between(k, foot);
    });
    arm.rotation.z = -0.5 + Math.sin(wave * 9) * 0.45;
  };
  animate(0, 0);
  return {
    group,
    animate,
    dispose: () => {
      body.dispose();
      trousers.dispose();
    },
  };
}

/** A small estate car, washer nozzles at the foot of the windscreen. */
export function car(material: THREE.Material, color: string): Figure {
  const group = new THREE.Group();
  const pillar = (x: number, z: number) => box(0.08, 0.5, 0.1, color, x, 1.1, z);
  const body = merged([
    box(1.78, 0.62, 4.5, color, 0, 0.55, 0),
    box(1.6, 0.5, 2.7, P.glass, 0, 1.1, 0.35),
    box(1.64, 0.07, 2.64, color, 0, 1.38, 0.38),
    pillar(-0.79, 1.64),
    pillar(0.79, 1.64),
    pillar(-0.79, -0.95),
    pillar(0.79, -0.95),
    pillar(-0.79, 0.35),
    pillar(0.79, 0.35),
    box(1.8, 0.14, 0.12, P.dark, 0, 0.3, 2.25),
    box(1.8, 0.14, 0.12, P.dark, 0, 0.3, -2.25),
    box(0.32, 0.12, 0.05, P.rearLight, -0.64, 0.72, 2.26),
    box(0.32, 0.12, 0.05, P.rearLight, 0.64, 0.72, 2.26),
    box(0.32, 0.1, 0.05, P.headLight, -0.62, 0.66, -2.26),
    box(0.32, 0.1, 0.05, P.headLight, 0.62, 0.66, -2.26),
    box(0.14, 0.1, 0.1, color, -0.95, 1.0, -0.9),
    box(0.14, 0.1, 0.1, color, 0.95, 1.0, -0.9),
    wheel(0.33, 0.24, P.tyre, -0.8, -1.45),
    wheel(0.33, 0.24, P.tyre, 0.8, -1.45),
    wheel(0.33, 0.24, P.tyre, -0.8, 1.45),
    wheel(0.33, 0.24, P.tyre, 0.8, 1.45),
  ]);
  group.add(new THREE.Mesh(body, material));
  return { group, animate: () => undefined, dispose: () => body.dispose() };
}

/** Where on a car the washer fluid leaves the windscreen, in its own coordinates: its top edge. */
export const NOZZLES = [v(-0.45, 1.36, -0.98), v(0.45, 1.36, -0.98)];

/** An electric scooter, and on it a youngster in a hoodie and a full-face helmet, hunched and in a hurry. */
export function scooter(material: THREE.Material): Figure {
  const group = new THREE.Group();
  const rider = new THREE.Group();
  const body = merged([
    box(0.16, 0.05, 0.9, P.dark, 0, 0.13, 0),
    wheel(0.11, 0.06, P.tyre, 0, -0.45),
    wheel(0.11, 0.06, P.tyre, 0, 0.42),
    rod(v(0, 0.14, -0.45), v(0, 1.05, -0.52), 0.025, P.frame),
    rod(v(-0.26, 1.05, -0.52), v(0.26, 1.05, -0.52), 0.02, P.frame),
    rod(v(-0.06, 0.16, -0.15), v(-0.08, 0.92, 0.02), 0.07, P.trousers),
    rod(v(0.06, 0.16, 0.22), v(0.08, 0.92, 0.04), 0.07, P.trousers),
    rod(v(0, 0.9, 0.04), v(0, 1.42, -0.16), 0.19, P.hoodie, 6),
    rod(v(-0.18, 1.36, -0.14), v(-0.25, 1.06, -0.5), 0.05, P.hoodie),
    rod(v(0.18, 1.36, -0.14), v(0.25, 1.06, -0.5), 0.05, P.hoodie),
    ball(0.17, P.fullFace, 0, 1.62, -0.22, [1, 1.05, 1.1]),
    box(0.24, 0.08, 0.06, P.visor, 0, 1.62, -0.39),
    box(0.07, 0.02, 0.3, P.stripe, 0, 1.785, -0.22),
  ]);
  rider.add(new THREE.Mesh(body, material));
  group.add(rider);
  let t = 0;
  return {
    group,
    animate: (seconds) => {
      t += seconds;
      // Far too fast for the little wheels: a wobble.
      rider.rotation.z = Math.sin(t * 7) * 0.05 + Math.sin(t * 2.3) * 0.03;
    },
    dispose: () => body.dispose(),
  };
}

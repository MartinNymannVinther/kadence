import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { ball, box, jointed, merged, rod, v, wheel } from "./shapes";
import type { Figure } from "./vehicles";

/**
 * A race marshal's motorbike on race day (ADR 0037): a big white touring
 * bike with a top box and a blue light on it, a rider in a yellow vest,
 * and behind, a marshal in one too with a yellow flag, waved overhead
 * while the bike rides ahead of the rider. Faces -z, stands on y = 0.
 */

export type Moto = Figure & { waving: boolean };

/** How often the blue light flashes, a second. */
const FLASH = 2.4;

export function moto(material: THREE.Material): Moto {
  const group = new THREE.Group();
  const body = merged([
    wheel(0.32, 0.13, P.tyre, 0, -0.72),
    wheel(0.33, 0.16, P.tyre, 0, 0.74),
    box(0.52, 0.5, 0.75, P.motoBody, 0, 0.78, -0.5),
    box(0.46, 0.12, 0.3, P.glass, 0, 1.12, -0.68),
    box(0.42, 0.26, 0.55, P.motoBody, 0, 0.98, -0.05),
    box(0.4, 0.34, 0.6, P.dark, 0, 0.55, 0.05),
    box(0.4, 0.12, 0.85, P.dark, 0, 1.02, 0.42),
    box(0.5, 0.36, 0.42, P.motoBody, 0, 1.25, 0.9),
    box(0.3, 0.1, 0.08, P.rearLight, 0, 1.12, 1.12),
    rod(v(0, 0.4, -0.72), v(0, 0.95, -0.55), 0.03, P.metal),
    rod(v(-0.33, 1.1, -0.52), v(0.33, 1.1, -0.52), 0.02, P.dark),
    // The rider: yellow vest, white helmet, hands on the bars, feet on the pegs.
    box(0.42, 0.55, 0.28, P.vest, 0, 1.42, 0.02),
    box(0.43, 0.05, 0.29, P.metal, 0, 1.3, 0.02),
    ball(0.15, P.helmet, 0, 1.86, -0.08, [1, 1.05, 1.15]),
    box(0.24, 0.07, 0.05, P.visor, 0, 1.84, -0.24),
    rod(v(-0.2, 1.62, -0.05), v(-0.32, 1.12, -0.52), 0.05, P.vest),
    rod(v(0.2, 1.62, -0.05), v(0.32, 1.12, -0.52), 0.05, P.vest),
    rod(v(-0.14, 1.12, 0.1), v(-0.22, 0.72, -0.25), 0.07, P.trousers),
    rod(v(-0.22, 0.72, -0.25), v(-0.24, 0.5, 0.05), 0.06, P.trousers),
    rod(v(0.14, 1.12, 0.1), v(0.22, 0.72, -0.25), 0.07, P.trousers),
    rod(v(0.22, 0.72, -0.25), v(0.24, 0.5, 0.05), 0.06, P.trousers),
    // The marshal behind, a hand on the rider's hip.
    box(0.4, 0.55, 0.27, P.vest, 0, 1.5, 0.52),
    box(0.41, 0.05, 0.28, P.metal, 0, 1.38, 0.52),
    ball(0.145, P.helmet, 0, 1.92, 0.5, [1, 1.05, 1.15]),
    rod(v(-0.19, 1.7, 0.5), v(-0.2, 1.3, 0.2), 0.05, P.vest),
    rod(v(-0.14, 1.18, 0.6), v(-0.24, 0.75, 0.55), 0.07, P.trousers),
    rod(v(0.14, 1.18, 0.6), v(0.24, 0.75, 0.55), 0.07, P.trousers),
  ]);
  group.add(new THREE.Mesh(body, material));
  // The flag arm, from the marshal's right shoulder.
  const shoulder = v(0.19, 1.7, 0.5);
  const arm = jointed(
    merged([
      rod(shoulder, v(0.28, 2.15, 0.45), 0.05, P.vest),
      rod(v(0.28, 2.0, 0.45), v(0.28, 2.6, 0.45), 0.014, P.wood, 4),
      box(0.5, 0.36, 0.012, P.marshalFlag, 0.53, 2.42, 0.45),
    ]),
    material,
    shoulder,
  );
  group.add(arm);
  // The blue light, on the top box, flashing on and off.
  const light = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.12, 0.16).translate(0, 1.5, 0.9),
    new THREE.MeshBasicMaterial({ color: P.motoLight }),
  );
  group.add(light);
  let t = 0;
  const state: Moto = {
    group,
    waving: false,
    animate(seconds: number) {
      t += seconds;
      arm.rotation.z = state.waving ? Math.sin(t * 7) * 0.55 - 0.15 : -2.2;
      light.visible = Math.floor(t * FLASH * 2) % 2 === 0;
    },
    dispose() {
      body.dispose();
      light.geometry.dispose();
      (light.material as THREE.Material).dispose();
    },
  };
  state.animate(0, 0);
  return state;
}

import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { ball, box, jointed, merged, rod, v } from "./shapes";
import type { Figure } from "./vehicles";

/**
 * Who stands by the road (ADR 0034): a farm dog that sits by the verge
 * until a bike comes and then runs along for a bit; and on the chalk
 * climb, someone in red with a cowbell. Each faces -z and stands on y = 0.
 */

export type Dog = Figure & { running: boolean };

export function dog(material: THREE.Material): Dog {
  const group = new THREE.Group();
  // The body turns about the hind hips: level to run, raised to sit.
  const hips = v(0, 0.45, 0.25);
  const torso = new THREE.Group();
  torso.position.copy(hips);
  const body = merged([
    box(0.26, 0.28, 0.62, P.dog, 0, 0.52, 0),
    box(0.24, 0.26, 0.2, P.dog, 0, 0.6, -0.3),
    box(0.2, 0.2, 0.24, P.dog, 0, 0.76, -0.44),
    box(0.12, 0.1, 0.16, P.dog, 0, 0.7, -0.6),
    box(0.05, 0.04, 0.04, P.dark, 0, 0.74, -0.68),
    box(0.06, 0.12, 0.08, P.wood, -0.09, 0.84, -0.42),
    box(0.06, 0.12, 0.08, P.wood, 0.09, 0.84, -0.42),
  ]).translate(-hips.x, -hips.y, -hips.z);
  torso.add(new THREE.Mesh(body, material));
  const leg = (x: number, z: number) => {
    const top = v(x, 0.45, z);
    return jointed(rod(top, v(x, 0.02, z), 0.04, P.dog), material, top);
  };
  // Front legs hang from the body; hind legs from where the body turns.
  const front = [leg(-0.09, -0.22), leg(0.09, -0.22)];
  for (const f of front) {
    f.position.sub(hips);
    torso.add(f);
  }
  const hind = [leg(-0.09, 0.22), leg(0.09, 0.22)];
  const tailRoot = v(0, 0.6, 0.3);
  const tail = jointed(rod(tailRoot, v(0, 0.78, 0.55), 0.03, P.dog), material, tailRoot);
  tail.position.sub(hips);
  torso.add(tail);
  group.add(torso, ...hind);
  let t = 0;
  const state = {
    group,
    running: false,
    animate(seconds: number, speed: number) {
      t += seconds;
      tail.rotation.z = Math.sin(t * (state.running ? 16 : 9)) * 0.55;
      if (state.running) {
        const stride = t * Math.max(8, speed * 2.2);
        torso.rotation.x = 0;
        torso.position.y = hips.y + Math.abs(Math.sin(stride)) * 0.05;
        front.forEach((f, i) => (f.rotation.x = Math.sin(stride + i * 0.4) * 0.7));
        hind.forEach((h, i) => (h.rotation.x = -Math.sin(stride + i * 0.4) * 0.7));
      } else {
        // Sitting: haunches on the ground, the chest up on straight front legs, the hind legs folded.
        torso.rotation.x = 0.75;
        torso.position.y = hips.y - 0.31;
        front.forEach((f) => (f.rotation.x = -0.75));
        hind.forEach((h) => (h.rotation.x = 1.45));
      }
      for (const h of hind) h.position.y = torso.position.y;
    },
    dispose: () => body.dispose(),
  };
  state.animate(0, 0);
  return state;
}

export type Spectator = Figure & { ringing: boolean };

/** Someone in a red jacket with a cowbell, for the steep bit. */
export function spectator(material: THREE.Material): Spectator {
  const group = new THREE.Group();
  const body = merged([
    rod(v(-0.1, 0.02, 0), v(-0.1, 0.86, 0), 0.07, P.trousers),
    rod(v(0.1, 0.02, 0), v(0.1, 0.86, 0), 0.07, P.trousers),
    rod(v(0, 0.84, 0), v(0, 1.42, 0), 0.2, P.flagRed, 6),
    rod(v(-0.2, 1.38, 0), v(-0.26, 0.92, -0.02), 0.05, P.flagRed),
    ball(0.12, P.skin, 0, 1.6, 0),
    box(0.3, 0.07, 0.3, P.cowWhite, 0, 1.7, 0),
    box(0.2, 0.12, 0.2, P.flagRed, 0, 1.78, 0),
  ]);
  group.add(new THREE.Mesh(body, material));
  const shoulder = v(0.2, 1.38, 0);
  const arm = jointed(
    merged([
      rod(shoulder, v(0.3, 1.7, -0.2), 0.05, P.flagRed),
      box(0.12, 0.16, 0.12, P.brass, 0.31, 1.62, -0.23),
    ]),
    material,
    shoulder,
  );
  group.add(arm);
  let t = 0;
  const state = {
    group,
    ringing: false,
    animate(seconds: number) {
      t += seconds;
      arm.rotation.x = state.ringing ? Math.sin(t * 22) * 0.35 : 0.6;
    },
    dispose: () => body.dispose(),
  };
  state.animate(0);
  return state;
}

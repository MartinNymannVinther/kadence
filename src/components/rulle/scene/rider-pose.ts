import * as THREE from "three";
import type { Posture } from "@/modules/rulle";

/**
 * Where the rider's body is on the bike, for a blend of the three
 * postures (`postureAt`): in the saddle with the hands on the hoods; out
 * of the saddle, hips over the cranks, the bike rocking from side to side
 * under a rider who stays upright, once each pedal stroke; and tucked, a
 * flat back and the hands in the drops — and a fourth no road calls for,
 * the challenger's (ADR 0049): aero on the hoods, the upper arms straight
 * down, the forearms level along the bar and the head low, flat over the
 * low front of his bike (`Kit.low`). In the bike's own coordinates:
 * facing -z, y up, x to the rider's right. The legs and arms are hung
 * from these points by `twoBones`.
 */

/** The postures a figure rides in: the road's (`Posture`), and the challenger's aero one. */
export type FigurePosture = Posture | "aero";
export const POSTURES: readonly FigurePosture[] = ["seated", "standing", "tuck", "aero"];

export type Blend = Record<FigurePosture, number>;

type Anchor = {
  hips: THREE.Vector3;
  shoulders: THREE.Vector3;
  head: THREE.Vector3;
  /** The right hand; the left is its mirror. */
  hand: THREE.Vector3;
  /** Half the width between the hips, where the legs hang. */
  hipWidth: number;
  /** The helmet's tilt forward. */
  helmet: number;
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const ANCHORS: Record<FigurePosture, Anchor> = {
  seated: {
    hips: v(0, 0.98, 0.19),
    shoulders: v(0, 1.36, -0.27),
    head: v(0, 1.49, -0.38),
    hand: v(0.205, 0.975, -0.535),
    hipWidth: 0.1,
    helmet: -0.35,
  },
  standing: {
    hips: v(0, 1.09, 0.03),
    shoulders: v(0, 1.45, -0.42),
    head: v(0, 1.58, -0.53),
    hand: v(0.205, 0.985, -0.545),
    hipWidth: 0.1,
    helmet: -0.3,
  },
  tuck: {
    hips: v(0, 0.97, 0.24),
    shoulders: v(0, 1.16, -0.33),
    head: v(0, 1.26, -0.47),
    hand: v(0.21, 0.845, -0.5),
    hipWidth: 0.085,
    helmet: -0.85,
  },
  aero: {
    hips: v(0, 0.995, 0.12),
    shoulders: v(0, 1.235, -0.41),
    head: v(0, 1.3, -0.56),
    hand: v(0.2, 0.985, -0.54),
    hipWidth: 0.085,
    helmet: -0.25,
  },
};

export type Pose = {
  hips: THREE.Vector3;
  shoulders: THREE.Vector3;
  head: THREE.Vector3;
  hands: [THREE.Vector3, THREE.Vector3];
  hipWidth: number;
  helmet: number;
  /** The bike's lean, radians, positive to the left. */
  roll: number;
  /** How much of the aero posture is in it, 0 to 1: the elbows go down and back for it. */
  aero: number;
};

/** How far the bike rocks from side to side out of the saddle, radians. */
const ROCK = 0.16;
/** Out of the saddle, how far the hips drop and move over the pedal pushing down, metres. */
const DIP = 0.04;
const SHIFT = 0.035;
/** The bike's own axis, front to back, that it rocks about. */
const ALONG = new THREE.Vector3(0, 0, 1);
/** How much of the rock the rider stands against, staying upright over it. */
const UPRIGHT = 0.8;

/**
 * The pose for a blend at a turn of the cranks (0 with the right pedal at
 * the front, halfway down), pedalling at `cadence`, on a bike whose bars
 * sit `low` metres lower than the rider's own: the hands, the shoulders
 * and the head go down with them — the arms as they were, the back flatter.
 */
export function poseOf(blend: Blend, crank: number, cadence: number, low = 0): Pose {
  const mix = (pick: (a: Anchor) => THREE.Vector3) => {
    const out = new THREE.Vector3();
    for (const posture of POSTURES) out.addScaledVector(pick(ANCHORS[posture]), blend[posture]);
    return out;
  };
  const upper = (pick: (a: Anchor) => THREE.Vector3) => {
    const at = mix(pick);
    at.y -= low;
    return at;
  };
  const num = (pick: (a: Anchor) => number) =>
    POSTURES.reduce((s, p) => s + pick(ANCHORS[p]) * blend[p], 0);
  const pedalling = Math.min(1, cadence / 60);
  // Out of the saddle the bike leans away from the foot pushing down, and the
  // hips dip with each stroke; in it, only a little sway.
  const roll = blend.standing * ROCK * Math.cos(crank) * pedalling;
  const sway = -roll * UPRIGHT + Math.sin(crank) * 0.012 * pedalling * (1 - blend.standing);
  const hips = mix((a) => a.hips);
  hips.y -= blend.standing * DIP * Math.abs(Math.cos(crank)) * pedalling;
  // The weight goes onto the pedal pushing down: the right at a turn of nothing.
  hips.x += blend.standing * SHIFT * Math.cos(crank) * pedalling;
  const turn = (p: THREE.Vector3) => p.sub(hips).applyAxisAngle(ALONG, sway).add(hips);
  // The hands stay on the bar, whichever way the body goes.
  const hand = upper((a) => a.hand);
  return {
    hips,
    shoulders: turn(upper((a) => a.shoulders)),
    head: turn(upper((a) => a.head)),
    hands: [hand.clone().setX(-hand.x), hand],
    hipWidth: num((a) => a.hipWidth),
    helmet: num((a) => a.helmet),
    roll,
    aero: blend.aero,
  };
}

/**
 * Where the middle joint of a limb is — a knee, an elbow — for its root,
 * its end and its two bones, bent toward `pole`.
 */
export function twoBones(
  root: THREE.Vector3,
  end: THREE.Vector3,
  upper: number,
  lower: number,
  pole: THREE.Vector3,
): THREE.Vector3 {
  const along = new THREE.Vector3().subVectors(end, root);
  const d = Math.min(upper + lower - 1e-3, Math.max(1e-3, along.length()));
  along.normalize();
  const x = (upper * upper - lower * lower + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, upper * upper - x * x));
  const bend = pole.clone().addScaledVector(along, -pole.dot(along)).normalize();
  return root.clone().addScaledVector(along, x).addScaledVector(bend, h);
}

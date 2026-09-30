import type * as THREE from "three";
import { PALETTE as P } from "./palette";
import { box, merged, wheel } from "./shapes";

/**
 * What runs over the bridges over the road (ADR 0037), low-poly like
 * everything else and seen from the road below: a train's carriage, with
 * a driver's cab at its front or none; a car and a lorry on a motorway,
 * their bodies white so each is painted its own colour (`treeMaterial`).
 * Each faces -z and stands on y = 0: a carriage on its rails, a car on
 * the road.
 */

/** A carriage's length, metres, and how far apart its two bogies' middles are. */
export const CARRIAGE = 20;
export const BOGIES = 14;

/** White, painted each copy's own colour. */
const TINT = "#ffffff";

/** A carriage, white with a red band; with a cab, its front the driver's. */
export function carriage(cab: boolean): THREE.BufferGeometry {
  const body = P.train;
  const band = P.trainBand;
  const half = CARRIAGE / 2;
  // Without a cab the body runs end to end; with one it stops short of the nose.
  const long = cab ? CARRIAGE - 1.4 : CARRIAGE - 0.3;
  const z = cab ? 0.7 : 0;
  const parts = [
    box(2.9, 3.0, long, body, 0, 2.35, z),
    box(2.96, 0.8, long - 1.4, P.glass, 0, 2.75, z),
    box(2.98, 0.3, long - 0.1, band, 0, 1.45, z),
    box(2.6, 0.25, long - 0.6, P.bridgeShade, 0, 3.95, z),
    box(2.6, 0.35, CARRIAGE - 7, P.dark, 0, 0.72, 0),
    box(2.4, 0.75, 2.6, P.dark, 0, 0.5, -BOGIES / 2),
    box(2.4, 0.75, 2.6, P.dark, 0, 0.5, BOGIES / 2),
  ];
  if (cab)
    parts.push(
      // The nose, lower than the roof, the windscreen set back above it.
      box(2.8, 2.4, 1.3, body, 0, 2.05, -half + 0.65),
      box(2.84, 0.9, 1.34, band, 0, 1.35, -half + 0.65),
      box(2.6, 0.9, 0.9, P.glass, 0, 3.3, -half + 1.6),
      box(0.34, 0.16, 0.05, P.headLight, -0.95, 2.0, -half - 0.01),
      box(0.34, 0.16, 0.05, P.headLight, 0.95, 2.0, -half - 0.01),
    );
  return merged(parts);
}

/** A car on a motorway, seen from below the bridge: its body, its windows, its lights. */
export function motorwayCar(): THREE.BufferGeometry {
  return merged([
    box(1.8, 0.62, 4.5, TINT, 0, 0.55, 0),
    box(1.62, 0.5, 2.6, P.glass, 0, 1.1, 0.3),
    box(1.64, 0.07, 2.56, TINT, 0, 1.38, 0.32),
    box(1.82, 0.14, 0.12, P.dark, 0, 0.3, 2.25),
    box(1.82, 0.14, 0.12, P.dark, 0, 0.3, -2.25),
    box(0.32, 0.12, 0.05, P.rearLight, -0.64, 0.72, 2.26),
    box(0.32, 0.12, 0.05, P.rearLight, 0.64, 0.72, 2.26),
    box(0.32, 0.1, 0.05, P.headLight, -0.62, 0.66, -2.26),
    box(0.32, 0.1, 0.05, P.headLight, 0.62, 0.66, -2.26),
    wheel(0.33, 0.24, P.tyre, -0.8, -1.45),
    wheel(0.33, 0.24, P.tyre, 0.8, -1.45),
    wheel(0.33, 0.24, P.tyre, -0.8, 1.45),
    wheel(0.33, 0.24, P.tyre, 0.8, 1.45),
  ]);
}

/** A lorry: its cab painted, its box the haulier's grey. */
export function lorry(): THREE.BufferGeometry {
  return merged([
    box(2.5, 2.7, 2.3, TINT, 0, 1.95, -6.6),
    box(2.3, 0.9, 0.08, P.glass, 0, 2.6, -7.76),
    box(2.55, 2.9, 12.6, P.trailer, 0, 2.65, 1.3),
    box(2.3, 0.45, 14.8, P.dark, 0, 0.8, 0.2),
    box(0.3, 0.14, 0.05, P.headLight, -0.9, 1.1, -7.76),
    box(0.3, 0.14, 0.05, P.headLight, 0.9, 1.1, -7.76),
    ...[-6.1, 4.4, 5.8].flatMap((z) => [
      wheel(0.5, 0.4, P.tyre, -1.0, z),
      wheel(0.5, 0.4, P.tyre, 1.0, z),
    ]),
  ]);
}

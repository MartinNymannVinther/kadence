import * as THREE from "three";
import { MARK, type Person } from "./folk-look";
import { PALETTE as P } from "./palette";
import { ball, bar, box, jointed, merged, rod, v } from "./shapes";
import type { Figure } from "./vehicles";

/**
 * The people of race day (ADR 0036), low-poly like everyone else on the
 * road: the crowd, in a few poses, each copy in a jacket of its own (the
 * jacket is painted white and given its colour per copy, as a tree's crown
 * is, `treeMaterial`) and with a skin, hair, trousers, long hair or a cap
 * of its own (painted in markers, `folkMaterial`, ADR 0045); some with a
 * flag — Dannebrog in Copenhagen, and at the Worlds in Montréal Canada's,
 * Québec's and the visitors'; a marshal in a yellow vest with a yellow
 * flag; and a soigneur in the feed zone holding a musette out. Each faces
 * -z and stands on y = 0.
 */

/** Painted per copy: the jacket. */
const JACKET = "#ffffff";
/** White in a flag is not quite white, so it is not painted over. */
const WHITE = "#f4f1ea";

export type Pose = "down" | "up" | "clap";
export type FlagKind = "dk" | "ca" | "qc" | "be" | "nl" | "fr";

/** The flags waved on a city's course. */
export const FLAGS: Record<"kobenhavn" | "montreal", readonly FlagKind[]> = {
  kobenhavn: ["dk"],
  montreal: ["ca", "qc", "ca", "be", "dk", "nl", "fr"],
};

/** Someone in the crowd, but for the arms: every colour but the jacket's a marker (`folkMaterial`). */
function body(): THREE.BufferGeometry[] {
  return [
    box(0.13, 0.8, 0.16, MARK.trousers, -0.1, 0.4, 0),
    box(0.13, 0.8, 0.16, MARK.trousers, 0.1, 0.4, 0),
    box(0.44, 0.6, 0.26, JACKET, 0, 1.1, 0),
    ball(0.12, MARK.skin, 0, 1.55, 0),
    // Hair over the top and the back of the head; the face left free.
    box(0.25, 0.1, 0.25, MARK.hair, 0, 1.64, 0.03),
    // Long hair down the back, for some.
    box(0.23, 0.34, 0.08, MARK.long, 0, 1.43, 0.12),
    // A cap with its peak to the front, for a few.
    box(0.27, 0.07, 0.27, MARK.cap, 0, 1.69, 0.02),
    box(0.24, 0.02, 0.13, MARK.cap, 0, 1.66, -0.17),
  ];
}

const shoulder = (x: number) => v(x, 1.36, 0);

/** An arm of the crowd's, from the shoulder on side `x` to the hand. */
const arm = (x: number, hand: THREE.Vector3) => bar(shoulder(x), hand, 0.1, JACKET);

/** Someone watching, in a pose: arms down, both up, or clapping. */
export function spectatorShape(pose: Pose): THREE.BufferGeometry {
  const hands =
    pose === "down"
      ? [v(-0.28, 0.9, 0), v(0.28, 0.9, 0)]
      : pose === "up"
        ? [v(-0.45, 1.9, -0.05), v(0.45, 1.9, -0.05)]
        : [v(-0.05, 1.22, -0.3), v(0.05, 1.22, -0.3)];
  return merged([...body(), arm(-0.25, hands[0]!), arm(0.25, hands[1]!)]);
}

/** A flag's cloth, `w` by `h`, its near edge on a stick at x = 0, facing ±z. */
function cloth(kind: FlagKind, x: number, y: number, z: number): THREE.BufferGeometry[] {
  const w = 0.72;
  const h = 0.48;
  const t = 0.012;
  // A band of the cloth: from u0 to u1 across, v0 to v1 up, as parts of it.
  const band = (u0: number, u1: number, v0: number, v1: number, color: string, lift = 0) =>
    box(
      (u1 - u0) * w,
      (v1 - v0) * h,
      t + lift,
      color,
      x + ((u0 + u1) / 2) * w,
      y + ((v0 + v1) / 2) * h,
      z,
    );
  switch (kind) {
    case "dk":
      // Dannebrog: the cross's upright a third in from the stick (DS 2140: 12, 4, 21 across; 12, 4, 12 up).
      return [
        band(0, 1, 0, 1, P.flagRed),
        band(12 / 37, 16 / 37, 0, 1, WHITE, 0.006),
        band(0, 1, 12 / 28, 16 / 28, WHITE, 0.006),
      ];
    case "ca":
      return [
        band(0, 0.25, 0, 1, P.flagRed),
        band(0.25, 0.75, 0, 1, WHITE),
        band(0.75, 1, 0, 1, P.flagRed),
        // The leaf, as the eye reads it from the road: red in the middle.
        box(0.13, 0.13, t + 0.006, P.flagRed)
          .rotateZ(Math.PI / 4)
          .translate(x + 0.5 * w, y + 0.5 * h, z),
      ];
    case "qc":
      return [
        band(0, 1, 0, 1, "#2f5d9a"),
        band(0.44, 0.56, 0, 1, WHITE, 0.006),
        band(0, 1, 0.42, 0.58, WHITE, 0.006),
      ];
    case "be":
      return [
        band(0, 1 / 3, 0, 1, "#26231f"),
        band(1 / 3, 2 / 3, 0, 1, "#e2b93b"),
        band(2 / 3, 1, 0, 1, P.flagRed),
      ];
    case "nl":
      return [
        band(0, 1, 2 / 3, 1, "#b33a32"),
        band(0, 1, 1 / 3, 2 / 3, WHITE),
        band(0, 1, 0, 1 / 3, "#2d4a86"),
      ];
    case "fr":
      return [
        band(0, 1 / 3, 0, 1, "#2d4a86"),
        band(1 / 3, 2 / 3, 0, 1, WHITE),
        band(2 / 3, 1, 0, 1, P.flagRed),
      ];
  }
}

/** A flag's cloth on its own, its near edge at x = 0 and its foot at y = 0: for a flagpole. */
export function clothShape(kind: FlagKind): THREE.BufferGeometry {
  return merged(cloth(kind, 0, 0, 0));
}

/** A flag's colour from far off, where its cross or its bands are too small to see. */
const FLAG_FAR: Record<FlagKind, string> = {
  dk: P.flagRed,
  ca: P.flagRed,
  qc: "#2f5d9a",
  be: "#e2b93b",
  nl: "#b33a32",
  fr: "#2d4a86",
};

/**
 * Someone far off, as the eye has them there: legs, a jacket, a head —
 * and a flag's colour held high. A quarter of the triangles.
 */
export function farShape(flag: FlagKind | null): THREE.BufferGeometry {
  const parts = [
    box(0.34, 0.8, 0.16, MARK.trousers, 0, 0.4, 0),
    box(0.44, 0.6, 0.26, JACKET, 0, 1.1, 0),
    box(0.22, 0.26, 0.22, MARK.skin, 0, 1.54, 0),
  ];
  if (flag) parts.push(box(0.72, 0.48, 0.03, FLAG_FAR[flag], 0.69, 2.22, -0.06));
  return merged(parts);
}

/** Someone with a flag on a stick held high, the other arm down. */
export function flagShape(kind: FlagKind): THREE.BufferGeometry {
  const hand = v(0.32, 1.86, -0.06);
  return merged([
    ...body(),
    arm(-0.25, v(-0.28, 0.9, 0)),
    arm(0.25, hand),
    bar(v(0.32, 1.55, -0.06), v(0.32, 2.5, -0.06), 0.025, P.wood),
    ...cloth(kind, 0.33, 1.98, -0.06),
  ]);
}

export type Marshal = Figure & { waving: boolean };

/** A marshal in a yellow vest, a yellow flag in the right hand: waved overhead as a rider comes. */
export function marshal(material: THREE.Material, person: Person): Marshal {
  const group = new THREE.Group();
  const still = merged([
    box(0.13, 0.8, 0.16, person.trousers, -0.1, 0.4, 0),
    box(0.13, 0.8, 0.16, person.trousers, 0.1, 0.4, 0),
    box(0.44, 0.6, 0.26, P.vest, 0, 1.1, 0),
    // The vest's reflective bands.
    box(0.45, 0.05, 0.27, P.metal, 0, 0.95, 0),
    box(0.45, 0.05, 0.27, P.metal, 0, 1.2, 0),
    ball(0.12, person.skin, 0, 1.55, 0),
    box(0.24, 0.08, 0.24, P.vest, 0, 1.67, 0.01),
    box(0.24, 0.02, 0.12, P.vest, 0, 1.64, -0.16),
    rod(shoulder(-0.25), v(-0.28, 0.9, 0), 0.055, P.vest),
  ]);
  group.add(new THREE.Mesh(still, material));
  const at = shoulder(0.25);
  const arm = jointed(
    merged([
      rod(at, v(0.3, 1.9, -0.05), 0.055, P.vest),
      rod(v(0.3, 1.75, -0.05), v(0.3, 2.35, -0.05), 0.014, P.wood, 4),
      box(0.5, 0.36, 0.012, P.marshalFlag, 0.55, 2.16, -0.05),
    ]),
    material,
    at,
  );
  group.add(arm);
  let t = 0;
  const state: Marshal = {
    group,
    waving: false,
    animate(seconds: number) {
      t += seconds;
      // Waving: the arm swings overhead; else the flag is held low, at rest.
      arm.rotation.z = state.waving ? Math.sin(t * 7) * 0.55 - 0.1 : -2.3;
    },
    dispose: () => still.dispose(),
  };
  state.animate(0, 0);
  return state;
}

/** A soigneur at the roadside in a team's jacket, a musette held out at the end of an arm. */
export function soigneurShape(jacket: string, person: Person): THREE.BufferGeometry {
  const hand = v(0.26, 1.35, -0.62);
  return merged([
    box(0.13, 0.8, 0.16, person.trousers, -0.1, 0.4, 0),
    box(0.13, 0.8, 0.16, person.trousers, 0.1, 0.4, 0),
    box(0.44, 0.6, 0.26, jacket, 0, 1.1, 0),
    ball(0.12, person.skin, 0, 1.55, 0),
    box(0.25, 0.06, 0.25, person.hair, 0, 1.65, 0.04),
    box(0.24, 0.08, 0.24, jacket, 0, 1.67, 0.01),
    rod(shoulder(-0.25), v(-0.28, 0.9, 0), 0.055, jacket),
    rod(shoulder(0.25), hand, 0.055, jacket),
    // The musette: its strap from the hand, the bag hanging below.
    rod(hand, v(0.26, 1.05, -0.64), 0.01, P.paper, 3),
    box(0.26, 0.3, 0.07, P.paper, 0.26, 0.9, -0.64),
  ]);
}

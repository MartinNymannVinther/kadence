import * as THREE from "three";
import { OWN_BARS, RIDER_KIT, type Kit } from "./kits";
import { PALETTE as P } from "./palette";
import { painted } from "./props";
import { bar, box, merged, rod, v } from "./shapes";

/**
 * The rider's road bike, up close, a modern aero one: deep, narrow tubes
 * — a big down tube, a tall head tube, an aero seat post and fork, seat
 * stays dropped low on the seat tube — a one-piece cockpit with wing-flat
 * tops, the drops in white tape and the brake hoods, deep rims with a
 * light band and a few bladed spokes on thin tyres, disc brakes, and a
 * crankset whose arms and pedals turn under the feet. The parts that do
 * not move are one geometry in their own colours; each wheel is another,
 * turning on its hub, and the cranks another, turning about the bottom
 * bracket. Facing -z, y up, x to the rider's right, as `RiderFigure`.
 */

export const WHEEL = 0.34;
export const CRANK = 0.17;
/** The bottom bracket, where the cranks turn. */
export const BB = v(0, 0.3, 0.05);

const REAR = v(0, WHEEL, 0.52);
const FRONT = v(0, WHEEL, -0.5);
/** Where the top tube meets the seat tube, dropped low, and the seat post's top. */
const SEAT = v(0, 0.8, 0.175);
const POST = v(0, 0.918, 0.205);
const HEAD_TOP = v(0, 0.89, -0.365);
const HEAD_FOOT = v(0, 0.72, -0.415);
/** Where the stem meets the bar. */
const CLAMP = v(0, 0.94, -0.46);
/** On the seat tube, where the dropped seat stays meet it. */
const STAYS = v(0, 0.66, 0.14);

/** The drop bar's right half, from the flat top forward to the hood and round the drop. */
const BAR = [v(0.2, 0.94, -0.46), v(0.205, 0.95, -0.52)];
const DROP = [v(0.205, 0.95, -0.52), v(0.21, 0.915, -0.565), v(0.21, 0.87, -0.57)];
const DROP_END = [v(0.21, 0.87, -0.57), v(0.21, 0.84, -0.54), v(0.21, 0.83, -0.46)];

const UP = v(0, 1, 0);
const mirror = (p: THREE.Vector3) => v(-p.x, p.y, p.z);
const path = (points: THREE.Vector3[], r: number, color: string) =>
  points.slice(1).map((p, i) => rod(points[i]!, p, r, color, 6));

/**
 * An aero tube from `a` to `b`: `deep` half its section in the frame's
 * plane, along the way the air goes, and `narrow` half of it across.
 */
function aero(a: THREE.Vector3, b: THREE.Vector3, deep: number, narrow: number, color: string) {
  const along = new THREE.Vector3().subVectors(b, a);
  const geometry = new THREE.CylinderGeometry(1, 1, Math.max(1e-3, along.length()), 10);
  geometry.scale(narrow, 1, deep);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, along.normalize()));
  const middle = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return painted(geometry.translate(middle.x, middle.y, middle.z), color);
}

/** Of lower bars (`Kit.bars`), the most the head tube is shorter; the stem angles down for the rest. */
const SHORTER_HEAD = 0.09;

function frame(kit: Kit): THREE.BufferGeometry[] {
  const along = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);
  const { low, reach } = kit.bars ?? OWN_BARS;
  const head = Math.min(low, SHORTER_HEAD);
  const down = (p: THREE.Vector3, by: number) => v(p.x, p.y - by, p.z);
  const parts = [
    aero(BB, SEAT, 0.03, 0.016, kit.frame),
    aero(SEAT, down(HEAD_TOP, head), 0.024, 0.014, kit.frame),
    aero(BB, HEAD_FOOT, 0.038, 0.019, kit.frame),
    // The maker's band on the down tube.
    aero(along(BB, HEAD_FOOT, 0.55), along(BB, HEAD_FOOT, 0.78), 0.039, 0.0195, kit.accent),
    aero(v(0, 0.91 - head, -0.36), HEAD_FOOT, 0.034, 0.02, kit.fork),
    aero(SEAT, POST, 0.026, 0.011, kit.frame),
    // The one-piece cockpit's stem; the rest of it is `cockpit`.
    aero(v(0, 0.91 - head, -0.365), down(CLAMP, low).setZ(CLAMP.z - reach), 0.02, 0.018, kit.frame),
    ...cockpit(kit).map((part) => part.translate(0, -low, -reach)),
    box(0.07, 0.035, 0.05, kit.fork, 0, 0.72, -0.415),
    // A short saddle: a narrow nose, a wide back.
    box(0.06, 0.026, 0.15, P.saddle, 0, 0.934, 0.14),
    box(0.14, 0.03, 0.1, P.saddle, 0, 0.937, 0.255),
    // The bottle in its cage on the down tube.
    rod(v(0, 0.53, -0.12), v(0, 0.67, -0.27), 0.033, P.bidon, 8),
    // The chainring, the cassette and the chain between them.
    disc(0.1, 0.008, P.alloy, BB, 0.065),
    disc(0.045, 0.03, P.alloy, REAR, 0.055),
    rod(v(0.065, BB.y + 0.1, BB.z), v(0.055, WHEEL + 0.045, REAR.z), 0.005, P.dark, 4),
    rod(v(0.065, BB.y - 0.1, BB.z), v(0.06, WHEEL - 0.09, 0.49), 0.005, P.dark, 4),
    box(0.02, 0.07, 0.03, P.dark, 0.07, WHEEL - 0.06, 0.5),
    // The disc brakes' calipers, on the left: on the chainstay, and behind the fork leg.
    box(0.022, 0.045, 0.065, P.dark, -0.065, WHEEL - 0.05, REAR.z - 0.05),
    box(0.022, 0.045, 0.065, P.dark, -0.065, WHEEL - 0.045, FRONT.z + 0.05),
  ];
  // A race number on the seat post, under the saddle, flat to either side.
  if (kit.plate) parts.push(box(0.005, 0.07, 0.1, P.paper, 0, 0.862, 0.25));
  for (const side of [-1, 1]) {
    const x = (p: THREE.Vector3) => (side > 0 ? p : mirror(p));
    parts.push(
      aero(v(side * 0.03, BB.y, BB.z), x(v(0.055, WHEEL, REAR.z)), 0.016, 0.01, kit.frame),
      aero(v(side * 0.022, STAYS.y, STAYS.z), x(v(0.055, WHEEL, REAR.z)), 0.014, 0.008, kit.frame),
      aero(
        v(side * 0.03, HEAD_FOOT.y, HEAD_FOOT.z),
        x(v(0.05, WHEEL, FRONT.z)),
        0.024,
        0.011,
        kit.fork,
      ),
    );
  }
  return parts;
}

/** The bar: the tops flat as a wing, the drops in their tape and the brake hoods, at the rider's own height. */
function cockpit(kit: Kit): THREE.BufferGeometry[] {
  const parts = [aero(v(-0.2, 0.94, -0.46), v(0.2, 0.94, -0.46), 0.03, 0.009, kit.frame)];
  for (const side of [-1, 1]) {
    const x = (p: THREE.Vector3) => (side > 0 ? p : mirror(p));
    parts.push(
      ...path(BAR.map(x), 0.013, kit.tape),
      ...path(DROP.map(x), 0.013, kit.tape),
      ...path(DROP_END.map(x), 0.013, kit.tape),
      // The brake hood, standing up and forward from where the bar turns down.
      rod(x(v(0.205, 0.95, -0.52)), x(v(0.205, 0.978, -0.555)), 0.018, P.dark, 6),
    );
  }
  return parts;
}

/** A disc on the axle (x), `r` round and `w` wide, centred on `at` and moved `x` across. */
function disc(r: number, w: number, color: string, at = v(0, 0, 0), x = 0) {
  const geometry = new THREE.CylinderGeometry(r, r, w, 20).rotateZ(Math.PI / 2);
  return painted(geometry.translate(x, at.y, at.z), color);
}

/** Spokes on a wheel, and the angle between two of them. */
const SPOKES = 12;
const SPOKE_GAP = (Math.PI * 2) / SPOKES;
/**
 * A wheel turning more than this share of the gap between two spokes in
 * one frame looks, to the eye, to turn slowly or backwards — the
 * wagon-wheel effect — so above it the spokes give way to a blur.
 */
const BLUR_FROM = 0.35;

/**
 * A wheel about its own hub: a thin tyre on a deep rim with a light band
 * on either face, the hub, and the brake's rotor; its spokes apart
 * (`spokes`), so they can give way to a blur at speed.
 */
function wheel(): THREE.BufferGeometry {
  const ring = (radius: number, tube: number, flat: number, color: string) =>
    painted(
      new THREE.TorusGeometry(radius, tube, 5, 36).rotateY(Math.PI / 2).scale(flat, 1, 1),
      color,
    );
  const band = (side: number) =>
    painted(
      new THREE.RingGeometry(0.284, 0.302, 36)
        .rotateY((side * Math.PI) / 2)
        .translate(side * 0.0146, 0, 0),
      P.rimBand,
    );
  return merged([
    ring(WHEEL - 0.013, 0.013, 1, P.tyre),
    ring(0.268, 0.05, 0.28, P.rim),
    band(1),
    band(-1),
    disc(0.02, 0.09, P.alloy),
    disc(0.08, 0.004, P.alloy, v(0, 0, 0), -0.045),
    disc(0.035, 0.006, P.dark, v(0, 0, 0), -0.045),
  ]);
}

/** The bladed spokes, hub to rim. */
function spokes(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < SPOKES; i++) {
    const a = i * SPOKE_GAP;
    const hub = v(i % 2 ? 0.025 : -0.025, 0, 0);
    parts.push(bar(hub, v(0, Math.sin(a) * 0.222, Math.cos(a) * 0.222), 0.005, P.dark));
  }
  return merged(parts);
}

/** The cranks about the bottom bracket: the right arm forward at a turn of nothing, the left back. */
function cranks(): THREE.BufferGeometry {
  return merged([
    bar(v(0.085, 0, 0), v(0.09, 0, -CRANK), 0.02, P.alloy),
    bar(v(-0.085, 0, 0), v(-0.09, 0, CRANK), 0.02, P.alloy),
    box(0.07, 0.014, 0.06, P.dark, 0.12, 0, -CRANK),
    box(0.07, 0.014, 0.06, P.dark, -0.12, 0, CRANK),
    disc(0.018, 0.17, P.alloy),
  ]);
}

export class RoadBike {
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  private readonly wheels: THREE.Group[] = [];
  /** Each wheel's spokes, and the blur that stands for them at speed. */
  private readonly spokes: THREE.Mesh[] = [];
  private readonly blurs: THREE.Mesh[] = [];
  private readonly blur = new THREE.MeshBasicMaterial({
    color: P.dark,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly crankset: THREE.Group;
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(kit: Kit = RIDER_KIT) {
    this.group.add(this.mesh(merged(frame(kit))));
    for (const hub of [REAR, FRONT]) {
      const pivot = new THREE.Group();
      pivot.position.copy(hub);
      pivot.add(this.mesh(wheel()));
      const spoked = this.mesh(spokes());
      const blurred = new THREE.Mesh(new THREE.CircleGeometry(0.222, 32), this.blur);
      blurred.rotation.y = Math.PI / 2;
      blurred.visible = false;
      this.geometries.push(blurred.geometry);
      pivot.add(spoked);
      this.group.add(pivot, blurred);
      blurred.position.copy(hub);
      this.wheels.push(pivot);
      this.spokes.push(spoked);
      this.blurs.push(blurred);
    }
    this.crankset = new THREE.Group();
    this.crankset.position.copy(BB);
    this.crankset.add(this.mesh(cranks()));
    this.group.add(this.crankset);
  }

  /**
   * The wheels rolled on by `metres` since the last frame — their spokes a
   * blur when that turns them too far for the eye — and the cranks at
   * `crank` (0: the right pedal forward).
   */
  turn(metres: number, crank: number): void {
    const step = metres / WHEEL;
    const blurred = Math.abs(step) > SPOKE_GAP * BLUR_FROM;
    for (const wheel of this.wheels) wheel.rotation.x -= step;
    for (const spoked of this.spokes) spoked.visible = !blurred;
    for (const blur of this.blurs) blur.visible = blurred;
    this.crankset.rotation.x = -crank;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.material.dispose();
    this.blur.dispose();
  }

  private mesh(geometry: THREE.BufferGeometry): THREE.Mesh {
    this.geometries.push(geometry);
    return new THREE.Mesh(geometry, this.material);
  }
}

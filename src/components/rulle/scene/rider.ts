import * as THREE from "three";
import type { Posture } from "@/modules/rulle";
import { RIDER_KIT, type Kit } from "./kits";
import { kitMaterials, type KitMaterials } from "./rider-materials";
import { BB, CRANK, RoadBike } from "./road-bike";
import { riderHead } from "./rider-head";
import { poseOf, twoBones, type Blend } from "./rider-pose";

/**
 * The rider on the screen: a low-poly cyclist in Kadence's moss green on
 * a road bike (`RoadBike`), pedalling at the cadence the trainer measures
 * and rolling at the speed the physics gives. The legs follow the pedals,
 * and the arms the bar, by two-bone inverse kinematics, so they bend as
 * limbs do rather than swinging stiffly. A rider in a road kit: a jersey
 * broader at the shoulders with a band across it, bib shorts, a long
 * helmet with its vents, sunglasses, gloves, white socks and road shoes.
 * Local coordinates face -z, like a camera; y is up.
 *
 * The rider sits, stands on a steep climb with the bike rocking under
 * them, or tucks on a fast descent (`postureAt`), easing from one to the
 * next. In a pause (ADR 0034) the figure stops with a foot down and drinks
 * from the bottle now and then; at a café only the bike is left, parked,
 * while the rider sits at the table (`Sitter`).
 */

/** Riding; stopped with a foot down and the bottle; or gone to the table, the bike parked. */
export type Stop = "riding" | "bottle" | "parked";

const THIGH = 0.47;
const SHIN = 0.46;
const UPPER_ARM = 0.27;
const FOREARM = 0.22;
const UP = new THREE.Vector3(0, 1, 0);
/** Knees bend forward; elbows out, down and back. */
const KNEE_POLE = new THREE.Vector3(0, 0.3, -1);
const ELBOW_POLE = (side: number) => new THREE.Vector3(side * 0.7, -0.4, 0.6);
/** How quickly the rider eases from one posture to the next, per second. */
const EASE = 3;
/** The shoe's toe a little down on the pedal, radians. */
const TOE = -0.17;

/** A round shape, `top` as wide as its foot is 1, eight-sided: a tapered limb, a torso. */
const tapered = (top: number) => new THREE.CylinderGeometry(top, 1, 1, 8);

export class RiderFigure {
  readonly group = new THREE.Group();
  private readonly bike: RoadBike;
  private readonly legs: {
    thigh: THREE.Mesh;
    /** Bare from where the shorts end, above the knee, and the knee round. */
    knee: THREE.Mesh;
    cap: THREE.Mesh;
    shin: THREE.Mesh;
    sock: THREE.Mesh;
    shoe: THREE.Mesh;
    /** The shorts' leg ends, where the kit has them. */
    hems: THREE.Mesh[];
    side: number;
  }[] = [];
  private readonly arms: {
    upper: THREE.Mesh;
    lower: THREE.Mesh;
    glove: THREE.Mesh;
    /** Bands round the sleeve, where the kit has them. */
    stripes: THREE.Mesh[];
    side: number;
  }[] = [];
  private readonly body = new THREE.Group();
  private readonly torso: THREE.Mesh;
  private readonly band: THREE.Mesh;
  private readonly shorts: THREE.Mesh;
  private readonly neck: THREE.Mesh;
  /** The head, its helmet and its glasses, tilted together. */
  private readonly head = new THREE.Group();
  private readonly bottle: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private crank = 0;
  private cadence = 0;
  private blend: Blend = { seated: 1, standing: 0, tuck: 0 };
  /** The bike's lean from side to side out of the saddle, radians, to the left positive. */
  roll = 0;
  private stop: Stop = "riding";
  private stopped = 0;
  /** How far the right hand is on its way from the bar to the mouth, 0 to 1. */
  private lift = 0;
  private readonly materials: KitMaterials;
  private readonly unit = new THREE.CylinderGeometry(1, 1, 1, 8);
  private readonly shapes = {
    torso: tapered(1.25),
    thigh: tapered(0.72),
    shin: tapered(0.68),
    shoe: new THREE.BoxGeometry(0.075, 0.055, 0.25),
    glove: new THREE.IcosahedronGeometry(0.038, 0),
    pelvis: new THREE.IcosahedronGeometry(1, 1),
    knee: new THREE.IcosahedronGeometry(0.05, 0),
  };

  /** In the rider's own kit, or another's: the challenger's (ADR 0049). */
  constructor(kit: Kit = RIDER_KIT) {
    this.materials = kitMaterials(kit);
    this.bike = new RoadBike(kit);
    const m = this.materials;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), m.shadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.9, 1.9, 1);
    shadow.position.y = 0.02;
    this.group.add(shadow, this.bike.group);
    this.shadow = shadow;

    // The body, placed for its posture every frame (`pose`).
    this.torso = new THREE.Mesh(this.shapes.torso, m.jersey);
    this.band = new THREE.Mesh(this.unit, m.band);
    this.shorts = new THREE.Mesh(this.shapes.pelvis, m.shorts);
    this.neck = new THREE.Mesh(this.unit, m.skin);
    this.head.add(riderHead(m, kit.helmetStyle));
    this.body.add(this.torso, this.band, this.shorts, this.neck, this.head);
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(this.unit, m.light);
      const lower = new THREE.Mesh(this.unit, m.skin);
      const glove = new THREE.Mesh(this.shapes.glove, m.glove);
      const stripes = kit.sleeveStripe ? [0, 1].map(() => new THREE.Mesh(this.unit, m.stripe)) : [];
      this.body.add(upper, lower, glove, ...stripes);
      this.arms.push({ upper, lower, glove, stripes, side });
    }
    this.bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.2, 8), m.bidon);
    this.body.add(this.bottle);
    this.group.add(this.body);
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(this.shapes.thigh, m.shorts);
      const knee = new THREE.Mesh(this.unit, m.skin);
      const cap = new THREE.Mesh(this.shapes.knee, m.skin);
      const shin = new THREE.Mesh(this.shapes.shin, m.skin);
      const sock = new THREE.Mesh(this.unit, m.sock);
      const shoe = new THREE.Mesh(this.shapes.shoe, m.shoe);
      const hems = kit.hem ? [m.hemUpper, m.hemLower].map((c) => new THREE.Mesh(this.unit, c)) : [];
      this.group.add(thigh, knee, cap, shin, sock, shoe, ...hems);
      this.legs.push({ thigh, knee, cap, shin, sock, shoe, hems, side });
    }
    this.pose();
  }

  setStop(stop: Stop): void {
    if (stop === this.stop) return;
    this.stop = stop;
    this.stopped = 0;
    const away = stop === "parked";
    this.body.visible = !away;
    this.shadow.visible = !away;
    for (const leg of this.legs)
      for (const part of [leg.thigh, leg.knee, leg.cap, leg.shin, leg.sock, leg.shoe, ...leg.hems])
        part.visible = !away;
    this.pose();
  }

  /**
   * Moves the legs and wheels on by `seconds` at this cadence and speed,
   * easing toward `posture`; stopped, the rider sits.
   */
  animate(seconds: number, cadence: number, speed: number, posture: Posture = "seated"): void {
    this.crank = (this.crank + (cadence / 60) * 2 * Math.PI * seconds) % (2 * Math.PI);
    this.cadence = cadence;
    this.bike.turn(speed * seconds, this.crank);
    const aim = this.stop === "riding" ? posture : "seated";
    const k = Math.min(1, seconds * EASE);
    for (const p of ["seated", "standing", "tuck"] as const)
      this.blend[p] += ((p === aim ? 1 : 0) - this.blend[p]) * k;
    this.stopped += seconds;
    // Stopped: a drink every five seconds or so, the bottle at the mouth for a moment.
    const drinking = this.stop === "bottle" && this.stopped % 5 > 1.2 && this.stopped % 5 < 3.4;
    this.lift += ((drinking ? 1 : 0) - this.lift) * Math.min(1, seconds * 5);
    this.pose();
  }

  dispose(): void {
    const shared = new Set<THREE.BufferGeometry>([this.unit, ...Object.values(this.shapes)]);
    this.body.traverse((child) => {
      if (child instanceof THREE.Mesh && !shared.has(child.geometry)) child.geometry.dispose();
    });
    this.shadow.geometry.dispose();
    for (const geometry of shared) geometry.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
    this.bike.dispose();
  }

  private pose(): void {
    const pose = poseOf(this.blend, this.crank, this.cadence);
    this.roll = this.stop === "riding" ? pose.roll : 0;
    for (const leg of this.legs) {
      // Right pedal at the front at crank 0, going down: pedalling forward.
      const angle = this.crank + (leg.side > 0 ? 0 : Math.PI);
      const hip = pose.hips.clone().add(new THREE.Vector3(leg.side * pose.hipWidth, 0, -0.02));
      // Stopped, the left foot is down on the road beside the bike.
      const down = this.stop === "bottle" && leg.side < 0;
      const foot = down
        ? new THREE.Vector3(-0.34, 0.03, 0.12)
        : new THREE.Vector3(
            leg.side * 0.11,
            BB.y - CRANK * Math.sin(angle),
            BB.z - CRANK * Math.cos(angle),
          );
      const ankle = foot.clone().add(new THREE.Vector3(0, 0.05, 0.045));
      const knee = twoBones(hip, ankle, THIGH, SHIN, KNEE_POLE);
      this.place(leg.thigh, hip, hip.clone().lerp(knee, 0.84), 0.072);
      const thigh = (f: number) => hip.clone().lerp(knee, f);
      leg.hems.forEach((hem, i) =>
        this.place(hem, thigh(0.7 + i * 0.07), thigh(0.77 + i * 0.07), 0.06),
      );
      this.place(leg.knee, hip.clone().lerp(knee, 0.8), knee, 0.053);
      leg.cap.position.copy(knee);
      this.place(leg.shin, knee, ankle, 0.052);
      this.place(leg.sock, knee.clone().lerp(ankle, 0.8), ankle, 0.046);
      // The shoe on the pedal: the cleat under the ball of the foot, the heel behind.
      leg.shoe.position.copy(foot).add(new THREE.Vector3(0, 0.03, 0.055));
      leg.shoe.rotation.x = down ? 0 : TOE;
    }
    const along = new THREE.Vector3().subVectors(pose.shoulders, pose.hips).normalize();
    this.place(this.torso, pose.hips, pose.shoulders, 0.15, 0.115);
    const at = (f: number) => pose.hips.clone().lerp(pose.shoulders, f);
    // The band a hair wider than the jersey where it runs round it.
    this.place(this.band, at(0.5), at(0.6), 0.177, 0.136);
    // The pelvis in bib shorts, round over the saddle and over the jersey's hem.
    this.shorts.position.copy(pose.hips).addScaledVector(along, 0.03);
    this.shorts.quaternion.setFromUnitVectors(UP, along);
    this.shorts.scale.set(0.155, 0.12, 0.15);
    this.place(
      this.neck,
      at(0.95),
      pose.head.clone().add(new THREE.Vector3(0, -0.05, 0.03)),
      0.045,
    );
    // The head tips with the body only a little: the rider looks up the road.
    this.head.position.copy(pose.head);
    this.head.rotation.x = pose.helmet * 0.4;
    for (const arm of this.arms) {
      const lift = arm.side > 0 ? this.lift : 0;
      const shoulder = pose.shoulders.clone().add(new THREE.Vector3(arm.side * 0.16, -0.02, 0.02));
      // The right hand to the mouth with the bottle, when stopped.
      const mouth = pose.head.clone().add(new THREE.Vector3(0.07, -0.06, -0.04));
      const hand = pose.hands[arm.side > 0 ? 1 : 0]!.clone().lerp(mouth, lift);
      const elbow = twoBones(shoulder, hand, UPPER_ARM, FOREARM, ELBOW_POLE(arm.side));
      this.place(arm.upper, shoulder, elbow, 0.048);
      const sleeve = (f: number) => shoulder.clone().lerp(elbow, f);
      arm.stripes.forEach((band, i) =>
        this.place(band, sleeve(0.5 + i * 0.2), sleeve(0.58 + i * 0.2), 0.051),
      );
      this.place(arm.lower, elbow, hand, 0.038);
      arm.glove.position.copy(hand);
      if (arm.side > 0) {
        this.bottle.visible = this.stop === "bottle";
        this.bottle.position.copy(hand).add(new THREE.Vector3(0, 0.02, 0));
        this.bottle.rotation.set(-0.3 - lift * 1.6, 0, 0);
      }
    }
  }

  /** A shape from `a` to `b`, `radius` across and `depth` (if other) front to back. */
  private place(
    mesh: THREE.Mesh,
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    depth = radius,
  ): void {
    const along = new THREE.Vector3().subVectors(b, a);
    const length = along.length() || 1e-3;
    mesh.position.copy(a).addScaledVector(along, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, along.divideScalar(length));
    mesh.scale.set(radius, length, depth);
  }
}

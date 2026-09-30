import * as THREE from "three";
import type { Posture } from "@/modules/rulle";
import { PALETTE } from "./palette";
import { poseOf, twoBones, type Blend } from "./rider-pose";

/**
 * The rider on the screen: a low-poly cyclist in Kadence's moss green,
 * pedalling at the cadence the trainer measures and rolling at the speed
 * the physics gives. The legs follow the pedals, and the arms the bar, by
 * two-bone inverse kinematics, so they bend as limbs do rather than
 * swinging stiffly. Local coordinates face -z, like a camera; y is up.
 *
 * The rider sits, stands on a steep climb with the bike rocking under
 * them, or tucks on a fast descent (`postureAt`), easing from one to the
 * next. In a pause (ADR 0034) the figure stops with a foot down and drinks
 * from the bottle now and then; at a café only the bike is left, parked,
 * while the rider sits at the table (`Sitter`).
 */

/** Riding; stopped with a foot down and the bottle; or gone to the table, the bike parked. */
export type Stop = "riding" | "bottle" | "parked";

const WHEEL = 0.34;
const CRANK = 0.17;
const THIGH = 0.47;
const SHIN = 0.46;
const UPPER_ARM = 0.27;
const FOREARM = 0.22;
const BB = new THREE.Vector3(0, 0.3, 0.05);
const UP = new THREE.Vector3(0, 1, 0);
/** Knees bend forward; elbows out, down and back. */
const KNEE_POLE = new THREE.Vector3(0, 0.3, -1);
const ELBOW_POLE = (side: number) => new THREE.Vector3(side * 0.7, -0.4, 0.6);
/** How quickly the rider eases from one posture to the next, per second. */
const EASE = 3;

const lambert = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export class RiderFigure {
  readonly group = new THREE.Group();
  private readonly wheels: THREE.Mesh[] = [];
  private readonly legs: { thigh: THREE.Mesh; shin: THREE.Mesh; side: number }[] = [];
  private readonly arms: { upper: THREE.Mesh; lower: THREE.Mesh; side: number }[] = [];
  private readonly body = new THREE.Group();
  private readonly torso: THREE.Mesh;
  private readonly shorts: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly helmet: THREE.Mesh;
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
  private readonly materials = {
    jersey: lambert(PALETTE.jersey),
    light: lambert(PALETTE.jerseyLight),
    shorts: lambert(PALETTE.shorts),
    skin: lambert(PALETTE.skin),
    helmet: lambert(PALETTE.helmet),
    frame: lambert(PALETTE.frame),
    tyre: lambert(PALETTE.tyre),
    shadow: new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  };
  private readonly unit = new THREE.CylinderGeometry(1, 1, 1, 6);

  constructor() {
    const m = this.materials;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), m.shadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.9, 1.9, 1);
    shadow.position.y = 0.02;
    this.group.add(shadow);
    this.shadow = shadow;

    for (const z of [0.52, -0.5]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(WHEEL, 0.032, 4, 14), m.tyre);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, WHEEL, z);
      const pivot = new THREE.Group();
      pivot.position.copy(wheel.position);
      wheel.position.set(0, 0, 0);
      pivot.add(wheel);
      this.group.add(pivot);
      this.wheels.push(wheel);
    }
    const frame: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(0, WHEEL, 0.52), BB],
      [BB, new THREE.Vector3(0, 0.86, 0.2)],
      [new THREE.Vector3(0, WHEEL, 0.52), new THREE.Vector3(0, 0.86, 0.2)],
      [new THREE.Vector3(0, 0.86, 0.2), new THREE.Vector3(0, 0.84, -0.4)],
      [BB, new THREE.Vector3(0, 0.84, -0.4)],
      [new THREE.Vector3(0, 0.84, -0.4), new THREE.Vector3(0, WHEEL, -0.5)],
      [new THREE.Vector3(0, 0.84, -0.4), new THREE.Vector3(0, 0.95, -0.46)],
      [new THREE.Vector3(-0.21, 0.95, -0.47), new THREE.Vector3(0.21, 0.95, -0.47)],
    ];
    for (const [a, b] of frame) this.group.add(this.tube(a, b, 0.022, m.frame));

    // The body, placed for its posture every frame (`pose`).
    this.torso = new THREE.Mesh(this.unit, m.jersey);
    this.shorts = new THREE.Mesh(this.unit, m.shorts);
    this.head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), m.skin);
    this.helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      m.helmet,
    );
    this.body.add(this.torso, this.shorts, this.head, this.helmet);
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(this.unit, m.light);
      const lower = new THREE.Mesh(this.unit, m.skin);
      this.body.add(upper, lower);
      this.arms.push({ upper, lower, side });
    }
    this.bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), m.jersey);
    this.body.add(this.bottle);
    this.group.add(this.body);
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(this.unit, m.shorts);
      const shin = new THREE.Mesh(this.unit, m.skin);
      this.group.add(thigh, shin);
      this.legs.push({ thigh, shin, side });
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
    for (const leg of this.legs) leg.thigh.visible = leg.shin.visible = !away;
    this.pose();
  }

  /**
   * Moves the legs and wheels on by `seconds` at this cadence and speed,
   * easing toward `posture`; stopped, the rider sits.
   */
  animate(seconds: number, cadence: number, speed: number, posture: Posture = "seated"): void {
    this.crank = (this.crank + (cadence / 60) * 2 * Math.PI * seconds) % (2 * Math.PI);
    this.cadence = cadence;
    for (const wheel of this.wheels) wheel.rotation.x -= (speed / WHEEL) * seconds;
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
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry !== this.unit) child.geometry.dispose();
    });
    this.unit.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
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
      const knee = twoBones(hip, foot, THIGH, SHIN, KNEE_POLE);
      this.place(leg.thigh, hip, knee, 0.07);
      this.place(leg.shin, knee, foot, 0.05);
    }
    const along = new THREE.Vector3().subVectors(pose.shoulders, pose.hips).normalize();
    this.place(this.torso, pose.hips, pose.shoulders, 0.17);
    this.place(
      this.shorts,
      pose.hips.clone().add(new THREE.Vector3(0, 0.01, 0.01)),
      pose.hips.clone().addScaledVector(along, 0.1),
      0.18,
    );
    this.head.position.copy(pose.head);
    this.helmet.position.copy(pose.head).add(new THREE.Vector3(0, 0.02, 0.01));
    this.helmet.rotation.x = pose.helmet;
    for (const arm of this.arms) {
      const lift = arm.side > 0 ? this.lift : 0;
      const shoulder = pose.shoulders.clone().add(new THREE.Vector3(arm.side * 0.16, -0.02, 0.02));
      // The right hand to the mouth with the bottle, when stopped.
      const mouth = pose.head.clone().add(new THREE.Vector3(0.07, -0.06, -0.04));
      const hand = pose.hands[arm.side > 0 ? 1 : 0]!.clone().lerp(mouth, lift);
      const elbow = twoBones(shoulder, hand, UPPER_ARM, FOREARM, ELBOW_POLE(arm.side));
      this.place(arm.upper, shoulder, elbow, 0.045);
      this.place(arm.lower, elbow, hand, 0.04);
      if (arm.side > 0) {
        this.bottle.visible = this.stop === "bottle";
        this.bottle.position.copy(hand).add(new THREE.Vector3(0, 0.02, 0));
        this.bottle.rotation.set(-0.3 - lift * 1.6, 0, 0);
      }
    }
  }

  private tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(this.unit, material);
    this.place(mesh, a, b, radius);
    return mesh;
  }

  private place(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, radius: number): void {
    const along = new THREE.Vector3().subVectors(b, a);
    const length = along.length() || 1e-3;
    mesh.position.copy(a).addScaledVector(along, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, along.divideScalar(length));
    mesh.scale.set(radius, length, radius);
  }
}

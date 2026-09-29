import * as THREE from "three";
import { PALETTE } from "./palette";

/**
 * The rider on the screen: a low-poly cyclist in Kadence's moss green,
 * pedalling at the cadence the trainer measures and rolling at the speed
 * the physics gives. The legs follow the pedals by two-bone inverse
 * kinematics, so they bend as legs do rather than swinging stiffly. Local
 * coordinates face -z, like a camera; y is up.
 */

const WHEEL = 0.34;
const CRANK = 0.17;
const THIGH = 0.47;
const SHIN = 0.46;
const BB = new THREE.Vector3(0, 0.3, 0.05);
const UP = new THREE.Vector3(0, 1, 0);

const lambert = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export class RiderFigure {
  readonly group = new THREE.Group();
  private readonly wheels: THREE.Mesh[] = [];
  private readonly legs: { thigh: THREE.Mesh; shin: THREE.Mesh; side: number }[] = [];
  private readonly body = new THREE.Group();
  private crank = 0;
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

    // The body leans over the bars and rocks a little with the pedal stroke.
    const hips = new THREE.Vector3(0, 0.98, 0.19);
    const shoulders = new THREE.Vector3(0, 1.36, -0.27);
    this.body.add(this.tube(hips, shoulders, 0.17, m.jersey));
    this.body.add(
      this.tube(new THREE.Vector3(0, 0.99, 0.2), new THREE.Vector3(0, 1.05, 0.12), 0.18, m.shorts),
    );
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), m.skin);
    head.position.set(0, 1.49, -0.38);
    this.body.add(head);
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      m.helmet,
    );
    helmet.position.set(0, 1.51, -0.37);
    helmet.rotation.x = -0.35;
    this.body.add(helmet);
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Vector3(side * 0.16, 1.34, -0.25);
      const elbow = new THREE.Vector3(side * 0.19, 1.14, -0.4);
      const hand = new THREE.Vector3(side * 0.2, 0.97, -0.47);
      this.body.add(this.tube(shoulder, elbow, 0.045, m.light));
      this.body.add(this.tube(elbow, hand, 0.04, m.skin));
    }
    this.group.add(this.body);
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(this.unit, m.shorts);
      const shin = new THREE.Mesh(this.unit, m.skin);
      this.group.add(thigh, shin);
      this.legs.push({ thigh, shin, side });
    }
    this.pose();
  }

  /** Moves the legs and wheels on by `seconds` at this cadence and speed. */
  animate(seconds: number, cadence: number, speed: number): void {
    this.crank = (this.crank + (cadence / 60) * 2 * Math.PI * seconds) % (2 * Math.PI);
    for (const wheel of this.wheels) wheel.rotation.x -= (speed / WHEEL) * seconds;
    this.body.rotation.z = Math.sin(this.crank) * 0.012 * Math.min(1, cadence / 60);
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
    for (const leg of this.legs) {
      const angle = this.crank + (leg.side > 0 ? 0 : Math.PI);
      const hip = new THREE.Vector3(leg.side * 0.1, 0.98, 0.17);
      const foot = new THREE.Vector3(
        leg.side * 0.11,
        BB.y + CRANK * Math.sin(angle),
        BB.z - CRANK * Math.cos(angle),
      );
      const knee = kneeOf(hip, foot);
      this.place(leg.thigh, hip, knee, 0.07);
      this.place(leg.shin, knee, foot, 0.05);
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

/** Where the knee is, for a hip and a foot: the triangle of thigh and shin, bent forward. */
function kneeOf(hip: THREE.Vector3, foot: THREE.Vector3): THREE.Vector3 {
  const dy = foot.y - hip.y;
  const dz = foot.z - hip.z;
  const d = Math.min(THIGH + SHIN - 1e-3, Math.max(1e-3, Math.hypot(dy, dz)));
  const uy = dy / d;
  const uz = dz / d;
  const cos = (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d);
  const alpha = Math.acos(Math.min(1, Math.max(-1, cos)));
  // Perpendicular to hip-to-foot, on the forward (-z) side.
  const py = -uz;
  const pz = uy;
  const along = THIGH * Math.cos(alpha);
  const across = THIGH * Math.sin(alpha);
  const sign = pz < 0 ? 1 : -1;
  return new THREE.Vector3(
    (hip.x + foot.x) / 2,
    hip.y + uy * along + py * across * sign,
    hip.z + uz * along + pz * across * sign,
  );
}

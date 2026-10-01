import * as THREE from "three";

/**
 * Speed lines (ADR 0045): with the cheat code on and the bike going fast,
 * thin white streaks rush past the camera — the faster, the longer and the
 * brighter. Nowhere else: a real descent needs none.
 */

const COUNT = 70;
/** From what speed they show, m/s, and from what speed at their brightest. */
const FROM = 13;
const FULL = 30;
/** How far ahead of the camera a streak starts, metres. */
const AHEAD = 60;

/** A streak in the camera's own frame: across, up, and ahead (negative). */
type Streak = { x: number; y: number; z: number };

function spawn(ahead: number): Streak {
  // Never straight ahead, where the rider is: off to either side, or above.
  const side = Math.random() < 0.5 ? -1 : 1;
  return { x: side * (1.6 + Math.random() * 6), y: -2.6 + Math.random() * 5.5, z: -ahead };
}

export class SpeedLines {
  readonly group = new THREE.Group();
  private readonly positions = new Float32Array(COUNT * 6);
  private readonly streaks: Streak[] = [];
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material = new THREE.LineBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly lines: THREE.LineSegments;
  private readonly point = new THREE.Vector3();

  constructor() {
    for (let i = 0; i < COUNT; i++) this.streaks.push(spawn(Math.random() * AHEAD));
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    this.group.add(this.lines);
  }

  /** On by `seconds` at `speed`, round the camera; nothing below `FROM`. */
  frame(camera: THREE.Camera, speed: number, seconds: number): void {
    const strength = Math.max(0, Math.min(1, (speed - FROM) / (FULL - FROM)));
    this.lines.visible = strength > 0;
    if (!this.lines.visible) return;
    this.material.opacity = 0.5 * strength;
    camera.updateMatrixWorld();
    const long = 0.07 * speed;
    for (let i = 0; i < COUNT; i++) {
      let s = this.streaks[i]!;
      s.z += speed * seconds;
      if (s.z > 1) s = this.streaks[i] = spawn(AHEAD * (0.8 + Math.random() * 0.2));
      for (const [k, z] of [
        [0, s.z],
        [1, s.z - long],
      ] as const) {
        this.point.set(s.x, s.y, z).applyMatrix4(camera.matrixWorld);
        this.positions.set([this.point.x, this.point.y, this.point.z], i * 6 + k * 3);
      }
    }
    this.geometry.getAttribute("position").needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

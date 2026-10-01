import * as THREE from "three";

/**
 * The camera that follows the rider, and where the sense of speed comes
 * from besides the things by the road: it rides behind and above along
 * the road itself, so it turns with the bends rather than cutting them;
 * it looks a little down the road; its view widens a touch with speed and
 * leans a touch into a bend; and it bobs faintly with the pedals, and
 * shakes on cobbles (ADR 0036). For a rider who has asked for less motion
 * on the screen, only the following is left.
 *
 * In a pause at a café it looks at the table instead (`view`), and after
 * the dip to the haze it is simply there (`jump`) rather than flying.
 *
 * The screen's lower part is covered by the numbers and the bar, so the
 * picture is shifted up (a view offset): the road ahead and the rider sit
 * in the band between the strip at the top and the panel at the bottom.
 */

/** Vertical field of view, degrees: wider on a screen stood on end, or the road is a slot. */
const WIDE_FOV = 52;
const TALL_FOV = 68;
/** How much wider the view gets at speed, degrees, and from what speed (m/s). */
const FAST_WIDEN = 6;
const FAST = 14;
/** And wider still, faster than any rider rides — the cheat code's (ADR 0045) — up to this speed. */
const RUSH_WIDEN = 12;
const RUSH = 33;
const HEIGHT = 3.1;
const LOOK_HEIGHT = 0.3;

export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(WIDE_FOV, 1, 0.5, 3200);
  private readonly target = new THREE.Vector3();
  private baseFov = WIDE_FOV;
  private roll = 0;
  private placed = false;
  private clock = 0;

  constructor(private readonly calm: boolean) {}

  /** The screen, and how much of it the numbers on top and the bar below cover, in pixels. */
  layout(width: number, height: number, top: number, bottom: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.baseFov = this.camera.aspect >= 1 ? WIDE_FOV : TALL_FOV;
    this.camera.fov = this.baseFov;
    // The middle of the open band is where the camera looks.
    const band = (top + (height - bottom)) / 2;
    const shift = Math.max(-height * 0.3, Math.min(height * 0.3, height / 2 - band));
    this.camera.setViewOffset(width, height, 0, shift, width, height);
    this.camera.updateProjectionMatrix();
  }

  /** Starts the next frame where the camera should be, instead of gliding there. */
  jump(): void {
    this.placed = false;
  }

  /** Looks from `eye` at `look`, easing there: the table of a café, in a pause. */
  view(eye: THREE.Vector3, look: THREE.Vector3, seconds: number): void {
    if (!this.placed) {
      this.camera.position.copy(eye);
      this.target.copy(look);
      this.placed = true;
    }
    const ease = 1 - Math.exp(-seconds * 3);
    this.camera.position.lerp(eye, ease);
    this.target.lerp(look, ease);
    this.camera.lookAt(this.target);
    this.roll = 0;
    if (this.camera.fov !== this.baseFov) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * One frame: `behind` is the road a few metres back (where the camera
   * goes), `ahead` the road some way ahead (where it looks), `turn` how
   * much the road bends there (radians per metre, left positive);
   * `rumble` how much the road shakes (1 on cobbles).
   */
  follow(
    behind: THREE.Vector3,
    ahead: THREE.Vector3,
    turn: number,
    speed: number,
    crank: number,
    seconds: number,
    rumble = 0,
  ): void {
    this.clock += seconds;
    const eye = behind.clone().setY(behind.y + HEIGHT);
    const look = ahead.clone().setY(ahead.y + LOOK_HEIGHT);
    if (!this.placed) {
      this.camera.position.copy(eye);
      this.target.copy(look);
      this.placed = true;
    }
    // Keeping up with the bike: at a cheat's speeds, closer behind it than the easing would leave.
    const follow = 1 - Math.exp(-seconds * (5 + Math.max(0, speed - FAST) * 0.25));
    this.camera.position.lerp(eye, follow);
    this.target.lerp(look, 1 - Math.exp(-seconds * 7));
    if (!this.calm) this.camera.position.y += Math.sin(crank * 2) * 0.012;
    if (!this.calm && rumble > 0) {
      const t = this.clock * 2 * Math.PI;
      const hard = rumble * Math.min(1, speed / 6);
      this.camera.position.y += (Math.sin(t * 14.2) + Math.sin(t * 19.7)) * 0.018 * hard;
      this.camera.position.x += Math.sin(t * 16.4) * 0.012 * hard;
    }
    this.camera.lookAt(this.target);

    if (this.calm) return;
    const lean = Math.max(-0.045, Math.min(0.045, turn * speed * 0.9));
    this.roll += (lean - this.roll) * (1 - Math.exp(-seconds * 2.5));
    this.camera.rotateZ(this.roll);
    const rush = Math.max(0, Math.min(1, (speed - FAST) / (RUSH - FAST)));
    const fov = this.baseFov + FAST_WIDEN * Math.min(1, speed / FAST) + RUSH_WIDEN * rush;
    if (Math.abs(fov - this.camera.fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-seconds * 1.5));
      this.camera.updateProjectionMatrix();
    }
  }
}

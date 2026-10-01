import * as THREE from "three";
import {
  CITIES,
  courseAt,
  postureAt,
  sunToward,
  swayAt,
  type City,
  type Course,
  type Land,
  type Posture,
} from "@/modules/rulle";
import { Atmosphere } from "./atmosphere";
import { CameraRig } from "./camera-rig";
import { FinishLine } from "./finish-line";
import { Landscape } from "./landscape";
import { Listener } from "./listener";
import type { Pace } from "./pace";
import type { Pause } from "./pause-scene";
import { castShadows } from "./props";
import { raceDayIn, type RaceDayScene } from "./race-day";
import { rideRenderer } from "./renderer";
import { RiderFigure } from "./rider";
import { roadPoint, turnAt } from "./road-point";
import {
  NO_WORDS,
  QUIET_HOOKS,
  SmallThings,
  type SceneWords,
  type SmallThingsHooks,
} from "./small-things";

/**
 * The landscape of a ride (ADR 0033), put together: the ground — the real
 * land round a route that comes with Kadence (ADR 0035), or one made from
 * the route — the road, what stands by it and on the land, the sky, the
 * rider, the camera that follows, and the small things on the way (ADR
 * 0034). Given where the rider is along the course, how fast, at what
 * cadence and whether paused, it draws one frame. It knows nothing about
 * sessions or trainers.
 */

export type WorldOptions = {
  /** Less motion on the screen: the camera only follows. */
  calm: boolean;
  /** A small or slow device: fewer trees and tufts, no antialiasing or shadows, fewer pixels. */
  light: boolean;
  /** A race's course: its finish, with the arch, where the lap ends (ADR 0035). */
  finish?: boolean;
  /** The real land round the route, when it is one that comes with Kadence (ADR 0035). */
  land?: Land | null;
  /** A city's course (ADR 0036): streets, pavements and blocks, closed for the race and lined. */
  city?: City | null;
};

export type Moment = {
  distance: number;
  speed: number;
  cadence: number;
  /** The ride's pause, if it is paused: which one, and for how long. */
  pause: Pause | null;
};

/**
 * Metres behind the rider the camera rides, and ahead of the rider it
 * looks: close enough ahead that the rider sits low in the open band
 * between the numbers and the bar, with the horizon above.
 */
const BEHIND = 8.5;
const AHEAD = 9;

export class World {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig: CameraRig;
  private readonly land: Landscape;
  private readonly listener: Listener;
  private readonly rider = new RiderFigure();
  private readonly atmosphere: Atmosphere;
  private readonly small: SmallThings;
  private readonly finish: FinishLine | null;
  private readonly race: RaceDayScene | null;
  private readonly pace: Pace;
  private readonly calm: boolean;
  private crank = 0;
  private frames = 0;
  private posture: Posture = "seated";
  private readonly shaded: boolean;
  private laid = { width: 0, height: 0, top: 0, bottom: 0 };

  constructor(
    canvas: HTMLCanvasElement,
    private readonly course: Course,
    options: WorldOptions,
    words: SceneWords = NO_WORDS,
    hooks: SmallThingsHooks = QUIET_HOOKS,
  ) {
    ({
      renderer: this.renderer,
      pace: this.pace,
      shaded: this.shaded,
    } = rideRenderer(canvas, options.light));
    this.calm = options.calm;
    this.rig = new CameraRig(options.calm);
    const city = options.city ?? null;
    // On a city's race day the sun stands where it stood that day (ADR 0036).
    this.atmosphere = new Atmosphere(this.scene, city ? sunToward(CITIES[city].sun) : undefined);
    if (this.shaded) this.atmosphere.castShadows();
    this.land = new Landscape(
      course,
      { land: options.land ?? null, city, light: options.light, shaded: this.shaded },
      this.atmosphere.water,
    );
    const ground = this.land.ground;
    const room = (x: number, z: number, r: number) => {
      this.land.clearAround(x, z, r);
      // The crowd makes way between the road and a café, not only where it stands.
      this.race?.clearAround(x, z, r + 8);
    };
    this.small = new SmallThings(course, ground, words, hooks, {
      calm: options.calm,
      canvas,
      room,
    });
    // A city's course on race day: its crowd, its marshals, its cobbles (ADR 0036).
    this.race = raceDayIn(city, course, ground, this.small.material, words, hooks, room, options);
    this.land.layRoad((along) => this.race?.road.rumble(along) === 1, this.shaded);
    // What the rider would hear of the road, for the sound under the ride (ADR 0045).
    this.listener = new Listener(course, options.land ?? null, city !== null, hooks.hear);
    if (this.shaded) castShadows(this.rider.group);
    this.rider.group.rotation.order = "YXZ";
    this.scene.add(this.land.group, this.small.group, this.rider.group);
    this.finish = options.finish
      ? new FinishLine(
          course,
          ground,
          this.small.material,
          words.finish,
          {
            crossed: () => hooks.seen("finish", 1),
            ring: () => hooks.sound("cheer"),
          },
          // On race day the crowd lines the finish already.
          !this.race,
        )
      : null;
    if (this.finish) this.scene.add(this.finish.group);
    if (this.finish && this.shaded) castShadows(this.finish.group);
    if (this.race) this.scene.add(this.race.group);
    if (this.race && this.shaded) castShadows(this.race.group);
    // Only the rider, what passes, the sky and the camera move; the land is placed once.
    this.scene.matrixAutoUpdate = false;
  }

  resize(width: number, height: number, top: number, bottom: number): void {
    const was = this.laid;
    if (width === was.width && height === was.height && top === was.top && bottom === was.bottom)
      return;
    // Setting a canvas's size, even to the size it already has, throws its
    // drawing buffer away and has the GPU make a new one: frames lost each
    // time. Only a size that changed is set.
    if (width !== was.width || height !== was.height) this.renderer.setSize(width, height, false);
    this.rig.layout(width, height, top, bottom);
    this.laid = { width, height, top, bottom };
  }

  frame(moment: Moment, seconds: number): void {
    const ratio = this.pace.frame(seconds);
    if (ratio !== null) this.renderer.setPixelRatio(ratio);
    const { distance, speed, cadence } = moment;
    const pausing = this.small.frame(moment, seconds, this.rig.camera.position, this.rider);
    const bike = this.rider.group;
    if (pausing.parked) {
      // Against the café's wall while the rider sits at the table.
      bike.position.copy(pausing.parked.at);
      bike.rotation.set(0, pausing.parked.yaw, pausing.parked.lean);
    } else {
      const here = this.pointAt(distance, swayAt(distance));
      const back = this.pointAt(distance - 2, swayAt(distance - 2));
      const front = this.pointAt(distance + 2, swayAt(distance + 2));
      const along = new THREE.Vector3().subVectors(front, back);
      bike.position.copy(here);
      bike.rotation.set(
        Math.atan(courseAt(this.course, distance).grade),
        Math.atan2(-along.x, -along.z),
        0,
      );
    }
    this.crank += (cadence / 60) * 2 * Math.PI * seconds;
    // In the saddle, out of it on a steep climb, tucked on a fast descent.
    this.posture = postureAt(this.course, distance, speed, cadence, this.posture);
    this.rider.animate(seconds, cadence, speed, this.posture);
    // Out of the saddle the bike rocks under the rider; on cobbles it shakes.
    if (!pausing.parked) bike.rotation.z = this.rider.roll;
    const rumble =
      this.calm || pausing.parked ? 0 : (this.race?.road.jolt(bike, distance, speed, seconds) ?? 0);

    if (pausing.jump) this.rig.jump();
    if (pausing.view) this.rig.view(pausing.view.eye, pausing.view.look, seconds);
    else {
      const behind = this.pointAt(distance - BEHIND, 0.4);
      const ahead = this.pointAt(distance + AHEAD, swayAt(distance + AHEAD) * 0.5);
      const turn = turnAt(this.course, distance);
      this.rig.follow(behind, ahead, turn, speed, this.crank, seconds, rumble);
    }
    const eye = this.rig.camera.position;
    this.atmosphere.follow(eye, seconds);
    if (this.shaded) {
      this.atmosphere.light(bike.position);
      // What passes by comes and goes: whatever is new casts its shadow too.
      if (this.frames % 30 === 0) castShadows(this.small.group);
    }
    this.land.frame(eye, seconds);
    this.finish?.frame(distance, seconds);
    this.race?.frame(distance, seconds);
    this.listener.frame(distance, speed, seconds, (d) => this.race?.heard(d) ?? 0);
    this.frames++;
    this.renderer.render(this.scene, this.rig.camera);
  }

  dispose(): void {
    this.land.dispose();
    this.rider.dispose();
    this.small.dispose();
    this.finish?.dispose();
    this.race?.dispose();
    this.atmosphere.dispose();
    this.renderer.dispose();
  }

  /** A point on the road `offset` metres right of its middle, on the road's surface: over a bump, on it. */
  private pointAt(distance: number, offset: number): THREE.Vector3 {
    const point = roadPoint(this.course, distance, offset);
    if (this.race) point.y += this.race.road.lift(distance);
    return point;
  }
}

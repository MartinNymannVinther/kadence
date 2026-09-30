import * as THREE from "three";
import {
  courseAt,
  postureAt,
  raceDayOf,
  swayAt,
  type City,
  type Course,
  type Land,
  type Posture,
} from "@/modules/rulle";
import { Atmosphere } from "./atmosphere";
import { CameraRig } from "./camera-rig";
import { inPaddocks } from "./farmyard";
import { FinishLine } from "./finish-line";
import { Ground } from "./ground";
import { Pace } from "./pace";
import type { Pause } from "./pause-scene";
import { castShadows, freeze } from "./props";
import { RaceDayScene } from "./race-day";
import { RiderFigure } from "./rider";
import { buildRoad } from "./road";
import { roadPoint, turnAt } from "./road-point";
import { Roadside } from "./roadside";
import { Scenery } from "./scenery";
import {
  NO_WORDS,
  QUIET_HOOKS,
  SmallThings,
  type SceneWords,
  type SmallThingsHooks,
} from "./small-things";
import { Terrain } from "./terrain";

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
  private readonly ground: Ground;
  private readonly terrain: Terrain;
  private readonly scenery: Scenery;
  private readonly roadside: Roadside;
  private readonly road: THREE.Group;
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
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !options.light,
      powerPreference: "high-performance",
    });
    const ratio = Math.min(window.devicePixelRatio || 1, options.light ? 1 : 1.5);
    this.renderer.setPixelRatio(ratio);
    this.pace = new Pace(ratio, Math.min(ratio, 0.75));
    this.shaded = !options.light;
    if (this.shaded) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    this.calm = options.calm;
    this.rig = new CameraRig(options.calm);
    this.atmosphere = new Atmosphere(this.scene);
    if (this.shaded) this.atmosphere.castShadows();
    const city = options.city ?? null;
    this.ground = new Ground(course, options.land ?? null, city !== null);
    // No tree in a field with cows in it, nor in the water.
    const fields = inPaddocks(course, this.ground);
    const water = this.atmosphere.water;
    this.scenery = new Scenery(this.ground, options.light ? 0.5 : 1, fields, water);
    this.terrain = new Terrain(
      this.ground,
      (key, cx, cz, added) => {
        if (added) this.scenery.add(key, cx, cz);
        else this.scenery.remove(key);
      },
      water,
      this.shaded,
    );
    this.roadside = new Roadside(
      course,
      options.light ? 0.5 : 1,
      (x, z) => fields(x, z) || this.ground.wet(x, z),
      city !== null,
    );
    const room = (x: number, z: number, r: number) => {
      this.scenery.clearAround(x, z, r);
      this.roadside.clearAround(x, z, r);
      // The crowd makes way between the road and a café, not only where it stands.
      this.race?.clearAround(x, z, r + 8);
    };
    this.small = new SmallThings(course, this.ground, words, hooks, {
      calm: options.calm,
      canvas,
      room,
    });
    // A city's course on race day: its crowd, its marshals, its cobbles (ADR 0036).
    this.race = city
      ? new RaceDayScene(
          course,
          this.ground,
          raceDayOf(course, options.land?.setts ?? []),
          city,
          this.small.material,
          words,
          hooks,
          room,
          options,
        )
      : null;
    this.road = buildRoad(course, city !== null, (along) => this.race?.rumble(along) === 1);
    if (this.shaded) {
      this.road.traverse((child) => {
        if (child instanceof THREE.Mesh) child.receiveShadow = true;
      });
      castShadows(this.rider.group);
    }
    this.rider.group.rotation.order = "YXZ";
    this.scene.add(
      this.terrain.group,
      this.scenery.group,
      this.road,
      this.roadside.group,
      this.small.group,
      this.rider.group,
    );
    this.finish = options.finish
      ? new FinishLine(
          course,
          this.ground,
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
    // Only the rider, the rotors, the sky and the camera move; the rest is placed once.
    this.scene.matrixAutoUpdate = false;
    this.terrain.group.matrixAutoUpdate = false;
    this.scenery.group.matrixAutoUpdate = false;
    freeze(this.road);
    freeze(this.roadside.group);
    const start = courseAt(course, 0);
    this.terrain.fill(start.x, -start.y);
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
      this.calm || pausing.parked ? 0 : (this.race?.jolt(bike, distance, speed, seconds) ?? 0);

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
    this.scenery.animate(seconds);
    this.finish?.frame(distance, seconds);
    this.race?.frame(distance, seconds);
    this.terrain.update(eye.x, eye.z, 1);
    if (this.frames++ % 20 === 0) this.roadside.update(eye);
    this.renderer.render(this.scene, this.rig.camera);
  }

  dispose(): void {
    this.terrain.dispose();
    this.scenery.dispose();
    this.roadside.dispose();
    this.road.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
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
    if (this.race) point.y += this.race.lift(distance);
    return point;
  }
}

import * as THREE from "three";
import { courseAt, swayAt, type Course } from "@/modules/rulle";
import { Atmosphere } from "./atmosphere";
import { CameraRig } from "./camera-rig";
import { inPaddocks } from "./farmyard";
import { FinishLine } from "./finish-line";
import { Ground } from "./ground";
import { Pace } from "./pace";
import type { Pause } from "./pause-scene";
import { freeze } from "./props";
import { RiderFigure } from "./rider";
import { buildRoad } from "./road";
import { roadPoint } from "./road-point";
import { Roadside } from "./roadside";
import { Scenery } from "./scenery";
import { SmallThings, type SceneWords, type SmallThingsHooks } from "./small-things";
import { Terrain } from "./terrain";

/**
 * The landscape of a ride (ADR 0033), put together: the ground made from
 * the route, the road, what stands by it and on the land, the sky, the
 * rider, the camera that follows, and the small things on the way (ADR
 * 0034). Given where the rider is along the course, how fast, at what
 * cadence and whether paused, it draws one frame. It knows nothing about
 * sessions or trainers.
 */

export type WorldOptions = {
  /** Less motion on the screen: the camera only follows. */
  calm: boolean;
  /** A small or slow device: fewer trees and tufts, no antialiasing, fewer pixels. */
  light: boolean;
  /** A race's course: its finish, with the arch, where the lap ends (ADR 0035). */
  finish?: boolean;
};

export type Moment = {
  distance: number;
  speed: number;
  cadence: number;
  /** The ride's pause, if it is paused: which one, and for how long. */
  pause: Pause | null;
};

const QUIET: SmallThingsHooks = {
  seen: () => undefined,
  sound: () => undefined,
  spray: () => undefined,
};
const NO_WORDS: SceneWords = { name: "", top: "", cafe: "", stand: "", finish: "" };

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
  private readonly pace: Pace;
  private crank = 0;
  private frames = 0;
  private laid = { width: 0, height: 0, top: 0, bottom: 0 };

  constructor(
    canvas: HTMLCanvasElement,
    private readonly course: Course,
    options: WorldOptions,
    words: SceneWords = NO_WORDS,
    hooks: SmallThingsHooks = QUIET,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !options.light,
      powerPreference: "high-performance",
    });
    const ratio = Math.min(window.devicePixelRatio || 1, options.light ? 1 : 1.5);
    this.renderer.setPixelRatio(ratio);
    this.pace = new Pace(ratio, Math.min(ratio, 0.75));
    this.rig = new CameraRig(options.calm);
    this.atmosphere = new Atmosphere(this.scene);
    this.ground = new Ground(course);
    // No tree in a field with cows in it.
    const fields = inPaddocks(course, this.ground);
    this.scenery = new Scenery(this.ground, options.light ? 0.5 : 1, fields);
    this.terrain = new Terrain(this.ground, (key, cx, cz, added) => {
      if (added) this.scenery.add(key, cx, cz);
      else this.scenery.remove(key);
    });
    this.roadside = new Roadside(course, options.light ? 0.5 : 1, fields);
    this.small = new SmallThings(course, this.ground, words, hooks, {
      calm: options.calm,
      canvas,
      room: (x, z, r) => {
        this.scenery.clearAround(x, z, r);
        this.roadside.clearAround(x, z, r);
      },
    });
    this.road = buildRoad(course);
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
      ? new FinishLine(course, this.ground, this.small.material, words.finish, {
          crossed: () => hooks.seen("finish", 1),
          ring: () => hooks.sound("cheer"),
        })
      : null;
    if (this.finish) this.scene.add(this.finish.group);
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
    this.rider.animate(seconds, cadence, speed);

    if (pausing.jump) this.rig.jump();
    if (pausing.view) this.rig.view(pausing.view.eye, pausing.view.look, seconds);
    else {
      const behind = this.pointAt(distance - BEHIND, 0.4);
      const ahead = this.pointAt(distance + AHEAD, swayAt(distance + AHEAD) * 0.5);
      this.rig.follow(behind, ahead, this.turn(distance), speed, this.crank, seconds);
    }
    const eye = this.rig.camera.position;
    this.atmosphere.follow(eye, seconds);
    this.scenery.animate(seconds);
    this.finish?.frame(distance, seconds);
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
    this.atmosphere.dispose();
    this.renderer.dispose();
  }

  /** A point on the road `offset` metres right of its middle, on the road's surface. */
  private pointAt(distance: number, offset: number): THREE.Vector3 {
    return roadPoint(this.course, distance, offset);
  }

  /** How much the road bends here: radians per metre, to the left positive. */
  private turn(distance: number): number {
    const a = courseAt(this.course, distance).heading;
    const b = courseAt(this.course, distance + 20).heading;
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d / 20;
  }
}

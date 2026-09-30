import * as THREE from "three";
import { chalkOf, flagsOf, type Course, type Seen } from "@/modules/rulle";
import { ChalkClimb } from "./chalk-climb";
import { Farmyard, herdsHere } from "./farmyard";
import type { Ground } from "./ground";
import { PauseScene, type Pause } from "./pause-scene";
import type { RiderFigure } from "./rider";
import { groundPoint } from "./road-point";
import { Traffic } from "./traffic";
import { Visitors } from "./visitors";

/**
 * The small things on the way (ADR 0034), gathered for the world: what
 * passes on the road, the other riders on it (ADR 0035), the herds and
 * the flags, the chalk climb, and the pauses spent at a café. Everything here is for the corner of the eye —
 * none of it touches the numbers or the bar — and what the rider met is
 * told to the page as it happens, for "today's little things".
 */

export type SmallThingsHooks = {
  seen: (key: keyof Seen, count: number) => void;
  sound: (kind: "bell" | "cheer" | "whistle") => void;
  /** Washer fluid on the lens: the page draws the drops. */
  spray: () => void;
};

/** Words the landscape shows, in the reader's language. */
export type SceneWords = {
  name: string;
  top: string;
  cafe: string;
  stand: string;
  finish: string;
  /** Race day's zones (ADR 0036). */
  feed: string;
  litter: string;
};

/** Words for a landscape nobody reads: a harness, a test. */
export const NO_WORDS: SceneWords = {
  name: "",
  top: "",
  cafe: "",
  stand: "",
  finish: "",
  feed: "",
  litter: "",
};

/** Hooks nobody listens to. */
export const QUIET_HOOKS: SmallThingsHooks = {
  seen: () => undefined,
  sound: () => undefined,
  spray: () => undefined,
};

export class SmallThings {
  readonly group = new THREE.Group();
  /** The flat-shaded, vertex-coloured material every small thing is drawn in. */
  readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  private readonly visitors: Visitors;
  private readonly traffic: Traffic;
  private readonly farmyard: Farmyard;
  private readonly chalk: ChalkClimb | null;
  private readonly pauses: PauseScene;

  constructor(
    course: Course,
    ground: Ground,
    words: SceneWords,
    hooks: SmallThingsHooks,
    options: {
      calm: boolean;
      canvas: HTMLCanvasElement;
      room: (x: number, z: number, r: number) => void;
    },
  ) {
    const { material } = this;
    this.visitors = new Visitors(course, ground, material, {
      seen: (key) => hooks.seen(key, 1),
      sound: hooks.sound,
      spray: hooks.spray,
    });
    this.traffic = new Traffic(course, ground, material, hooks.seen);
    this.farmyard = new Farmyard(course, ground, material, (count) => hooks.seen("cows", count));
    const chalk = chalkOf(course);
    this.chalk = chalk
      ? new ChalkClimb(course, ground, material, chalk, words, () => hooks.sound("cheer"))
      : null;
    // A stop goes on the right, unless a herd's field or a flag is there
    // already, or a lake or the sea is; then on the left, unless that is wet.
    const herds = herdsHere(course, ground);
    const flags = flagsOf(course);
    const wet = (distance: number, side: 1 | -1) => {
      const p = groundPoint(course, ground, distance + 10, side * 12.5);
      return ground.wet(p.x, p.z);
    };
    const side = (distance: number): 1 | -1 => {
      const at = (distance % course.length) + 10;
      const taken =
        herds.some((h) => h.side === 1 && at > h.at - 60 && at < h.at + h.length + 60) ||
        flags.some((f) => f.side === 1 && Math.abs(at - f.at) < 40);
      const right = !taken && !wet(distance, 1);
      return right || wet(distance, -1) ? 1 : -1;
    };
    this.pauses = new PauseScene(
      course,
      ground,
      material,
      words,
      options.canvas,
      options.calm,
      options.room,
      side,
    );
    this.group.add(this.visitors.group, this.traffic.group, this.farmyard.group, this.pauses.group);
    if (this.chalk) this.group.add(this.chalk.group);
  }

  /** One frame of it all; what the pause asks of the camera and the bike. */
  frame(
    moment: { distance: number; speed: number; pause: Pause | null },
    seconds: number,
    eye: THREE.Vector3,
    rider: RiderFigure,
  ) {
    this.visitors.frame(moment.distance, moment.speed, seconds, moment.pause !== null);
    this.traffic.frame(moment.distance, moment.speed, seconds, moment.pause !== null);
    this.farmyard.frame(moment.distance, eye, seconds);
    this.chalk?.frame(moment.distance, seconds);
    return this.pauses.frame(moment.pause, moment.distance, seconds, rider);
  }

  dispose(): void {
    this.visitors.dispose();
    this.traffic.dispose();
    this.farmyard.dispose();
    this.chalk?.dispose();
    this.pauses.dispose();
    this.material.dispose();
  }
}

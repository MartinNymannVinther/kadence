import * as THREE from "three";
import { chalkOf, flagsOf, herdsOf, type Course, type Seen } from "@/modules/rulle";
import { ChalkClimb } from "./chalk-climb";
import { Farmyard } from "./farmyard";
import type { Ground } from "./ground";
import { PauseScene, type Pause } from "./pause-scene";
import type { RiderFigure } from "./rider";
import { Visitors } from "./visitors";

/**
 * The small things on the way (ADR 0034), gathered for the world: what
 * passes on the road, the herds and the flags, the chalk climb, and the
 * pauses spent at a café. Everything here is for the corner of the eye —
 * none of it touches the numbers or the bar — and what the rider met is
 * told to the page as it happens, for "today's little things".
 */

export type SmallThingsHooks = {
  seen: (key: keyof Seen, count: number) => void;
  sound: (kind: "bell" | "cheer") => void;
  /** Washer fluid on the lens: the page draws the drops. */
  spray: () => void;
};

/** Words the landscape shows, in the reader's language. */
export type SceneWords = { name: string; top: string; cafe: string; stand: string };

export class SmallThings {
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  private readonly visitors: Visitors;
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
    this.farmyard = new Farmyard(course, ground, material, (count) => hooks.seen("cows", count));
    const chalk = chalkOf(course);
    this.chalk = chalk
      ? new ChalkClimb(course, ground, material, chalk, words, () => hooks.sound("cheer"))
      : null;
    // A stop goes on the right, unless a herd's field or a flag is there already.
    const herds = herdsOf(course);
    const flags = flagsOf(course);
    const side = (distance: number): 1 | -1 => {
      const at = (distance % course.length) + 10;
      const taken =
        herds.some((h) => h.side === 1 && at > h.at - 60 && at < h.at + h.length + 60) ||
        flags.some((f) => f.side === 1 && Math.abs(at - f.at) < 40);
      return taken ? -1 : 1;
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
    this.group.add(this.visitors.group, this.farmyard.group, this.pauses.group);
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
    this.farmyard.frame(moment.distance, eye, seconds);
    this.chalk?.frame(moment.distance, seconds);
    return this.pauses.frame(moment.pause, moment.distance, seconds, rider);
  }

  dispose(): void {
    this.visitors.dispose();
    this.farmyard.dispose();
    this.chalk?.dispose();
    this.pauses.dispose();
    this.material.dispose();
  }
}

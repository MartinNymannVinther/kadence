import * as THREE from "three";
import { courseAt, swayAt, type Course, type Rival } from "@/modules/rulle";
import { LOOK } from "./challenger";
import { castShadows } from "./props";
import { RiderFigure } from "./rider";

/** Metres along the route he stands, and seconds he takes to turn once round. */
const AT = 12;
const TURN = 8;
/** Where the camera stands, metres back along the road and across it from him, and how high; and where it looks. */
const EYE = { back: 5.6, across: -1.5, high: 1.5 };
const LOOK_AT = { ahead: 0.8, across: 0.6, high: 0.8 };

/**
 * While Rulle gets ready (ADR 0076): one of the two riders the rider may
 * race (ADR 0074, 0075) on his bike on the road near the start, turning
 * slowly round as on a stand, with the route going on behind him; and
 * where the camera looks at him from. Each figure is made the first time
 * it is shown, and hidden after.
 */
export class Showcase {
  readonly group = new THREE.Group();
  private readonly figures = new Map<Rival, RiderFigure>();
  private turn = 0;

  constructor(
    private readonly course: Course,
    private readonly shaded: boolean,
  ) {}

  /**
   * `who` turning on, `seconds` later — or nobody — and where the camera
   * looks from and at; `pointAt` is a point on the road, metres along and
   * right of its middle.
   */
  frame(
    who: Rival | null,
    seconds: number,
    pointAt: (distance: number, offset: number) => THREE.Vector3,
  ): { eye: THREE.Vector3; look: THREE.Vector3 } | null {
    for (const [rival, figure] of this.figures) figure.group.visible = rival === who;
    if (!who) return null;
    const figure = this.figure(who);
    const line = swayAt(AT);
    const along = new THREE.Vector3().subVectors(pointAt(AT + 2, line), pointAt(AT - 2, line));
    this.turn = (this.turn + (seconds / TURN) * Math.PI * 2) % (Math.PI * 2);
    figure.group.position.copy(pointAt(AT, line));
    figure.group.rotation.set(
      Math.atan(courseAt(this.course, AT).grade),
      Math.atan2(-along.x, -along.z) + this.turn,
      0,
    );
    // Still on the stand: the challenger flat and aero, the sprinter in the saddle.
    figure.animate(seconds, 0, 0, who === "challenger" ? "aero" : "seated");
    const eye = pointAt(AT - EYE.back, line + EYE.across);
    eye.y += EYE.high;
    const look = pointAt(AT + LOOK_AT.ahead, line + LOOK_AT.across);
    look.y += LOOK_AT.high;
    return { eye, look };
  }

  dispose(): void {
    for (const figure of this.figures.values()) figure.dispose();
  }

  private figure(who: Rival): RiderFigure {
    const made = this.figures.get(who);
    if (made) return made;
    const figure = new RiderFigure(LOOK[who].kit);
    figure.group.rotation.order = "YXZ";
    figure.group.scale.setScalar(LOOK[who].scale);
    if (this.shaded) castShadows(figure.group);
    this.group.add(figure.group);
    this.figures.set(who, figure);
    return figure;
  }
}

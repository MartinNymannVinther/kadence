import * as THREE from "three";
import {
  courseAt,
  postureAt,
  SPRINTER,
  type ChallengerAt,
  type Course,
  type Posture,
  type Rival,
} from "@/modules/rulle";
import { ChallengeLine } from "./challenge-line";
import { CHALLENGER_KIT, SPRINTER_KIT } from "./kits";
import { castShadows } from "./props";
import { RiderFigure } from "./rider";

/** Each rival's kit, and how big he is beside the rider. */
const LOOK: Record<Rival, { kit: typeof CHALLENGER_KIT; scale: number }> = {
  challenger: { kit: CHALLENGER_KIT, scale: 1 },
  sprinter: { kit: SPRINTER_KIT, scale: SPRINTER.scale },
};

/**
 * The challenger on the road (ADR 0074): the rider's own figure and bike
 * in his red and white, placed where the race has him — beside the
 * rider, in their wheel or ahead of them — flat and aero where the road
 * would have him in the saddle; in the drops from 500 W, and out of the
 * saddle in them over 700 W, in his first seconds and in the sprint. Or
 * the sprinter HYLDTOFT calls (ADR 0075), small, in red and black, as the
 * road has him on the rider's wheel, sprinting in the drops, and up in
 * the air as he throws his bike at the line. And the line where the race
 * ends (`ChallengeLine`). Each figure is made the first time he comes,
 * and hidden between races.
 */
export class ChallengerScene {
  readonly group = new THREE.Group();
  private readonly figures = new Map<Rival, RiderFigure>();
  /** The posture the road calls for: the challenger rides aero where it says the saddle. */
  private road: Posture = "seated";
  private readonly line: ChallengeLine;

  constructor(
    private readonly course: Course,
    private readonly shaded: boolean,
    finishWord: string,
  ) {
    this.line = new ChallengeLine(course, finishWord);
    this.group.add(this.line.group);
  }

  /** Him at `at`, or nobody; `pointAt` is a point on the road, metres along and right of the middle. */
  frame(
    at: ChallengerAt | null,
    seconds: number,
    pointAt: (distance: number, offset: number) => THREE.Vector3,
  ): void {
    this.line.place(at?.finish ?? null);
    for (const [who, figure] of this.figures) figure.group.visible = at?.who === who;
    if (!at) return;
    const figure = this.figure(at.who);
    const bike = figure.group;
    const along = new THREE.Vector3().subVectors(
      pointAt(at.distance + 2, at.line),
      pointAt(at.distance - 2, at.line),
    );
    bike.position.copy(pointAt(at.distance, at.line));
    figure.hop(at.jump);
    bike.rotation.set(
      Math.atan(courseAt(this.course, at.distance).grade),
      Math.atan2(-along.x, -along.z),
      0,
    );
    this.road = postureAt(this.course, at.distance, at.speed, at.cadence, this.road);
    const own = at.who === "challenger" && this.road === "seated" ? "aero" : this.road;
    const posture = at.effort === "steady" ? own : at.effort;
    // A smaller bike's wheels turn faster for the same speed.
    figure.animate(seconds, at.cadence, at.speed / LOOK[at.who].scale, posture);
    bike.rotation.z = figure.roll;
  }

  dispose(): void {
    for (const figure of this.figures.values()) figure.dispose();
    this.line.dispose();
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

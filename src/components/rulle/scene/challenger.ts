import * as THREE from "three";
import { courseAt, postureAt, type ChallengerAt, type Course, type Posture } from "@/modules/rulle";
import { ChallengeLine } from "./challenge-line";
import { CHALLENGER_KIT } from "./kits";
import { castShadows } from "./props";
import { RiderFigure } from "./rider";

/**
 * The challenger on the road (ADR 0049): the rider's own figure and bike
 * in his red and white, placed where the race has him — beside the
 * rider, in their wheel or ahead of them — low and aero on the flat, out
 * of the saddle as he builds from the start and in the sprint; and the
 * line where the race ends (`ChallengeLine`). Made the first time he
 * comes, and hidden between races.
 */
export class ChallengerScene {
  readonly group = new THREE.Group();
  private figure: RiderFigure | null = null;
  /** The posture the road calls for, and the one he rides in: aero where it says the saddle. */
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
    if (this.figure) this.figure.group.visible = at !== null;
    if (!at) return;
    const figure = (this.figure ??= this.make());
    figure.group.visible = true;
    const bike = figure.group;
    const along = new THREE.Vector3().subVectors(
      pointAt(at.distance + 2, at.line),
      pointAt(at.distance - 2, at.line),
    );
    bike.position.copy(pointAt(at.distance, at.line));
    bike.rotation.set(
      Math.atan(courseAt(this.course, at.distance).grade),
      Math.atan2(-along.x, -along.z),
      0,
    );
    this.road = postureAt(this.course, at.distance, at.speed, at.cadence, this.road);
    const posture = at.standing ? "standing" : this.road === "seated" ? "tuck" : this.road;
    figure.animate(seconds, at.cadence, at.speed, posture);
    bike.rotation.z = figure.roll;
  }

  dispose(): void {
    this.figure?.dispose();
    this.line.dispose();
  }

  private make(): RiderFigure {
    const figure = new RiderFigure(CHALLENGER_KIT);
    figure.group.rotation.order = "YXZ";
    if (this.shaded) castShadows(figure.group);
    this.group.add(figure.group);
    return figure;
  }
}

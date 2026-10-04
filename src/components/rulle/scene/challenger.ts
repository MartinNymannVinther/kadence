import * as THREE from "three";
import { courseAt, postureAt, type ChallengerAt, type Course, type Posture } from "@/modules/rulle";
import { CHALLENGER_KIT } from "./kits";
import { castShadows } from "./props";
import { RiderFigure } from "./rider";

/**
 * The challenger on the road (ADR 0049): the rider's own figure and bike
 * in his red and white, placed where the race has him — beside the
 * rider, in their wheel or ahead of them — out of the saddle in his
 * attack and in the sprint. Made the first time he comes, and hidden
 * between races.
 */
export class ChallengerScene {
  readonly group = new THREE.Group();
  private figure: RiderFigure | null = null;
  private posture: Posture = "seated";

  constructor(
    private readonly course: Course,
    private readonly shaded: boolean,
  ) {}

  /** Him at `at`, or nobody; `pointAt` is a point on the road, metres along and right of the middle. */
  frame(
    at: ChallengerAt | null,
    seconds: number,
    pointAt: (distance: number, offset: number) => THREE.Vector3,
  ): void {
    this.group.visible = at !== null;
    if (!at) return;
    const figure = (this.figure ??= this.make());
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
    this.posture = at.standing
      ? "standing"
      : postureAt(this.course, at.distance, at.speed, at.cadence, this.posture);
    figure.animate(seconds, at.cadence, at.speed, this.posture);
    bike.rotation.z = figure.roll;
  }

  dispose(): void {
    this.figure?.dispose();
  }

  private make(): RiderFigure {
    const figure = new RiderFigure(CHALLENGER_KIT);
    figure.group.rotation.order = "YXZ";
    if (this.shaded) castShadows(figure.group);
    this.group.add(figure.group);
    return figure;
  }
}

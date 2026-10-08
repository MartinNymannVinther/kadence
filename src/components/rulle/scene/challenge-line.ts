import * as THREE from "three";
import { courseAt, type Course } from "@/modules/rulle";
import { PALETTE as P } from "./palette";
import { roadPoint, roadYaw } from "./road-point";
import { box, merged } from "./shapes";
import { bannerTexture, checkerTexture, disposeTextured } from "./text-plates";

/** The arch's legs, metres either side of the road's middle, as at a race's finish (`finish-line.ts`). */
const HALF = 4.4;

/**
 * The line at the end of the challenger's race (ADR 0074): an arch over
 * the road in his red and white, the word for the finish on its banner
 * both ways, and the checkered line across the asphalt — put where the
 * race ends once it starts, and taken away when it is over.
 */
export class ChallengeLine {
  readonly group = new THREE.Group();
  private readonly arch = new THREE.Group();
  private readonly line = new THREE.Group();
  private readonly shape: THREE.BufferGeometry;
  private readonly material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  private readonly faces: THREE.Mesh[] = [];
  private at: number | null = null;

  constructor(
    private readonly course: Course,
    word: string,
  ) {
    this.shape = merged([
      box(0.6, 5.2, 0.6, P.flagRed, -HALF, 2.3, 0),
      box(0.6, 5.2, 0.6, P.flagRed, HALF, 2.3, 0),
      box(HALF * 2 + 0.6, 1.1, 0.7, P.wall, 0, 4.75, 0),
      box(1.0, 0.3, 1.0, P.dark, -HALF, -0.1, 0),
      box(1.0, 0.3, 1.0, P.dark, HALF, -0.1, 0),
    ]);
    this.arch.add(new THREE.Mesh(this.shape, this.material));
    for (const side of [1, -1]) {
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(HALF * 2 - 0.3, 0.9),
        new THREE.MeshLambertMaterial({ map: bannerTexture(word) }),
      );
      banner.position.set(0, 4.75, side * 0.36);
      banner.rotation.y = side > 0 ? 0 : Math.PI;
      this.faces.push(banner);
      this.arch.add(banner);
    }
    const checks = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 0.75),
      new THREE.MeshBasicMaterial({
        map: checkerTexture(),
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    checks.rotation.x = -Math.PI / 2;
    this.faces.push(checks);
    this.line.rotation.order = "YXZ";
    this.line.add(checks);
    this.group.add(this.arch, this.line);
    this.group.visible = false;
  }

  /** At the race's end, `finish` metres ridden; or away, with none. */
  place(finish: number | null): void {
    this.group.visible = finish !== null;
    if (finish === null || finish === this.at) return;
    this.at = finish;
    const yaw = roadYaw(this.course, finish);
    this.arch.position.copy(roadPoint(this.course, finish, 0));
    this.arch.rotation.y = yaw;
    this.line.position.copy(roadPoint(this.course, finish, 0));
    this.line.position.y += 0.012;
    this.line.rotation.y = yaw;
    this.line.rotation.x = Math.atan(courseAt(this.course, finish).grade);
  }

  dispose(): void {
    for (const face of this.faces) disposeTextured(face);
    this.shape.dispose();
    this.material.dispose();
  }
}

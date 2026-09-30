import * as THREE from "three";
import { drinksIn, pauseStage, stopKind, type Course, type PauseStage } from "@/modules/rulle";
import type { Ground } from "./ground";
import type { RiderFigure } from "./rider";
import { groundPoint, roadYaw } from "./road-point";
import { Sitter } from "./sitter";
import { buildStop, type Stop } from "./stops";

/**
 * A pause, as the landscape spends it (ADR 0034). The first quarter
 * minute the rider stays on the bike, a foot down, and drinks from the
 * bottle. Then the picture dips to the haze and comes back at a café or a
 * farm stand by the road: the bike against the wall, the rider at the
 * table with a coffee or a soda; after three minutes a second one and the
 * paper; after ten, asleep, with a cat. When the ride goes on, it dips
 * again and the rider is back on the road at once; the stop stays where it
 * was, the empty cups on the table, for the next lap to pass.
 */

export type Pause = { index: number; seconds: number };
export type View = { eye: THREE.Vector3; look: THREE.Vector3 };
export type Parked = { at: THREE.Vector3; yaw: number; lean: number };

type Here = {
  index: number;
  stop: Stop;
  sitter: Sitter;
  stage: PauseStage;
  seconds: number;
  side: 1 | -1;
};

/** Seconds the picture takes to dip to the haze, each way. */
const DIP = 0.22;
/** Stops kept standing by the road for later laps. */
const KEPT = 6;

export class PauseScene {
  readonly group = new THREE.Group();
  private here: Here | null = null;
  private readonly kept: Stop[] = [];
  private dip: { at: number; then: () => void } | null = null;
  private clock = 0;
  private jumpNext = false;

  constructor(
    private readonly course: Course,
    private readonly ground: Ground,
    private readonly material: THREE.Material,
    private readonly words: { cafe: string; stand: string },
    private readonly canvas: HTMLCanvasElement,
    private readonly calm: boolean,
    /** Makes room for a stop at a place, and says which side of the road it goes on. */
    private readonly room: (x: number, z: number, r: number) => void,
    private readonly side: (distance: number) => 1 | -1,
  ) {}

  /**
   * One frame: where the camera looks from and at while the rider sits, or
   * null to follow the rider; whether it should jump rather than glide; and
   * where the bike stands while it is parked.
   */
  frame(pause: Pause | null, distance: number, seconds: number, rider: RiderFigure) {
    this.clock += seconds;
    if (this.dip && this.clock >= this.dip.at) {
      const then = this.dip.then;
      this.dip = null;
      then();
      this.canvas.style.opacity = "1";
    }
    const stage = pause ? pauseStage(pause.seconds) : null;
    if (pause && stage && stage !== "bottle") {
      if (!this.here || this.here.index !== pause.index) {
        if (!this.dip) this.dipThen(() => this.sitDown(pause, distance, rider));
        rider.setStop("bottle");
        return this.answer(null);
      }
      this.here.seconds = pause.seconds;
      if (this.here.stage !== stage) {
        this.here.stage = stage;
        this.here.sitter.set(stage);
      }
      this.here.sitter.animate(seconds);
      return this.answer(this.view(this.here));
    }
    if (this.here) {
      if (!this.dip) this.dipThen(() => this.standUp(rider));
      this.here.sitter.animate(seconds);
      return this.answer(this.view(this.here));
    }
    // A dip toward a stop the ride did not wait for: back to the road as it was.
    if (this.dip) {
      this.dip = null;
      this.canvas.style.opacity = "1";
    }
    rider.setStop(pause ? "bottle" : "riding");
    return this.answer(null);
  }

  dispose(): void {
    if (this.here) this.here.sitter.dispose();
    for (const stop of [...this.kept, ...(this.here ? [this.here.stop] : [])]) stop.dispose();
    this.canvas.style.opacity = "1";
  }

  private answer(view: View | null) {
    const jump = this.jumpNext;
    this.jumpNext = false;
    const parked = this.here ? this.parked(this.here) : null;
    return { view, jump, parked };
  }

  private dipThen(then: () => void): void {
    this.canvas.style.transition = `opacity ${Math.round(DIP * 1000)}ms ease`;
    this.canvas.style.opacity = "0";
    this.dip = { at: this.clock + DIP, then };
  }

  private sitDown(pause: Pause, distance: number, rider: RiderFigure): void {
    const side = this.side(distance);
    const kind = stopKind(pause.index);
    const stop = buildStop(kind, this.material, this.words);
    const at = distance + 10;
    stop.group.position.copy(groundPoint(this.course, this.ground, at, side * 12.5));
    // Facing the road, from whichever side it stands on.
    stop.group.rotation.y = roadYaw(this.course, at) + (side * Math.PI) / 2;
    stop.group.updateMatrixWorld(true);
    const middle = stop.group.localToWorld(new THREE.Vector3(0.6, 0, 2.6));
    this.room(middle.x, middle.z, 9);
    const sitter = new Sitter(this.material, stop.drink);
    sitter.group.position.copy(stop.seat);
    stop.group.add(sitter.group);
    const stage = pauseStage(pause.seconds);
    sitter.set(stage);
    this.group.add(stop.group);
    this.here = { index: pause.index, stop, sitter, stage, seconds: pause.seconds, side };
    rider.setStop("parked");
    this.jumpNext = true;
  }

  private standUp(rider: RiderFigure): void {
    const here = this.here;
    if (!here) return;
    here.stop.leave(drinksIn(here.seconds));
    here.stop.group.remove(here.sitter.group);
    here.sitter.dispose();
    this.kept.push(here.stop);
    if (this.kept.length > KEPT) {
      const old = this.kept.shift()!;
      this.group.remove(old.group);
      old.dispose();
    }
    this.here = null;
    rider.setStop("riding");
    this.jumpNext = true;
  }

  /** From the verge by the road, a little to the side, at the rider at the table; drifting, unless asked not to. */
  private view(here: Here): View {
    const drift = this.calm ? 0 : Math.sin(this.clock * 0.12) * 1.2;
    const g = here.stop.group;
    return {
      eye: g.localToWorld(new THREE.Vector3(-2.4 + drift, 2.0, -6.6)),
      look: g.localToWorld(new THREE.Vector3(0.4, 0.95, 0.7)),
    };
  }

  private parked(here: Here): Parked {
    const { at, yaw, lean } = here.stop.bike;
    return {
      at: here.stop.group.localToWorld(at.clone()),
      yaw: here.stop.group.rotation.y + yaw,
      lean,
    };
  }
}

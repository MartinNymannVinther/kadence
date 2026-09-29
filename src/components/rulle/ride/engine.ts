import {
  blockAt,
  closeLap,
  courseAt,
  endRecording,
  ergWatts,
  nextSpeed,
  pauseRecording,
  record,
  resumeRecording,
  scaledBand,
  standing,
  startRecording,
  type Band,
  type Block,
  type BlockNow,
  type Course,
  type CoursePoint,
  type Recording,
  type SessionTimeline,
  type Standing,
} from "@/modules/rulle";
import {
  pauseClock,
  planSecond,
  resumeClock,
  riddenSeconds,
  skipTo,
  startClock,
  type Clock,
} from "./clock";
import type { Sensors, SensorsNow } from "./sensors";
import { PowerTrace } from "./trace";

/**
 * A ride while it is ridden (ADR 0033): the session's clock and blocks,
 * the trainer's target, the rider's place on the course, and the
 * recording. No React and no browser in it; the page calls `tick` a few
 * times a second and draws what `live` says.
 *
 * - Each new block closes a lap and sets the trainer to the block's watts
 *   (ERG), or lets it be a flat road when the block is free, ERG is off,
 *   or the ride is paused — so a rider starting again never starts
 *   against 300 W at a standstill.
 * - With neither watts nor a turning crank for `AUTO_PAUSE_SECONDS` the
 *   ride pauses, and it goes on by itself when the legs do.
 * - The speed along the course is the physics' answer to the measured
 *   watts. Without anything that measures them, the landscape still moves
 *   at the block's watts, but nothing about speed or distance is recorded:
 *   a ride is what was measured.
 */

/** Watts the landscape moves at when nothing measures them and the block names none. */
export const DRAWN_WATTS = 150;
export const AUTO_PAUSE_SECONDS = 3;
const RESUME_WATTS = 30;
const RESUME_CADENCE = 20;
export const INTENSITY = { min: 0.5, max: 1.2, step: 0.05 } as const;

export type Status = "ready" | "riding" | "paused" | "finished";

export type EngineEvents = {
  /** What the trainer should hold now: watts, or null for the rider's own gears. */
  target: (watts: number | null) => void;
  /** 3, 2, 1 before a block ends, the change of block, and the end of the session. */
  cue: (kind: "count" | "change" | "end") => void;
  finished: () => void;
};

export type Live = SensorsNow & {
  status: Status;
  autoPaused: boolean;
  /** Seconds into the plan. */
  second: number;
  /** Seconds ridden, pauses and skips left out. */
  ridden: number;
  totalSeconds: number | null;
  block: BlockNow | null;
  next: Block | null;
  target: number | null;
  band: Band | null;
  standing: Standing;
  speed: number;
  distance: number;
  intensity: number;
  erg: boolean;
  /** The watts ridden, one average per TRACE_SECONDS of the plan. */
  trace: readonly (number | null)[];
};

export class RideEngine {
  status: Status = "ready";
  autoPaused = false;
  intensity = 1;
  erg = true;
  recording: Recording | null = null;
  private readonly trace = new PowerTrace();
  private clock: Clock | null = null;
  private speed = 0;
  private distance = 0;
  private movedAt = 0;
  private lastSecond = -1;
  private blockIndex = -1;
  private idleSince: number | null = null;

  constructor(
    private readonly timeline: SessionTimeline | null,
    private readonly course: Course,
    private readonly sensors: Sensors,
    private readonly events: EngineEvents,
  ) {}

  start(now: number): void {
    if (this.status !== "ready") return;
    this.recording = startRecording(now);
    this.clock = startClock(now);
    this.movedAt = now;
    this.status = "riding";
    this.tick(now);
  }

  tick(now: number): void {
    if (!this.clock || this.status === "ready" || this.status === "finished") return;
    this.move(now);
    const live = this.sensors.now(now);
    if (this.status === "paused") {
      const moving = (live.power ?? 0) >= RESUME_WATTS || (live.cadence ?? 0) >= RESUME_CADENCE;
      if (this.autoPaused && moving) this.resume(now);
      return;
    }
    const second = Math.floor(planSecond(this.clock, now));
    if (second === this.lastSecond) return;
    this.lastSecond = second;
    this.everySecond(now, second, live);
  }

  pause(now: number, auto = false): void {
    if (this.status !== "riding" || !this.clock || !this.recording) return;
    this.clock = pauseClock(this.clock, now);
    pauseRecording(this.recording, now);
    this.status = "paused";
    this.autoPaused = auto;
    this.speed = 0;
    this.idleSince = null;
    this.events.target(null);
  }

  resume(now: number): void {
    if (this.status !== "paused" || !this.clock || !this.recording) return;
    this.clock = resumeClock(this.clock, now);
    resumeRecording(this.recording, now);
    this.status = "riding";
    this.autoPaused = false;
    this.movedAt = now;
    this.idleSince = null;
    this.events.target(this.target());
  }

  /** On to the next block: the rest of this one is left out, and its lap closes. */
  skip(now: number): void {
    if (!this.timeline || !this.clock || (this.status !== "riding" && this.status !== "paused"))
      return;
    const current = blockAt(this.timeline, Math.floor(planSecond(this.clock, now)));
    if (!current) return;
    this.clock = skipTo(this.clock, now, current.block.to);
    this.tick(now);
  }

  setIntensity(value: number): void {
    const stepped = Math.round(value / INTENSITY.step) * INTENSITY.step;
    this.intensity =
      Math.round(Math.min(INTENSITY.max, Math.max(INTENSITY.min, stepped)) * 100) / 100;
    this.events.target(this.target());
  }

  setErg(on: boolean): void {
    this.erg = on;
    this.events.target(this.target());
  }

  finish(now: number): void {
    if (!this.recording || this.status === "ready" || this.status === "finished") return;
    const block = this.timeline?.blocks[this.blockIndex];
    endRecording(this.recording, now, block?.intent ?? "steady");
    this.status = "finished";
    this.speed = 0;
    this.events.cue("end");
    this.events.target(null);
    this.events.finished();
  }

  /** Where the rider is now, between ticks too: the scene asks every frame. */
  positionAt(now: number): CoursePoint & { speed: number; distance: number } {
    const ahead =
      this.status === "riding" ? (this.speed * Math.max(0, now - this.movedAt)) / 1000 : 0;
    const distance = this.distance + Math.min(ahead, this.speed);
    return { ...courseAt(this.course, distance), speed: this.speed, distance };
  }

  live(now: number): Live {
    const second = this.clock ? planSecond(this.clock, now) : 0;
    const block = this.timeline ? blockAt(this.timeline, Math.floor(second)) : null;
    const sensors = this.sensors.now(now);
    return {
      ...sensors,
      status: this.status,
      autoPaused: this.autoPaused,
      second,
      ridden: this.clock ? riddenSeconds(this.clock, now) : 0,
      totalSeconds: this.timeline?.seconds ?? null,
      block,
      next: block ? (this.timeline?.blocks[block.index + 1] ?? null) : null,
      target: this.target(),
      band: block ? scaledBand(block.block, this.intensity) : null,
      // A pause is no call to push: the verdict is only given while riding.
      standing:
        block && this.status === "riding"
          ? standing(block.block, sensors.power3s, this.intensity)
          : "free",
      speed: this.speed,
      distance: this.distance,
      intensity: this.intensity,
      erg: this.erg,
      trace: this.trace.values,
    };
  }

  private everySecond(now: number, second: number, live: SensorsNow): void {
    const rec = this.recording!;
    const current = this.timeline ? blockAt(this.timeline, second) : null;
    if (this.timeline && !current) {
      // The plan is over: this second belongs to no block and is not ridden.
      this.finish(now);
      return;
    }
    const measured = this.sensors.seen.power;
    record(rec, now, {
      power: live.power,
      cadence: live.cadence,
      hr: live.heartRate,
      speed: measured ? this.speed : null,
      distance: measured ? this.distance : null,
      altitude: measured ? courseAt(this.course, this.distance).ele : null,
    });
    this.trace.add(second, live.power);
    this.watchIdle(now, live);
    if (!this.timeline || !current || this.status !== "riding") return;
    if (current.index !== this.blockIndex) {
      const left = this.timeline.blocks[this.blockIndex];
      if (left) {
        closeLap(rec, now, left.intent);
        this.events.cue("change");
      }
      this.blockIndex = current.index;
      this.events.target(this.target());
    } else if (current.remaining <= 3) this.events.cue("count");
  }

  private watchIdle(now: number, live: SensorsNow): void {
    if (!this.sensors.seen.power && !this.sensors.seen.cadence) return;
    const idle = (live.power ?? 0) <= 0 && (live.cadence ?? 0) <= 0;
    if (!idle) this.idleSince = null;
    else if (this.idleSince === null) this.idleSince = now;
    else if (now - this.idleSince >= AUTO_PAUSE_SECONDS * 1000) this.pause(now, true);
  }

  private move(now: number): void {
    const dt = Math.min(1, Math.max(0, (now - this.movedAt) / 1000));
    this.movedAt = now;
    if (this.status !== "riding") {
      this.speed = 0;
      return;
    }
    const watts = this.sensors.seen.power
      ? (this.sensors.now(now).power ?? 0)
      : (this.blockWatts() ?? DRAWN_WATTS);
    this.speed = nextSpeed(this.speed, watts, courseAt(this.course, this.distance).grade, dt);
    this.distance += this.speed * dt;
  }

  private blockWatts(): number | null {
    const block = this.timeline?.blocks[this.blockIndex];
    return block ? ergWatts(block, this.intensity) : null;
  }

  private target(): number | null {
    return this.erg && this.status === "riding" ? this.blockWatts() : null;
  }
}

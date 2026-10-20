import {
  blockAt,
  closeLap,
  endRecording,
  ergWatts,
  isHard,
  pauseRecording,
  record,
  resumeRecording,
  roadGrade,
  scaledBand,
  standing,
  startRecording,
  type Course,
  type Recording,
  type SessionTimeline,
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
import { AUTO_PAUSE_SECONDS, ErgEase, Idle, INTENSITY, IntensityUsed } from "./hold";
import type { Live } from "./live";
import { DRAWN_WATTS, Motion } from "./motion";
import type { Sensors, SensorsNow } from "./sensors";
import { OnTarget } from "./on-target";
import type { Shown, ShownAt } from "./shown";
import { PowerTrace } from "./trace";

/**
 * A ride while it is ridden (ADR 0033): the session's clock and blocks,
 * the trainer's target, the rider's place on the course (`Motion`), and
 * the recording. No React and no browser in it; the page calls `tick` a
 * few times a second and draws what `live` says. Each new block closes a
 * lap and sets the trainer to the block's watts (ERG); where Rulle is not
 * holding them — a free block, ERG off, the rider riding the route (ADR
 * 0107) — the trainer gets the route's grade at half strength
 * (`roadGrade`) and the rider gears. A pause is a flat road, so a rider
 * starting again never starts against 300 W or a hill. A collapsed
 * cadence eases ERG (`ErgEase`); legs that stop pause the ride (`Idle`);
 * a hard block's last seconds get a cowbell (ADR 0034), and every second
 * with watts to hold counts toward the on-target verdict (`OnTarget`).
 */

export { AUTO_PAUSE_SECONDS, DRAWN_WATTS, INTENSITY };
/** Seconds before a hard block ends when the cowbell rings, before the three beeps. */
const CHEER_AT = [10, 8, 6];

export type Status = "ready" | "riding" | "paused" | "finished";

export type EngineEvents = {
  /** What the trainer should hold now: watts, or null and a road of `grade` for the rider's own gears. */
  target: (watts: number | null, grade: number) => void;
  /** 3, 2, 1 before a block ends, the change of block, the end, and a cowbell near a hard block's end. */
  cue: (kind: "count" | "change" | "end" | "cheer") => void;
  finished: () => void;
};

export type { Live } from "./live";

export class RideEngine {
  status: Status = "ready";
  autoPaused = false;
  intensity = 1;
  /** The trainer holds each block's watts; off, the route sets the resistance and the rider gears. */
  erg = true;
  recording: Recording | null = null;
  /** Where the rider is shown: the warp, the cheat codes, the challenger (`shown.ts`). */
  readonly shown: Shown;
  /** The least and the most the session was turned to on the way. */
  readonly used = new IntensityUsed();
  private readonly ease = new ErgEase();
  private readonly trace = new PowerTrace();
  private readonly motion: Motion;
  private readonly idle = new Idle();
  private clock: Clock | null = null;
  private road = 0;
  private lastSecond = -1;
  private blockIndex = -1;
  private readonly onTarget: OnTarget;

  constructor(
    private readonly timeline: SessionTimeline | null,
    course: Course,
    private readonly sensors: Sensors,
    private readonly events: EngineEvents,
  ) {
    this.onTarget = new OnTarget(timeline);
    this.motion = new Motion(course);
    this.shown = this.motion.shown;
  }

  start(now: number): void {
    if (this.status !== "ready") return;
    this.recording = startRecording(now);
    this.clock = startClock(now);
    this.motion.from(now);
    this.status = "riding";
    this.tick(now);
  }

  tick(now: number): void {
    if (!this.clock || this.status === "ready" || this.status === "finished") return;
    this.move(now);
    const live = this.sensors.now(now);
    if (this.status === "paused") {
      if (this.autoPaused && this.idle.moving(live)) this.resume(now);
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
    this.motion.stop();
    this.idle.reset();
    this.ease.reset();
    this.events.target(null, 0);
  }

  resume(now: number): void {
    if (this.status !== "paused" || !this.clock || !this.recording) return;
    this.clock = resumeClock(this.clock, now);
    resumeRecording(this.recording, now);
    this.status = "riding";
    this.autoPaused = false;
    this.motion.from(now);
    this.idle.reset();
    this.hold();
  }

  /** On to the next block: the rest of this one is left out, and its lap closes. */
  skip(now: number): void {
    if (!this.timeline || !this.clock || (this.status !== "riding" && this.status !== "paused"))
      return;
    const current = blockAt(this.timeline, Math.floor(planSecond(this.clock, now)));
    if (!current) return;
    this.onTarget.skip();
    this.clock = skipTo(this.clock, now, current.block.to);
    this.tick(now);
  }

  setIntensity(value: number): void {
    const stepped = Math.round(value / INTENSITY.step) * INTENSITY.step;
    this.intensity =
      Math.round(Math.min(INTENSITY.max, Math.max(INTENSITY.min, stepped)) * 100) / 100;
    this.used.note(this.intensity);
    this.hold();
  }

  setErg(on: boolean): void {
    this.erg = on;
    if (!on) this.ease.reset();
    this.hold();
  }

  finish(now: number): void {
    if (!this.recording || this.status === "ready" || this.status === "finished") return;
    const block = this.timeline?.blocks[this.blockIndex];
    endRecording(this.recording, now, block?.intent ?? "steady");
    this.status = "finished";
    this.motion.stop();
    this.events.cue("end");
    this.events.target(null, 0);
    this.events.finished();
  }

  /** Whether the session was ridden as written (`OnTarget`); null when that cannot be said. */
  allOnTarget(): boolean | null {
    return this.onTarget.verdict(this.sensors.seen.power);
  }

  /** Where the rider is shown now, between ticks too: the scene asks every frame. */
  positionAt(now: number): ShownAt {
    return this.motion.positionAt(now, this.status === "riding");
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
      speed: this.shown.speed(this.motion.speed),
      distance: this.shown.place(this.motion.distance, this.motion.speed),
      cheat: this.shown.cheat.state(),
      race: this.shown.race.live(),
      intensity: this.intensity,
      erg: this.erg,
      eased: this.ease.eased,
      road: this.road,
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
      speed: measured ? this.motion.speed : null,
      distance: measured ? this.motion.distance : null,
      altitude: measured ? this.motion.here().ele : null,
    });
    this.trace.add(second, live.power);
    if (this.idle.stopped(now, live, this.sensors.seen)) this.pause(now, true);
    if (this.status !== "riding") return;
    if (!this.timeline || !current) {
      this.followRoad();
      return;
    }
    this.onTarget.second(current.index, current.block, live.power3s, this.intensity);
    const holding = this.erg && current.block.watts !== null && this.sensors.seen.cadence;
    const eased = this.ease.second(live.cadence, holding);
    if (current.index !== this.blockIndex) {
      const left = this.timeline.blocks[this.blockIndex];
      if (left) {
        closeLap(rec, now, left.intent);
        this.events.cue("change");
      }
      this.blockIndex = current.index;
      this.hold();
    } else if (eased) this.hold();
    else this.followRoad();
    if (current.remaining <= 3) this.events.cue("count");
    else if (isHard(current.block) && CHEER_AT.includes(current.remaining))
      this.events.cue("cheer");
  }

  /** The road's grade where the rider is, given to the trainer when it changes and nothing is held. */
  private followRoad(): void {
    const grade = roadGrade(this.motion.here().grade);
    if (grade === this.road) return;
    this.road = grade;
    if (this.target() === null) this.events.target(null, grade);
  }

  /** The trainer set to what it should hold now. */
  private hold(): void {
    this.road = roadGrade(this.motion.here().grade);
    this.events.target(this.target(), this.status === "riding" ? this.road : 0);
  }

  private move(now: number): void {
    if (this.status !== "riding") {
      this.motion.stop();
      return;
    }
    const watts = this.sensors.seen.power
      ? (this.sensors.now(now).power ?? 0)
      : (this.blockWatts() ?? DRAWN_WATTS);
    this.motion.step(now, watts, this.timeline === null);
  }

  private blockWatts(): number | null {
    const block = this.timeline?.blocks[this.blockIndex];
    return block ? ergWatts(block, this.intensity) : null;
  }

  private target(): number | null {
    return this.erg && this.status === "riding" ? this.ease.hold(this.blockWatts()) : null;
  }
}

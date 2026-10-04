"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nothingSeen, type Course, type Seen, type SessionTimeline } from "@/modules/rulle";
import type { TrainerLink } from "../bluetooth/trainer-link";
import type { Moment } from "../scene/world";
import type { Beeps } from "./beeps";
import type { CheatMode, Push } from "./cheat";
import type { WattTune } from "./watt-dial";
import { RideEngine, type Live } from "./engine";
import type { ShownAt } from "./shown";
import { keepRide, type RideMeta } from "./ride-store";
import type { Sensors } from "./sensors";

/** The engine is ticked this often: the physics' steps and a second's work on time. */
const TICK_MS = 100;
/** The cadence the figure pedals at when nothing measures the legs. */
const DRAWN_CADENCE = 85;
/** The screen's numbers are drawn this often. */
const DRAW_MS = 250;
/** The ride is put aside in the browser this often. */
const KEEP_MS = 10_000;

/** Where the landscape shows the rider: the place, the cheat's line and lean (ADR 0045), the challenger. */
const shown = (at: ShownAt) => ({
  distance: at.distance,
  line: at.line,
  lean: at.lean,
  cheat: at.cheat,
  challenger: at.challenger,
});

export type RideOptions = {
  timeline: SessionTimeline | null;
  course: Course | null;
  sensors: Sensors;
  trainer: TrainerLink | null;
  beeps: Beeps;
  meta: RideMeta;
  /** Whose ride it is, for keeping it on this device; null for a trial, which is never kept. */
  keepFor: string | null;
  onFinished: (engine: RideEngine) => void;
};

/**
 * The ride engine in a page: made at the start, ticked, drawn, kept in
 * the browser, and connected to the trainer — whichever trainer is
 * connected now, so one connected again mid-ride gets the current target.
 * What the landscape showed on the way (ADR 0034) is counted here too,
 * and kept with the ride.
 */
export function useRide(options: RideOptions) {
  const engine = useRef<RideEngine | null>(null);
  const latest = useRef(options);
  const [live, setLive] = useState<Live | null>(null);
  const [running, setRunning] = useState(false);
  const seen = useRef<Seen>(nothingSeen());

  useEffect(() => {
    latest.current = options;
  });

  const draw = useCallback(() => {
    if (engine.current) setLive(engine.current.live(Date.now()));
  }, []);

  /**
   * Where the rider is, for the landscape, asked every frame: the figure
   * pedals at the measured cadence, or at an easy one when the landscape
   * moves and nothing measures the legs.
   */
  const moment = useCallback((now: number): Moment => {
    const ride = engine.current;
    if (!ride) return { distance: 0, speed: 0, cadence: 0, pause: null };
    const at = ride.positionAt(now);
    if (ride.status !== "riding") {
      const open = ride.status === "paused" ? ride.recording?.pauses.at(-1) : undefined;
      const pause =
        ride.recording && open && open.to === null
          ? {
              index: ride.recording.pauses.length - 1,
              seconds: Math.max(0, (now - ride.recording.startedAt) / 1000 - open.from),
            }
          : null;
      return { ...shown(at), speed: 0, cadence: 0, pause };
    }
    const cadence = latest.current.sensors.now(now).cadence;
    return {
      ...shown(at),
      speed: at.speed,
      cadence: cadence ?? (at.speed > 1 ? DRAWN_CADENCE : 0),
      pause: null,
    };
  }, []);

  /** Something the landscape showed: counted for "today's little things". */
  const note = useCallback((key: keyof Seen, count: number) => {
    seen.current = { ...seen.current, [key]: seen.current[key] + count };
  }, []);

  const start = useCallback(() => {
    const { timeline, course, sensors } = latest.current;
    if (!course || engine.current) return;
    const ride: RideEngine = new RideEngine(timeline, course, sensors, {
      target: (watts) => void latest.current.trainer?.target(watts).catch(() => undefined),
      cue: (kind) => latest.current.beeps.play(kind),
      finished: () => {
        setRunning(false);
        latest.current.onFinished(ride);
      },
    });
    engine.current = ride;
    ride.start(Date.now());
    setRunning(ride.status !== "finished");
    draw();
  }, [draw]);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => engine.current?.tick(Date.now()), TICK_MS);
    const paint = setInterval(draw, DRAW_MS);
    const keep = setInterval(() => {
      const { keepFor, meta } = latest.current;
      const recording = engine.current?.recording;
      if (keepFor && recording)
        keepRide(keepFor, { meta, recording, state: "riding", seen: seen.current });
    }, KEEP_MS);
    return () => {
      clearInterval(tick);
      clearInterval(paint);
      clearInterval(keep);
    };
  }, [running, draw]);

  // A trainer connected again mid-ride takes up the block where it is.
  const trainer = options.trainer;
  useEffect(() => {
    const ride = engine.current;
    if (ride && trainer && ride.status === "riding")
      void trainer.target(ride.live(Date.now()).target).catch(() => undefined);
  }, [trainer]);

  const act = useCallback(
    (action: (ride: RideEngine, now: number) => void) => {
      const ride = engine.current;
      if (!ride) return;
      action(ride, Date.now());
      draw();
    },
    [draw],
  );

  return {
    engine,
    live,
    moment,
    note,
    seen: () => seen.current,
    start,
    pause: () => act((ride, now) => ride.pause(now)),
    resume: () => act((ride, now) => ride.resume(now)),
    skip: () => act((ride, now) => ride.skip(now)),
    finish: () => act((ride, now) => ride.finish(now)),
    setIntensity: (value: number) => act((ride) => ride.setIntensity(value)),
    setErg: (on: boolean) => act((ride) => ride.setErg(on)),
    /** The challenger now (ADR 0049), wherever the rider is: the JOHAN code, and G under `next dev`. */
    challenge: () =>
      act((ride, now) =>
        ride.shown.race.begin(ride.positionAt(now).distance, ride.live(now).speed),
      ),
    /** Development only: times the rider's speed along the route, negative backwards. */
    setWarp: (factor: number) =>
      act((ride) => {
        ride.shown.warp.factor = factor;
      }),
    /** A cheat code typed (ADR 0045, 0048): on, off or over to the other; the page hears which is on. */
    toggleCheat: (mode: CheatMode): CheatMode | null => {
      const ride = engine.current;
      if (!ride) return null;
      const now = Date.now();
      const { speed, distance } = ride.live(now);
      ride.shown.cheat.toggle(speed, distance, mode, ride.positionAt(now).grade);
      draw();
      return ride.shown.cheat.state()?.mode ?? null;
    },
    /** What the cheat's keys hold now: faster or slower (more or fewer watts), left or right. */
    steerCheat: (throttle: Push, steer: Push) => engine.current?.shown.cheat.hold(throttle, steer),
    /** The WATT dial's buttons: a step, watts or watts per kilo, the avatar heavier or lighter. */
    tuneCheat: (change: WattTune) => {
      const dial = engine.current?.shown.cheat.dial;
      if (!dial) return;
      if (change === "unit") dial.toggleUnit();
      else if (change === "more" || change === "less") dial.step(change === "more" ? 1 : -1);
      else dial.weigh(change === "heavier" ? 1 : -1);
      draw();
    },
    /** A WATT button held up or down, or let go: it steps on as a held key does. */
    pushCheat: (push: Push) => {
      engine.current?.shown.cheat.dial.hold(push);
      draw();
    },
  };
}

export type Ride = ReturnType<typeof useRide>;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Course, SessionTimeline } from "@/modules/rulle";
import type { TrainerLink } from "../bluetooth/trainer-link";
import type { Moment } from "../scene/world";
import type { Beeps } from "./beeps";
import { RideEngine, type Live } from "./engine";
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
 */
export function useRide(options: RideOptions) {
  const engine = useRef<RideEngine | null>(null);
  const latest = useRef(options);
  const [live, setLive] = useState<Live | null>(null);
  const [running, setRunning] = useState(false);

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
    if (!ride) return { distance: 0, speed: 0, cadence: 0 };
    const at = ride.positionAt(now);
    if (ride.status !== "riding") return { distance: at.distance, speed: 0, cadence: 0 };
    const cadence = latest.current.sensors.now(now).cadence;
    return {
      distance: at.distance,
      speed: at.speed,
      cadence: cadence ?? (at.speed > 1 ? DRAWN_CADENCE : 0),
    };
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
      if (keepFor && recording) keepRide(keepFor, { meta, recording, state: "riding" });
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
    start,
    pause: () => act((ride, now) => ride.pause(now)),
    resume: () => act((ride, now) => ride.resume(now)),
    skip: () => act((ride, now) => ride.skip(now)),
    finish: () => act((ride, now) => ride.finish(now)),
    setIntensity: (value: number) => act((ride) => ride.setIntensity(value)),
    setErg: (on: boolean) => act((ride) => ride.setErg(on)),
  };
}

export type Ride = ReturnType<typeof useRide>;

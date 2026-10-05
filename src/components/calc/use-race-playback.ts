"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Each hour of the race takes this long on screen, within a whole that stays short. */
const MS_PER_HOUR = 1500;
const MIN_MS = 3000;
const MAX_MS = 8000;
/** Crank degrees a second at full cadence; a tired rider turns them slower (`cadence`). */
const CRANK_DEG_PER_S = 420;

/**
 * The race played once, on request: a progress from 0 at the start to 1
 * at the finish, and the cranks' angle, which turns as fast as `cadence`
 * says for the progress reached. Nothing moves until the reader asks, so
 * someone who has asked their device for less motion is never surprised.
 * Between runs the progress is null and the rider rests where the plan
 * puts them.
 */
export function useRacePlayback(hours: number, cadence: (progress: number) => number) {
  const [progress, setProgress] = useState<number | null>(null);
  const [crankDeg, setCrankDeg] = useState(-60);
  const frame = useRef<number | null>(null);
  const cadenceRef = useRef(cadence);

  useEffect(() => {
    cadenceRef.current = cadence;
  }, [cadence]);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setProgress(null);
  }, []);

  const play = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const duration = Math.min(MAX_MS, Math.max(MIN_MS, hours * MS_PER_HOUR));
    let start: number | null = null;
    let last: number | null = null;
    let crank = -60;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      crank += ((now - (last ?? now)) / 1000) * CRANK_DEG_PER_S * cadenceRef.current(t);
      last = now;
      setCrankDeg(crank % 360);
      if (t < 1) {
        setProgress(t);
        frame.current = requestAnimationFrame(step);
      } else {
        frame.current = null;
        setProgress(null);
      }
    };
    setProgress(0);
    frame.current = requestAnimationFrame(step);
  }, [hours]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return { progress, crankDeg, play, stop, playing: progress !== null };
}

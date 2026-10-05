"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long one turn of the pedals takes on screen. */
const DURATION_MS = 2600;

/** Slow off the mark and slow at the line, as a pedal turned by hand. */
const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One turn of the pedals as a progress from 0 to 1. It plays once when
 * the drawing first shows, and again on `play()`. Someone who has asked
 * their device for less motion sees the turn finished from the start and
 * only sees it move when they press play themselves. Between turns the
 * progress rests at 1, so a changed gear shows its whole distance at once.
 */
export function usePedalStroke() {
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const frame = useRef<number | null>(null);

  const play = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / DURATION_MS);
      setProgress(ease(t));
      setPlaying(t < 1);
      frame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!calm()) play();
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [play]);

  return { progress, playing, play };
}

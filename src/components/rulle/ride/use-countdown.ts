"use client";

import { useEffect, useRef, useState } from "react";
import type { Beeps } from "./beeps";

/** Seconds counted down before the first pedal stroke. */
export const COUNTDOWN = 3;

/**
 * The countdown before a ride (ADR 0033): three, two, one, a beep at each,
 * and then `onGo`. The seconds left, while it runs; 0 when it is not.
 */
export function useCountdown(counting: boolean, beeps: Beeps, onGo: () => void): number {
  const [count, setCount] = useState(counting ? COUNTDOWN : 0);
  const go = useRef(onGo);

  useEffect(() => {
    go.current = onGo;
  });

  useEffect(() => {
    if (!counting) return;
    let left = COUNTDOWN;
    beeps.play("count");
    const timer = setInterval(() => {
      left -= 1;
      setCount(left);
      if (left > 0) beeps.play("count");
      else {
        clearInterval(timer);
        go.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [counting, beeps]);

  return count;
}

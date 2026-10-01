"use client";

import { useEffect, useRef, useState } from "react";
import type { Beeps } from "./beeps";
import type { Push } from "./cheat";

/**
 * The cheat code on the ride screen (ADR 0045): typed — SPURT, none of its
 * letters a key of the ride's — or five quick taps on the rider, and a
 * fanfare; then W/S or ↑/↓ for the speed and A/D or ←/→ to steer, held
 * down, while the arrows leave the session alone. Typed or tapped again,
 * and it is off.
 */

const CODE = "spurt";
/** Seconds the letters of the code may take, and the taps. */
const TYPE_WITHIN = 2.5;
const TAPS = 5;
const TAP_WITHIN = 2.5;
/** Seconds the banner stays up after the code is in. */
const BANNER = 4.5;

const UP = ["w", "arrowup"];
const DOWN = ["s", "arrowdown"];
const LEFT = ["a", "arrowleft"];
const RIGHT = ["d", "arrowright"];

type Controls = {
  /** Turns the cheat on or off: whether it is on now. */
  toggleCheat: () => boolean;
  steerCheat: (throttle: Push, steer: Push) => void;
};

export function useCheat(active: boolean, on: boolean, ride: Controls, beeps: Beeps) {
  const [banner, setBanner] = useState(false);
  const latest = useRef({ active, on, ride, beeps });
  const taps = useRef<number[]>([]);

  useEffect(() => {
    latest.current = { active, on, ride, beeps };
  });

  const toggle = () => {
    const now = latest.current.ride.toggleCheat();
    latest.current.beeps.play(now ? "fanfare" : "fanfareOff");
    setBanner(now);
  };
  const toggleRef = useRef(toggle);
  useEffect(() => {
    toggleRef.current = toggle;
  });

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(false), BANNER * 1000);
    return () => clearTimeout(timer);
  }, [banner]);

  // The code typed, and the keys held while it is on.
  useEffect(() => {
    let typed: { key: string; at: number }[] = [];
    const held = new Set<string>();
    const push = () => {
      const has = (keys: string[]) => keys.some((k) => held.has(k));
      const throttle = ((has(UP) ? 1 : 0) - (has(DOWN) ? 1 : 0)) as Push;
      const steer = ((has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0)) as Push;
      latest.current.ride.steerCheat(throttle, steer);
    };
    const down = (event: KeyboardEvent) => {
      const { active: on, on: cheating } = latest.current;
      if (!on || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (cheating && [...UP, ...DOWN, ...LEFT, ...RIGHT].includes(key)) {
        event.preventDefault();
        held.add(key);
        push();
      }
      if (key.length !== 1) return;
      const at = event.timeStamp / 1000;
      typed = [...typed.filter((t) => at - t.at < TYPE_WITHIN), { key, at }].slice(-CODE.length);
      if (typed.map((t) => t.key).join("") === CODE) {
        typed = [];
        held.clear();
        toggleRef.current();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (held.delete(event.key.toLowerCase())) push();
    };
    // Keys let go while the window was elsewhere would be held for ever.
    const blur = () => {
      held.clear();
      push();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /** A tap on the rider: the fifth in quick succession turns the cheat on or off. */
  const tap = () => {
    if (!latest.current.active) return;
    const now = performance.now() / 1000;
    taps.current = [...taps.current.filter((t) => now - t < TAP_WITHIN), now];
    if (taps.current.length < TAPS) return;
    taps.current = [];
    toggleRef.current();
  };

  return { banner, toggle, tap };
}

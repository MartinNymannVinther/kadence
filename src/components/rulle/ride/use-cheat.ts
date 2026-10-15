"use client";

import { useEffect, useRef, useState } from "react";
import type { Rival } from "@/modules/rulle";
import type { Beeps } from "./beeps";
import type { CheatMode, Push } from "./cheat";

/**
 * The cheat codes on the ride screen (ADR 0045, 0073, 0074): typed —
 * SPURT or WATT — or five quick taps on the rider for SPURT, and a
 * fanfare; then W/S or ↑/↓ for the speed, or on WATT for the watts, and
 * A/D or ←/→ to steer, held down, while the arrows leave the session
 * alone. The same code again, or five more taps, and it is off; the other
 * code goes over to it. RIVAL calls the challenger up at once, on a free
 * ride, and TURBO the sprinter (ADR 0075); in a session they do nothing.
 *
 * A letter that carries on a code being typed is the code's: the I in
 * RIVAL does not change the screen. This hook's keys are heard before the
 * ride's (`useRideKeys`), being called first on the ride screen.
 */

const CODES: Record<string, CheatMode | Rival> = {
  spurt: "speed",
  watt: "watts",
  rival: "challenger",
  turbo: "sprinter",
};

/** Whether `letters` end two letters or more into a code, and short of its end. */
const midCode = (letters: string) =>
  Object.keys(CODES).some((code) =>
    Array.from({ length: code.length - 2 }, (_, i) => code.slice(0, i + 2)).some((start) =>
      letters.endsWith(start),
    ),
  );
const LONGEST = Math.max(...Object.keys(CODES).map((code) => code.length));
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
  /** A code typed: which is on now, if any. */
  toggleCheat: (mode: CheatMode) => CheatMode | null;
  steerCheat: (throttle: Push, steer: Push) => void;
  /** The challenger or the sprinter, now (ADR 0074, 0075). */
  challenge: (who: Rival) => void;
};

/** `on`: the code that is on, null for none. */
export function useCheat(active: boolean, on: CheatMode | null, ride: Controls, beeps: Beeps) {
  const [banner, setBanner] = useState<CheatMode | null>(null);
  const latest = useRef({ active, on, ride, beeps });
  const taps = useRef<number[]>([]);

  useEffect(() => {
    latest.current = { active, on, ride, beeps };
  });

  /** A code typed, or the one that is on to turn it off. */
  const toggle = (mode: CheatMode | null = latest.current.on) => {
    if (!mode) return;
    const now = latest.current.ride.toggleCheat(mode);
    latest.current.beeps.play(now ? "fanfare" : "fanfareOff");
    setBanner(now);
  };
  const toggleRef = useRef(toggle);
  useEffect(() => {
    toggleRef.current = toggle;
  });

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), BANNER * 1000);
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
      typed = [...typed.filter((t) => at - t.at < TYPE_WITHIN), { key, at }].slice(-LONGEST);
      const letters = typed.map((t) => t.key).join("");
      const code = Object.keys(CODES).find((c) => letters.endsWith(c));
      if (!code) {
        if (midCode(letters)) event.stopImmediatePropagation();
        return;
      }
      event.stopImmediatePropagation();
      typed = [];
      held.clear();
      latest.current.ride.steerCheat(0, 0);
      const what = CODES[code]!;
      if (what === "challenger" || what === "sprinter") latest.current.ride.challenge(what);
      else toggleRef.current(what);
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

  /** A tap on the rider: the fifth in quick succession turns SPURT on, or whichever is on off. */
  const tap = () => {
    if (!latest.current.active) return;
    const now = performance.now() / 1000;
    taps.current = [...taps.current.filter((t) => now - t < TAP_WITHIN), now];
    if (taps.current.length < TAPS) return;
    taps.current = [];
    toggleRef.current(latest.current.on ?? "speed");
  };

  return { banner, toggle, tap };
}

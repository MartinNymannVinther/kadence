import type { Heard } from "@/modules/rulle";
import { Ambience } from "./ambience";

/**
 * What a rider hears when the eyes are on the road: three short beeps as a
 * block runs out, a longer one when the next begins, and two at the end;
 * and the small things (ADR 0034) — a cowbell near the end of a hard
 * block and on the chalk climb, the ring-ring of a cargo bike's bell
 * before it overtakes, and on race day a marshal's whistle at an island
 * (ADR 0036) and the horn of a marshal's motorbike coming past (ADR
 * 0037); all of it over the sound under the ride (`ambience.ts`, ADR
 * 0045), so none comes out of silence. Made by the browser's own sound
 * (Web Audio), no sound files; one press on M quiets all of it. Browsers
 * only let sound start from a press, so `unlock` is called from the one
 * that starts the ride; the sound under it runs while the ride's screen
 * is up (`listen`, `hush`).
 */

type Tone = { hz: number; seconds: number; at: number };

export type Sound =
  "count" | "change" | "end" | "cheer" | "bell" | "whistle" | "horn" | "fanfare" | "fanfareOff";

const TONES: Record<"count" | "change" | "end", Tone[]> = {
  count: [{ hz: 880, seconds: 0.12, at: 0 }],
  change: [{ hz: 1320, seconds: 0.4, at: 0 }],
  end: [
    { hz: 1320, seconds: 0.25, at: 0 },
    { hz: 1760, seconds: 0.45, at: 0.3 },
  ],
};

export class Beeps {
  private context: AudioContext | null = null;
  private ambience: Ambience | null = null;
  private quiet = false;

  get muted(): boolean {
    return this.quiet;
  }

  setMuted(muted: boolean): void {
    this.quiet = muted;
    this.ambience?.setMuted(muted);
  }

  /** What the rider would hear of the road now, for the sound under the ride. */
  hear(heard: Heard): void {
    this.ambience?.hear(heard);
  }

  /** The ride's screen is up: the sound under the ride fades in. */
  listen(): void {
    if (this.context && !this.ambience) this.ambience = new Ambience(this.context, this.quiet);
  }

  /** The ride's screen is gone: the sound under it fades away. */
  hush(): void {
    this.ambience?.hush();
    this.ambience = null;
  }

  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.context) {
      const Context =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
    }
    void this.context.resume().catch(() => undefined);
  }

  play(kind: Sound): void {
    const context = this.context;
    if (this.quiet || !context || context.state !== "running") return;
    if (kind === "cheer") return cowbell(context);
    if (kind === "bell") return bell(context);
    if (kind === "whistle") return whistle(context);
    if (kind === "horn") return horn(context);
    if (kind === "fanfare") return arcade(context, [523, 659, 784, 1047], 0.09);
    if (kind === "fanfareOff") return arcade(context, [784, 523], 0.12);
    for (const tone of TONES[kind]) {
      const start = context.currentTime + tone.at;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone.hz;
      // A soft edge at both ends: a square start clicks.
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.015);
      gain.gain.linearRampToValueAtTime(0, start + tone.seconds);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.seconds + 0.02);
    }
  }
}

/**
 * A cowbell shaken by someone at the roadside: four quick knocks. Two
 * square waves a fifth-ish apart through a band-pass, dying fast — the
 * old drum machines' recipe for a cowbell.
 */
function cowbell(context: AudioContext): void {
  for (let k = 0; k < 4; k++) {
    const start = context.currentTime + k * 0.16;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1100;
    filter.Q.value = 0.9;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.06, start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    filter.connect(gain).connect(context.destination);
    for (const hz of [540, 800]) {
      const oscillator = context.createOscillator();
      oscillator.type = "square";
      oscillator.frequency.value = hz;
      oscillator.connect(filter);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    }
  }
}

/** A bicycle bell, rung twice: a few metallic partials that ring out. */
function bell(context: AudioContext): void {
  const partials: [number, number][] = [
    [2350, 0.16],
    [3890, 0.07],
    [5620, 0.035],
  ];
  for (const at of [0, 0.22]) {
    const start = context.currentTime + at;
    for (const [hz, level] of partials) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = hz;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.75);
    }
  }
}

/**
 * A marshal's whistle, two short blasts: a high tone warbling fast, as
 * the pea in a whistle makes it, soft at both ends.
 */
function whistle(context: AudioContext): void {
  for (const [at, seconds] of [
    [0, 0.18],
    [0.26, 0.32],
  ] as const) {
    const start = context.currentTime + at;
    const oscillator = context.createOscillator();
    const trill = context.createOscillator();
    const depth = context.createGain();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 2900;
    trill.frequency.value = 28;
    depth.gain.value = 160;
    trill.connect(depth).connect(oscillator.frequency);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.075, start + 0.04);
    gain.gain.setValueAtTime(0.075, start + seconds - 0.04);
    gain.gain.linearRampToValueAtTime(0, start + seconds);
    oscillator.connect(gain).connect(context.destination);
    for (const o of [oscillator, trill]) {
      o.start(start);
      o.stop(start + seconds + 0.02);
    }
  }
}

/**
 * A motorbike's horn, twice and short: two tones a little apart, buzzing,
 * their edge taken off and swelling in rather than snapping on — a hoot
 * from behind, not a fright.
 */
function horn(context: AudioContext): void {
  const soft = context.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 1700;
  soft.connect(context.destination);
  for (const at of [0, 0.22]) {
    const start = context.currentTime + at;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.055, start + 0.035);
    gain.gain.setValueAtTime(0.055, start + 0.11);
    gain.gain.linearRampToValueAtTime(0, start + 0.15);
    gain.connect(soft);
    for (const hz of [415, 523]) {
      const oscillator = context.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = hz;
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.17);
    }
  }
}

/**
 * The cheat code's fanfare (ADR 0045), as an old arcade machine played
 * it: quick square-wave notes up the chord as it comes on, two down as it
 * goes off, softened so they chirp rather than buzz.
 */
function arcade(context: AudioContext, notes: number[], step: number): void {
  const soft = context.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 2600;
  soft.connect(context.destination);
  notes.forEach((hz, k) => {
    const start = context.currentTime + k * step;
    const last = k === notes.length - 1;
    const long = last ? 0.28 : step * 0.9;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.045, start + 0.01);
    gain.gain.setValueAtTime(0.045, start + long - 0.03);
    gain.gain.linearRampToValueAtTime(0, start + long);
    oscillator.connect(gain).connect(soft);
    oscillator.start(start);
    oscillator.stop(start + long + 0.02);
  });
}

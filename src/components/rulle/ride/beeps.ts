/**
 * What a rider hears when the eyes are on the road: three short beeps as a
 * block runs out, a longer one when the next begins, and two at the end.
 * Made by the browser's own sound (Web Audio), no sound files. Browsers
 * only let sound start from a press, so `unlock` is called from the one
 * that starts the ride.
 */

type Tone = { hz: number; seconds: number; at: number };

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
  private quiet = false;

  get muted(): boolean {
    return this.quiet;
  }

  setMuted(muted: boolean): void {
    this.quiet = muted;
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

  play(kind: keyof typeof TONES): void {
    const context = this.context;
    if (this.quiet || !context || context.state !== "running") return;
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

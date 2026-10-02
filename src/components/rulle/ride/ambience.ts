import { mixOf, type Heard } from "@/modules/rulle";

/**
 * The sound under the ride (ADR 0045), so a hoot or a whistle never comes
 * out of silence: the tyres on the road and the wind, louder with speed;
 * a bird now and then in the country; a town's or a city's hum; on race
 * day the crowd's murmur, and cheering at the finish. How loud each part
 * is comes from `mixOf`, told four times a second what the rider would
 * hear (`hear`). Made by the browser's own sound (Web Audio) from looped
 * noise and a few short tones, no sound files. It fades in as the ride
 * counts down, out when it ends, and M quiets it with the rest.
 */

/** The whole sound's level, against the beeps' quarter. */
const LEVEL = 1.4;
/** Seconds a change takes to settle, roughly: no level jumps. */
const SMOOTH = 0.3;
/** Seconds of noise looped. */
const LOOP = 4;

type Band = { filter: BiquadFilterNode; gain: GainNode };

export class Ambience {
  private readonly master: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly road: Band;
  private readonly wind: Band;
  private readonly gust: GainNode;
  private readonly hum: Band;
  private readonly traffic: Band;
  private readonly crowd: Band;
  private readonly murmur: GainNode;
  private readonly cheer: Band;
  private nextBird = 0;
  private nextCheer = 0;

  constructor(
    private readonly context: AudioContext,
    muted: boolean,
  ) {
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);
    const pink = noise(context, "pink");
    const brown = noise(context, "brown");
    this.road = this.band(brown, "lowpass", 300, 0.7);
    this.wind = this.band(pink, "bandpass", 700, 0.6);
    this.hum = this.band(brown, "lowpass", 160, 0.7);
    this.traffic = this.band(pink, "bandpass", 420, 0.5);
    this.crowd = this.band(pink, "bandpass", 750, 0.7);
    this.cheer = this.band(pink, "bandpass", 1300, 0.9);
    // Gusts: the wind rises and falls slowly; the crowd's murmur swells and ebbs.
    this.gust = this.wobble(0.11, this.wind.gain.gain);
    this.murmur = this.wobble(0.37, this.crowd.gain.gain);
    // Fades in over the countdown.
    if (!muted) this.master.gain.setTargetAtTime(LEVEL, context.currentTime, 1);
  }

  /** What the rider hears now: every part eased to its new level. */
  hear(heard: Heard): void {
    const mix = mixOf(heard);
    const now = this.context.currentTime;
    const ease = (param: AudioParam, value: number) => param.setTargetAtTime(value, now, SMOOTH);
    ease(this.road.gain.gain, mix.road.gain);
    ease(this.road.filter.frequency, mix.road.cutoff);
    ease(this.wind.gain.gain, mix.wind.gain);
    ease(this.wind.filter.frequency, mix.wind.centre);
    ease(this.gust.gain, mix.wind.gain * 0.35);
    ease(this.hum.gain.gain, mix.hum);
    ease(this.traffic.gain.gain, mix.traffic);
    ease(this.crowd.gain.gain, mix.crowd);
    ease(this.murmur.gain, mix.crowd * 0.35);
    if (mix.birds !== null && now >= this.nextBird) {
      if (this.nextBird > 0) song(this.context, this.master);
      this.nextBird = now + mix.birds * (0.5 + Math.random());
    }
    if (mix.cheers && now >= this.nextCheer) {
      this.swell(mix.crowd);
      this.nextCheer = now + 3 + Math.random() * 4;
    }
  }

  setMuted(muted: boolean): void {
    this.master.gain.setTargetAtTime(muted ? 0 : LEVEL, this.context.currentTime, 0.05);
  }

  /** The ride is over: fades out, then stops. */
  hush(): void {
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(0, now, 0.3);
    for (const source of this.sources) source.stop(now + 1.5);
    setTimeout(() => this.master.disconnect(), 1600);
  }

  /** Noise looped through a filter and a gain into the whole: one part of the sound. */
  private band(buffer: AudioBuffer, type: BiquadFilterType, hz: number, q: number): Band {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = hz;
    filter.Q.value = q;
    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.master);
    // Each part starts somewhere else in the loop, so no two move together.
    source.start(this.context.currentTime, Math.random() * LOOP);
    this.sources.push(source);
    return { filter, gain };
  }

  /** A slow swing added to a level; how deep it swings is the returned gain's. */
  private wobble(hz: number, param: AudioParam): GainNode {
    const oscillator = this.context.createOscillator();
    oscillator.frequency.value = hz;
    const depth = this.context.createGain();
    depth.gain.value = 0;
    oscillator.connect(depth).connect(param);
    oscillator.start();
    this.sources.push(oscillator);
    return depth;
  }

  /** The crowd at the finish cheering up for a moment, and back. */
  private swell(level: number): void {
    const now = this.context.currentTime;
    const gain = this.cheer.gain.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(level * 0.7, now, 0.15);
    gain.setTargetAtTime(0, now + 0.8, 0.5);
  }
}

/**
 * Seconds of noise, the start and the end blended so the loop has no seam:
 * pink for the wind, the crowd and the far traffic; brown, deeper, for the
 * tyres and the hum.
 */
function noise(context: AudioContext, colour: "pink" | "brown"): AudioBuffer {
  const length = Math.floor(context.sampleRate * LOOP);
  const blend = Math.floor(context.sampleRate * 0.1);
  const raw = new Float32Array(length + blend);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let last = 0;
  for (let i = 0; i < raw.length; i++) {
    const white = Math.random() * 2 - 1;
    if (colour === "brown") {
      last = (last + 0.02 * white) / 1.02;
      raw[i] = last * 3.5;
      continue;
    }
    // Paul Kellet's filter: white noise falling 3 dB an octave.
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const f = i < blend ? i / blend : 1;
    // The loop's start fades from what follows its end, so the end runs on into it.
    data[i] = raw[i]! * f + (i < blend ? raw[length + i]! * (1 - f) : 0);
  }
  return buffer;
}

/** A bird somewhere off to one side: a few quick notes, sweeping up or down. */
function song(context: AudioContext, out: AudioNode): void {
  const pan = context.createStereoPanner?.();
  const into: AudioNode = pan ?? out;
  if (pan) {
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(out);
  }
  const base = 2600 + Math.random() * 1800;
  const up = Math.random() < 0.5;
  const notes = 3 + Math.floor(Math.random() * 4);
  let at = context.currentTime + 0.05;
  for (let k = 0; k < notes; k++) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const hz = base * (1 + (Math.random() - 0.5) * 0.15);
    const long = 0.05 + Math.random() * 0.08;
    oscillator.frequency.setValueAtTime(up ? hz : hz * 1.3, at);
    oscillator.frequency.exponentialRampToValueAtTime(up ? hz * 1.35 : hz * 0.9, at + long);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.018, at + 0.01);
    gain.gain.linearRampToValueAtTime(0, at + long);
    oscillator.connect(gain).connect(into);
    oscillator.start(at);
    oscillator.stop(at + long + 0.02);
    at += long + 0.04 + Math.random() * 0.1;
  }
}

import { Bytes } from "./bytes";

/**
 * The Cycling Power Service's measurement (0x2A63): what a trainer that
 * cannot be controlled, or a power meter on the bike, reports. The watts
 * are always there; the crank's revolutions, when the flags say so, give
 * the cadence. The optional fields before them are read past in the order
 * the specification lists them (Cycling Power Service 1.1, 3.2).
 * Pure.
 */

export type PowerMeasurement = {
  power: number;
  /** Cumulative crank revolutions (wraps at 65,536) and the last crank event, in 1/1024 s (wraps). */
  crank?: { revolutions: number; eventTime: number };
};

export function parsePowerMeasurement(view: DataView): PowerMeasurement | null {
  const bytes = new Bytes(view);
  const flags = bytes.u16();
  const power = bytes.s16();
  if (flags === undefined || power === undefined) return null;
  const has = (bit: number) => (flags & (1 << bit)) !== 0;
  if (has(0)) bytes.skip(1); // pedal power balance
  if (has(2)) bytes.skip(2); // accumulated torque
  if (has(4)) bytes.skip(6); // wheel revolutions (uint32) and last wheel event (uint16)
  const out: PowerMeasurement = { power: power >= 0 && power <= 3000 ? power : 0 };
  if (has(5)) {
    const revolutions = bytes.u16();
    const eventTime = bytes.u16();
    if (revolutions !== undefined && eventTime !== undefined)
      out.crank = { revolutions, eventTime };
  }
  return out;
}

/** Seconds without a new crank revolution after which the rider has stopped pedalling. */
export const CADENCE_STALE_SECONDS = 3;

/**
 * Cadence from successive crank readings: revolutions over the time
 * between the two last crank events, both counters wrapping at 16 bits.
 * A reading that repeats the last event says nothing new; one that has
 * said nothing new for `CADENCE_STALE_SECONDS` means the legs stopped.
 */
export class CrankCadence {
  private last: { revolutions: number; eventTime: number; at: number } | null = null;
  private rpm: number | null = null;

  /** The cadence after this reading, at `nowMs`. */
  update(crank: { revolutions: number; eventTime: number }, nowMs: number): number | null {
    const prev = this.last;
    if (!prev) {
      this.last = { ...crank, at: nowMs };
      return null;
    }
    const revolutions = (crank.revolutions - prev.revolutions + 0x10000) % 0x10000;
    const ticks = (crank.eventTime - prev.eventTime + 0x10000) % 0x10000;
    if (revolutions === 0 || ticks === 0) {
      if (nowMs - prev.at > CADENCE_STALE_SECONDS * 1000) this.rpm = 0;
      return this.rpm;
    }
    const rpm = (revolutions * 60 * 1024) / ticks;
    this.last = { ...crank, at: nowMs };
    // A burst of revolutions after a dropped connection is no cadence anyone rides.
    if (rpm <= 250) this.rpm = Math.round(rpm);
    return this.rpm;
  }
}

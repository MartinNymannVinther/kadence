import type { SensorReading } from "../bluetooth/trainer-link";

/**
 * The latest from every sensor, with the moment it came: what the ride
 * records once a second and the screen shows a few times a second. A value
 * older than its channel's patience is no value — a trainer that went
 * quiet is not still putting out 250 W — and the pulse of a strap wins
 * over the pulse a trainer passes on, since the strap is on the rider.
 */

export const FRESH_MS = { power: 3000, cadence: 3000, heartRate: 5000 } as const;
/** The watts on the screen and in the on-target verdict: the last three seconds, averaged. */
export const POWER_AVERAGE_MS = 3000;

type Stamp = { value: number; at: number };

export type SensorsNow = {
  power: number | null;
  power3s: number | null;
  cadence: number | null;
  heartRate: number | null;
};

export class Sensors {
  private powers: Stamp[] = [];
  private cadence: Stamp | null = null;
  private trainerHr: Stamp | null = null;
  private strapHr: Stamp | null = null;
  /** Which channels have ever reported: a ride with no power source is ridden on the clock. */
  readonly seen = { power: false, cadence: false, heartRate: false };

  fromTrainer(reading: SensorReading, at: number): void {
    if (reading.power !== undefined) {
      this.powers.push({ value: reading.power, at });
      this.powers = this.powers.filter((p) => at - p.at <= POWER_AVERAGE_MS);
      this.seen.power = true;
    }
    if (reading.cadence !== undefined) {
      this.cadence = { value: reading.cadence, at };
      this.seen.cadence = true;
    }
    if (reading.heartRate !== undefined) {
      this.trainerHr = { value: reading.heartRate, at };
      this.seen.heartRate = true;
    }
  }

  fromStrap(bpm: number, at: number): void {
    this.strapHr = { value: bpm, at };
    this.seen.heartRate = true;
  }

  now(at: number): SensorsNow {
    const fresh = (stamp: Stamp | null, patience: number) =>
      stamp && at - stamp.at <= patience ? stamp.value : null;
    const last = this.powers.at(-1) ?? null;
    const window = this.powers.filter((p) => at - p.at <= POWER_AVERAGE_MS);
    return {
      power: fresh(last, FRESH_MS.power),
      power3s:
        window.length > 0
          ? Math.round(window.reduce((s, p) => s + p.value, 0) / window.length)
          : null,
      cadence: fresh(this.cadence, FRESH_MS.cadence),
      heartRate:
        fresh(this.strapHr, FRESH_MS.heartRate) ?? fresh(this.trainerHr, FRESH_MS.heartRate),
    };
  }
}

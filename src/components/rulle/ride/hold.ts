/**
 * What the trainer is asked to hold, how hard the session is ridden, and
 * when legs that stop pause it (ADR 0033, 0107). No React and no browser
 * in it; the engine uses these.
 *
 * - `INTENSITY` is the rider's own dial on the session: the block's watts
 *   and the band that counts as on target, both times it — 90 % on a day
 *   the legs are bad, up to 120 %.
 * - `ErgEase` lets ERG go a little when the cadence has collapsed: a
 *   trainer holding 300 W against a crank turning at 40 rpm is a wall,
 *   and the rider never gets back up it (the "ERG spiral"). Below
 *   `belowRpm` for `afterSeconds`, the target is lowered to `share` of the
 *   block's watts, and held there until the cadence has been back above
 *   `backAtRpm` for `backAfterSeconds`. The riding apps ease in much the
 *   same way (Zwift's ERG mode, Wahoo's "ERG mode easing"); the numbers
 *   here are Rulle's own, chosen so that a deliberate low-cadence block at
 *   55–60 rpm is left alone and a stall is caught within three seconds.
 */

export const INTENSITY = { min: 0.5, max: 1.2, step: 0.05 } as const;

export const AUTO_PAUSE_SECONDS = 3;
const RESUME_WATTS = 30;
const RESUME_CADENCE = 20;

type Legs = { power: number | null; cadence: number | null };

/** Legs that stop pause the ride by themselves, and legs that start go on with it. */
export class Idle {
  private since: number | null = null;

  /** A second with neither watts nor a turning crank; true once it has been `AUTO_PAUSE_SECONDS`. */
  stopped(now: number, live: Legs, seen: { power: boolean; cadence: boolean }): boolean {
    if (!seen.power && !seen.cadence) return false;
    const idle = (live.power ?? 0) <= 0 && (live.cadence ?? 0) <= 0;
    if (!idle) this.since = null;
    else if (this.since === null) this.since = now;
    else if (now - this.since >= AUTO_PAUSE_SECONDS * 1000) return true;
    return false;
  }

  moving(live: Legs): boolean {
    return (live.power ?? 0) >= RESUME_WATTS || (live.cadence ?? 0) >= RESUME_CADENCE;
  }

  reset(): void {
    this.since = null;
  }
}

export const ERG_EASE = {
  belowRpm: 50,
  afterSeconds: 3,
  backAtRpm: 60,
  backAfterSeconds: 2,
  /** The share of the block's watts the trainer holds while eased. */
  share: 0.6,
} as const;

export class ErgEase {
  eased = false;
  private slow = 0;
  private back = 0;

  /**
   * One second ridden at this cadence (null when nothing measures it),
   * while `holding` says whether ERG has watts to hold. Returns whether
   * the ease changed, so the caller sets the trainer again.
   */
  second(cadence: number | null, holding: boolean): boolean {
    if (!holding || cadence === null) return this.reset();
    const was = this.eased;
    if (cadence < ERG_EASE.belowRpm) {
      this.slow += 1;
      this.back = 0;
      if (this.slow >= ERG_EASE.afterSeconds) this.eased = true;
    } else {
      this.slow = 0;
      if (cadence >= ERG_EASE.backAtRpm) this.back += 1;
      if (this.back >= ERG_EASE.backAfterSeconds) this.eased = false;
    }
    return this.eased !== was;
  }

  reset(): boolean {
    const was = this.eased;
    this.eased = false;
    this.slow = 0;
    this.back = 0;
    return was;
  }

  /** The watts to hold: the block's, or the eased share of them. */
  hold(watts: number | null): number | null {
    if (watts === null) return null;
    return this.eased ? Math.round(watts * ERG_EASE.share) : watts;
  }
}

/** The least and the most the session was turned to on the way, as shares of what was written. */
export class IntensityUsed {
  low = 1;
  high = 1;

  note(intensity: number): void {
    this.low = Math.min(this.low, intensity);
    this.high = Math.max(this.high, intensity);
  }
}

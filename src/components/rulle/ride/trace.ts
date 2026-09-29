/** The power line under the bar: one average per this many seconds of the plan. */
export const TRACE_SECONDS = 5;

/**
 * The watts ridden, averaged over each stretch of `TRACE_SECONDS` of the
 * plan, for the line drawn over the session's bar. Indexed by the plan's
 * time, so a skipped block leaves a gap in the line rather than a jump.
 */
export class PowerTrace {
  readonly values: (number | null)[] = [];
  private slot = -1;
  private sum = 0;
  private count = 0;

  add(second: number, power: number | null): void {
    const slot = Math.floor(second / TRACE_SECONDS);
    if (slot !== this.slot) {
      this.slot = slot;
      this.sum = 0;
      this.count = 0;
    }
    if (power === null) return;
    this.sum += power;
    this.count += 1;
    this.values[slot] = Math.round(this.sum / this.count);
  }
}

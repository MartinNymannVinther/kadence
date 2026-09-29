/**
 * The session's clock: seconds into the plan, which run while the rider
 * rides and stand still in a pause, and jump when the rider skips to the
 * next block. Read from the wall clock every time rather than counted in
 * ticks, so a timer the browser runs late never puts the plan behind.
 * Immutable: every change is a new clock. Pure.
 */

export type Clock = {
  startedAt: number;
  /** When the current pause began, or null while riding. */
  pausedAt: number | null;
  /** Milliseconds paused before the current pause. */
  pausedMs: number;
  /** Seconds added by skipping ahead. */
  skipped: number;
};

export function startClock(now: number): Clock {
  return { startedAt: now, pausedAt: null, pausedMs: 0, skipped: 0 };
}

/** Seconds into the plan, with fractions. */
export function planSecond(clock: Clock, now: number): number {
  const end = clock.pausedAt ?? now;
  return Math.max(0, (end - clock.startedAt - clock.pausedMs) / 1000) + clock.skipped;
}

/** Seconds ridden, pauses left out and skips not counted: what the rider actually did. */
export function riddenSeconds(clock: Clock, now: number): number {
  return planSecond(clock, now) - clock.skipped;
}

export function pauseClock(clock: Clock, now: number): Clock {
  return clock.pausedAt === null ? { ...clock, pausedAt: now } : clock;
}

export function resumeClock(clock: Clock, now: number): Clock {
  if (clock.pausedAt === null) return clock;
  return { ...clock, pausedAt: null, pausedMs: clock.pausedMs + (now - clock.pausedAt) };
}

/** The clock that reads `second` now: a skip ahead to the start of the next block. */
export function skipTo(clock: Clock, now: number, second: number): Clock {
  const ahead = second - planSecond(clock, now);
  return ahead > 0 ? { ...clock, skipped: clock.skipped + ahead } : clock;
}

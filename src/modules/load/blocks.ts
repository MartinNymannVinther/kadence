import { addDaysIso } from "@/core/dates";
import type { WeeklyCorridor } from "@/modules/dcu/hours";
import { guardrails, type Flag } from "./guardrails";

/**
 * A training block before it goes into a calendar (ADR 0025): what each
 * of its weeks would come to for one rider — hours on the bike, strength
 * sessions and their days — and the guardrails' word on it against DCU's
 * corridor, the rider's recent weeks and the 48 hours between strength
 * sessions. Shown to the coach before the block is applied; never
 * enforced (CLAUDE.md, guardrails not bans).
 *
 * Pure: imports nothing from the database.
 */

export type BlockItem = { day: number; templateId: string };
export type BlockTemplate = { id: string; sport: string; plannedMinutes: number };

export type BlockWeek = {
  week: number;
  bikeHours: number;
  strengthSessions: number;
  sessions: number;
  /** Days (0-based from the block's first Monday) with a strength session. */
  strengthDays: number[];
};

export function blockWeeks(
  weeks: number,
  items: readonly BlockItem[],
  templates: readonly BlockTemplate[],
): BlockWeek[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  return Array.from({ length: weeks }, (_, week) => {
    const mine = items.filter((i) => Math.floor(i.day / 7) === week);
    const rows = mine.flatMap((i) => {
      const t = byId.get(i.templateId);
      return t ? [{ day: i.day, ...t }] : [];
    });
    return {
      week,
      bikeHours: rows
        .filter((r) => r.sport === "bike")
        .reduce((s, r) => s + r.plannedMinutes / 60, 0),
      strengthSessions: rows.filter((r) => r.sport === "strength").length,
      sessions: rows.length,
      strengthDays: [...new Set(rows.filter((r) => r.sport === "strength").map((r) => r.day))].sort(
        (a, b) => a - b,
      ),
    };
  });
}

export type WeekPreview = BlockWeek & {
  monday: string;
  corridor: WeeklyCorridor | null;
  flags: Flag[];
};

/**
 * The block's weeks for one rider from `startMonday`: the corridor for
 * each week (given per week, since the month changes), the rider's weeks
 * before the block for the ramp, and the guardrails' flags per week — the
 * ramp read against the block's own earlier weeks once inside it.
 */
export function previewWeeks(
  weeks: readonly BlockWeek[],
  startMonday: string,
  corridorFor: (monday: string) => WeeklyCorridor | null,
  previousWeeksHours: readonly number[],
): WeekPreview[] {
  const history = [...previousWeeksHours];
  return weeks.map((w) => {
    const monday = addDaysIso(startMonday, 7 * w.week);
    const corridor = corridorFor(monday);
    const flags = guardrails({
      bikeHours: w.bikeHours,
      corridor,
      previousWeeksHours: history.slice(-4),
      strengthDates: w.strengthDays.map((d) => addDaysIso(startMonday, d)),
    });
    history.push(w.bikeHours);
    return { ...w, monday, corridor, flags };
  });
}

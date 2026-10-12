import type { PlanItem } from "./types";

/**
 * Moving a session of the week plan to another day (ADR 0059, amended
 * 2026-10-12): by dragging it, or by "Flyt til" on its card. The plan
 * keeps no order within a day — a day's sessions are shown by start time
 * — so a moved session joins the end of the list and takes its place by
 * its time. Pure, so the planner, its undo and the tests share it.
 */

/** The plan with the session on `day`; the very same plan when there is nothing to move. */
export function moveItem(items: PlanItem[], key: string, day: number): PlanItem[] {
  const item = items.find((i) => i.key === key);
  if (!item || item.day === day || !Number.isInteger(day) || day < 0 || day > 6) return items;
  return [...items.filter((i) => i.key !== key), { ...item, day }];
}

/** The days a session on `day` can be moved to: the week's other six, Monday first. */
export function moveTargets(day: number): number[] {
  return Array.from({ length: 7 }, (_, d) => d).filter((d) => d !== day);
}

/** What one move did, so it can be told and taken back. */
export type Move = { key: string; title: string; from: number; to: number };

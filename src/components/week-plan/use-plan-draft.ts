"use client";

import { useSyncExternalStore } from "react";
import type { PlanItem } from "./types";

export type PlanDraft = { riderIds: string[]; items: PlanItem[] };

/**
 * The week plan as it is being made, kept on this device until it is laid
 * in, so closing the page or losing the signal does not lose a coach's
 * half-built week. One draft per week; it holds sessions and rider ids,
 * nothing a rider wrote. Where the browser keeps nothing (storage turned
 * off), the plan lives in memory for as long as the page does. A plan
 * begun from one rider's calendar is kept apart from the team's for the
 * same week (ADR 0058).
 */

const CHANGED = "kadence:week-plan";
const memory = new Map<string, string>();

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string | null) {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Kept in memory instead.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function parse(raw: string | null): PlanDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlanDraft;
    return Array.isArray(parsed.items) && Array.isArray(parsed.riderIds) ? parsed : null;
  } catch {
    return null;
  }
}

export function usePlanDraft(monday: string, initial: PlanDraft, scope?: string) {
  const key = `kadence:week-plan:${monday}${scope ? `:${scope}` : ""}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const draft = parse(raw) ?? initial;
  return {
    draft,
    setDraft: (next: PlanDraft) => write(key, JSON.stringify(next)),
    clear: () => write(key, null),
  };
}

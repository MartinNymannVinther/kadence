"use client";

import { useSyncExternalStore } from "react";
import type { LocalDraftMeta } from "@/modules/training/week-draft-merge";
import type { PlanItem } from "./types";

export type PlanDraft = { riderIds: string[]; items: PlanItem[] };

/** This device's copy, with what it knows about the server's (src/modules/training/week-draft-merge.ts). */
export type StoredDraft = PlanDraft & LocalDraftMeta;

/**
 * The week plan as it is being made, kept on this device as well as on
 * the server (ADR 0043, amended 2026-10-07), so closing the page or losing
 * the signal does not lose a coach's half-built week: the server gets it
 * when there is a connection again. One draft per week; it holds sessions
 * and rider ids, nothing a rider wrote. Where the browser keeps nothing
 * (storage turned off), the plan lives in memory for as long as the page
 * does. A plan begun from one rider's calendar is kept apart from the
 * team's for the same week (ADR 0059).
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

/** A copy kept before drafts were shared has no metadata: it never met the server, so it is unsaved. */
function parse(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.riderIds)) return null;
    return {
      riderIds: parsed.riderIds,
      items: parsed.items,
      at: typeof parsed.at === "number" ? parsed.at : 0,
      base: typeof parsed.base === "string" ? parsed.base : null,
      dirty: typeof parsed.dirty === "boolean" ? parsed.dirty : true,
    };
  } catch {
    return null;
  }
}

export type DraftStore = ReturnType<typeof draftStore>;

/** This device's copy of one week's draft, for the team or for one rider. */
export function draftStore(monday: string, scope?: string) {
  const key = `kadence:week-plan:${monday}${scope ? `:${scope}` : ""}`;
  return {
    key,
    /** The copy as it is right now; null when this device keeps none. */
    current: () => parse(read(key)),
    /**
     * A change made here: kept, and marked as not yet on the server. A
     * first change to a draft shown from the server starts from that one.
     */
    change: (next: PlanDraft, shownBase: string | null) => {
      const base = parse(read(key))?.base ?? shownBase;
      write(key, JSON.stringify({ ...next, at: Date.now(), base, dirty: true }));
    },
    /** A copy with what is known of the server: a draft taken from it, or one just saved to it. */
    keep: (next: PlanDraft, meta: LocalDraftMeta) =>
      write(key, JSON.stringify({ riderIds: next.riderIds, items: next.items, ...meta })),
    clear: () => write(key, null),
  };
}

/** The copy as the page renders it: null on the server and until this device's is read. */
export function useStoredDraft(store: DraftStore): StoredDraft | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(store.key),
    () => null,
  );
  return parse(raw);
}

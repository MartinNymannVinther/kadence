import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftSync, SAVE_AFTER_MS } from "@/components/week-plan/draft-sync";
import { moveItem } from "@/components/week-plan/move";
import type { PlanItem } from "@/components/week-plan/types";
import { draftStore } from "@/components/week-plan/use-plan-draft";
import type { SharedDraft } from "@/modules/training/week-plan-draft";

/**
 * A session moved in the week planner goes the way of every other change
 * to the shared draft (ADR 0043 amended 2026-10-07; 0059 amended
 * 2026-10-12): kept on this device at once, saved to the server a moment
 * later with the new day, and taken back by "Fortryd" the same way. The
 * server actions are stood in for; this is draft-sync.ts without React.
 */

const actions = vi.hoisted(() => ({
  save: vi.fn(),
  load: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@/modules/training/week-draft-actions", () => ({
  saveWeekPlanDraftAction: actions.save,
  loadWeekPlanDraftAction: actions.load,
  clearWeekPlanDraftAction: actions.clear,
}));

const MONDAY = "2026-11-09";

const run = (key: string, day: number): PlanItem => ({
  key,
  day,
  kind: "template",
  templateId: `tpl_${key}`,
  name: key === "a" ? "Løbetur" : "Styrke",
  sport: "run",
  minutes: 45,
  startTime: "17:30",
  meetingPlace: "",
});

/** A browser's window, as much of it as the device's copy needs. */
function fakeWindow() {
  const kept = new Map<string, string>();
  const events = new EventTarget();
  return Object.assign(events, {
    localStorage: {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => void kept.set(k, v),
      removeItem: (k: string) => void kept.delete(k),
    },
  });
}

function savedDraft(payload: unknown): SharedDraft {
  return {
    payload: payload as SharedDraft["payload"],
    updatedAt: new Date().toISOString(),
    by: { name: "Mads", me: true },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", fakeWindow());
  actions.save.mockReset();
  actions.save.mockImplementation(async (input: { payload: unknown }) => ({
    ok: true,
    data: savedDraft(input.payload),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function planner() {
  const store = draftStore(MONDAY);
  const sync = createDraftSync({
    monday: MONDAY,
    scope: "team",
    store,
    first: null,
    templates: [],
    onServer: () => {},
    onNotice: () => {},
    onOffline: () => {},
  });
  return { store, sync };
}

const days = (payload: { items: { day: number }[] }) => payload.items.map((i) => i.day);

describe("a moved session in the shared draft", () => {
  it("is kept on this device at once and saved with its new day a moment later", async () => {
    const { store, sync } = planner();
    const items = [run("a", 0), run("b", 2)];
    sync.change({ riderIds: ["r1"], items });
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(actions.save).toHaveBeenCalledTimes(1);

    sync.change({ riderIds: ["r1"], items: moveItem(items, "a", 3) });
    expect(store.current()?.items.find((i) => i.key === "a")?.day).toBe(3);
    expect(store.current()?.dirty).toBe(true);
    expect(actions.save).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(actions.save).toHaveBeenCalledTimes(2);
    const sent = actions.save.mock.calls[1]![0] as {
      monday: string;
      scope: string;
      payload: { riderIds: string[]; items: { day: number; templateId?: string }[] };
    };
    expect(sent).toMatchObject({ monday: MONDAY, scope: "team" });
    expect(sent.payload.riderIds).toEqual(["r1"]);
    expect(days(sent.payload)).toEqual([2, 3]);
    expect(sent.payload.items.map((i) => i.templateId)).toEqual(["tpl_b", "tpl_a"]);
    expect(store.current()?.dirty).toBe(false);
  });

  it("is saved once for a quick move and its undo, back where it was", async () => {
    const { sync } = planner();
    const items = [run("a", 0), run("b", 2)];
    const moved = moveItem(items, "a", 4);
    sync.change({ riderIds: ["r1"], items: moved });
    sync.change({ riderIds: ["r1"], items: moveItem(moved, "a", 0) });
    await vi.advanceTimersByTimeAsync(SAVE_AFTER_MS);
    expect(actions.save).toHaveBeenCalledTimes(1);
    const sent = actions.save.mock.calls[0]![0] as { payload: { items: { day: number }[] } };
    expect(days(sent.payload).sort()).toEqual([0, 2]);
  });
});

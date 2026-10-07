import type { TemplateOption } from "@/components/calendar/template-picker";
import { chooseDraft } from "@/modules/training/week-draft-merge";
import {
  clearWeekPlanDraftAction,
  loadWeekPlanDraftAction,
  saveWeekPlanDraftAction,
} from "@/modules/training/week-draft-actions";
import type { SharedDraft } from "@/modules/training/week-plan-draft";
import { fromDraftPayload, toDraftPayload } from "./types";
import type { DraftStore, PlanDraft } from "./use-plan-draft";

/**
 * Keeps this device's copy of the week plan and the team's shared draft
 * on the server in step (ADR 0043, amended 2026-10-07): a change is kept
 * here at once and saved a second after the last one; the server's draft
 * is read when the planner opens, when the window comes back into view,
 * and now and then while it is open; and what to do when the two differ
 * is `chooseDraft` (src/modules/training/week-draft-merge.ts). No React
 * here: the hook in use-shared-draft.ts makes one per planner and hands
 * it what to call when there is something to show.
 */

/** A change is saved this long after the last one. */
export const SAVE_AFTER_MS = 1000;
/** How often an open planner in view reads the draft again. */
export const READ_EVERY_MS = 20_000;

export type DraftNotice =
  /** Someone saved a newer draft, which is now shown; `lost` when a change here did not make it. */
  | { kind: "newer"; by: SharedDraft["by"]; at: string; lost: boolean }
  /** The week was laid in somewhere else, and the draft is gone. */
  | { kind: "laidIn" };

export type DraftSyncOptions = {
  monday: string;
  scope: string;
  store: DraftStore;
  /** The server's draft when the page was made. */
  first: SharedDraft | null;
  /** The library as the page has it, to show a draft taken from the server; `follow` keeps it current. */
  templates: TemplateOption[];
  onServer: (draft: SharedDraft | null) => void;
  onNotice: (notice: DraftNotice | null) => void;
  /** True when the last save did not reach the server. */
  onOffline: (offline: boolean) => void;
};

export function createDraftSync(o: DraftSyncOptions) {
  const key = { monday: o.monday, scope: o.scope };
  let timer: ReturnType<typeof setTimeout> | null = null;
  let saving = false;
  let again = false;
  /** Counts what happened here; a read that started before one of them is out of date when it lands. */
  let epoch = 0;
  /** The server's draft as last known: what a first change to a shown draft starts from. */
  let known = o.first;
  let templates = o.templates;
  /** True while an item is open for editing: a newer draft waits until it is closed. */
  let held = false;

  const server = (draft: SharedDraft | null) => {
    known = draft;
    o.onServer(draft);
  };

  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function schedule() {
    stop();
    timer = setTimeout(() => {
      timer = null;
      void save();
    }, SAVE_AFTER_MS);
  }

  async function save(): Promise<void> {
    stop();
    if (saving) {
      again = true;
      return;
    }
    const sent = o.store.current();
    if (!sent?.dirty) return;
    saving = true;
    const result = await saveWeekPlanDraftAction({ ...key, payload: toDraftPayload(sent) }).catch(
      () => null,
    );
    saving = false;
    epoch += 1;
    if (!result?.ok) {
      // Kept here; the next change, read or connection sends it.
      o.onOffline(true);
      again = false;
      return;
    }
    o.onOffline(false);
    const now = o.store.current();
    const changed = now !== null && now.at !== sent.at;
    if (now) o.store.keep(now, { at: now.at, base: result.data.updatedAt, dirty: changed });
    server(result.data);
    if (changed || again) {
      again = false;
      schedule();
    }
  }

  /** The server's draft against this device's copy; see chooseDraft. */
  function reconcile(draft: SharedDraft | null) {
    const current = o.store.current();
    const choice = chooseDraft(current, draft);
    if (choice.take === "server" && draft) {
      const at = draft.updatedAt;
      o.store.keep(fromDraftPayload(draft.payload, templates), {
        at: Date.parse(at),
        base: at,
        dirty: false,
      });
      if (choice.notice)
        o.onNotice({ kind: "newer", by: draft.by, at, lost: current?.dirty ?? false });
    } else if (choice.take === "none" && choice.cleared) {
      o.store.clear();
      o.onNotice({ kind: "laidIn" });
    } else if (choice.take === "local" && choice.push) {
      void save();
    }
    server(draft);
  }

  async function read(): Promise<void> {
    if (saving || timer || held) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const started = epoch;
    const result = await loadWeekPlanDraftAction(key).catch(() => null);
    // Unread, or out of date: something happened here while it was on its way.
    if (!result?.ok || started !== epoch || saving || timer || held) return;
    reconcile(result.data);
  }

  return {
    read,
    /** What the page has now: the library, and whether an item is open for editing. */
    follow(next: { templates: TemplateOption[]; editing: boolean }) {
      templates = next.templates;
      held = next.editing;
    },
    /** A change made in the planner: kept here now, saved in a moment. */
    change(next: PlanDraft) {
      o.store.change(next, known?.updatedAt ?? null);
      epoch += 1;
      o.onNotice(null);
      schedule();
    },
    /** A change waiting to be saved goes now: the planner is closing, or the connection is back. */
    flush() {
      if (timer || o.store.current()?.dirty) void save();
    },
    /** The week is laid in: the draft is cleared here and on the server. */
    clear() {
      stop();
      epoch += 1;
      o.store.clear();
      server(null);
      o.onNotice(null);
      void clearWeekPlanDraftAction(key).catch(() => null);
    },
  };
}

export type DraftSync = ReturnType<typeof createDraftSync>;

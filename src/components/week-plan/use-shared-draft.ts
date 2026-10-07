"use client";

import { useEffect, useMemo, useState } from "react";
import type { TemplateOption } from "@/components/calendar/template-picker";
import { TEAM_SCOPE } from "@/modules/training/week-draft-merge";
import type { SharedDraft } from "@/modules/training/week-plan-draft";
import { createDraftSync, READ_EVERY_MS, type DraftNotice } from "./draft-sync";
import { fromDraftPayload } from "./types";
import { draftStore, useStoredDraft, type PlanDraft } from "./use-plan-draft";

export type SharedDraftState = {
  /** The server's draft as last read or saved: who saved it, and when. */
  server: SharedDraft | null;
  notice: DraftNotice | null;
  /** How many times a draft from elsewhere has replaced the one shown here. */
  replaced: number;
  /** True when a change here has not reached the server yet because the last try failed. */
  offline: boolean;
};

/**
 * The week planner's draft, shared by the team's coaches (ADR 0043,
 * amended 2026-10-07): what the planner shows — this device's copy, or the
 * server's draft until this device has one, or the empty week — and how
 * to change and clear it. Saving, reading and deciding between the two
 * copies is draft-sync.ts; this wires it to the page's life: read once on
 * opening, again when the window comes back into view and every 20
 * seconds while it is, and a waiting change sent when the connection
 * returns or the planner closes.
 */
export function useSharedDraft({
  monday,
  scope,
  initial,
  first,
  templates,
  hold,
}: {
  monday: string;
  /** TEAM_SCOPE, or the rider the planner was opened for. */
  scope: string;
  initial: PlanDraft;
  first: SharedDraft | null;
  templates: TemplateOption[];
  /** True while an item is open for editing. */
  hold: boolean;
}) {
  const [server, setServer] = useState(first);
  const [notice, setNotice] = useState<DraftNotice | null>(null);
  const [offline, setOffline] = useState(false);
  const [replaced, setReplaced] = useState(0);
  const [store] = useState(() => draftStore(monday, scope === TEAM_SCOPE ? undefined : scope));
  const [sync] = useState(() =>
    createDraftSync({
      monday,
      scope,
      store,
      first,
      templates,
      onServer: setServer,
      onNotice: (next) => {
        setNotice(next);
        if (next) setReplaced((n) => n + 1);
      },
      onOffline: setOffline,
    }),
  );

  useEffect(() => {
    sync.follow({ templates, editing: hold });
  }, [sync, templates, hold]);

  useEffect(() => {
    const read = () => void sync.read();
    const flush = () => sync.flush();
    read();
    const every = setInterval(read, READ_EVERY_MS);
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", read);
    window.addEventListener("online", flush);
    return () => {
      clearInterval(every);
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener("online", flush);
      flush();
    };
  }, [sync]);

  const stored = useStoredDraft(store);
  const shown = useMemo(
    () => (server ? fromDraftPayload(server.payload, templates) : null),
    [server, templates],
  );
  const draft: PlanDraft = stored ?? shown ?? initial;
  const state: SharedDraftState = { server, notice, offline, replaced };
  return {
    draft,
    state,
    setDraft: (next: PlanDraft) => sync.change(next),
    clear: () => sync.clear(),
  };
}

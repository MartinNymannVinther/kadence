"use client";

import { createContext, useContext } from "react";
import { referenceOf } from "@/modules/paradigms";
import { dcuState, type Volume } from "@/modules/season/volume";
import type { WeekNote } from "./deviation-text";

/**
 * The week a session lies in, as the page already knows it from the four
 * numbers (ADR 0040): whether the week ends inside, above or below the
 * reference's range. A session's explanation (ADR 0095) closes with it
 * when it is there, and says nothing about the week when it is not.
 */
const WeekNoteContext = createContext<WeekNote>(null);

/** The note for a week's volume; null without a reference, or in October's break. */
export function weekNoteOf(volume: Volume | null | undefined): WeekNote {
  const state = volume ? dcuState(volume) : null;
  return state && volume ? { state, ref: referenceOf(volume.basis) } : null;
}

export function WeekNoteProvider({
  volume,
  children,
}: {
  volume: Volume | null | undefined;
  children: React.ReactNode;
}) {
  return <WeekNoteContext value={weekNoteOf(volume)}>{children}</WeekNoteContext>;
}

export function useWeekNote(): WeekNote {
  return useContext(WeekNoteContext);
}

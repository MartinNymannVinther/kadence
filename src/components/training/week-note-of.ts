import { referenceOf } from "@/modules/paradigms";
import { dcuState, type Volume } from "@/modules/season/volume";
import type { WeekNote } from "./deviation-text";

/**
 * The note for a week's volume (ADR 0095): whether the week ends inside,
 * above or below the reference's range; null without a reference, or in
 * October's break. Kept out of the client module beside it
 * (week-note.tsx), so the session panel's server component can call it:
 * a function in a "use client" module can only be rendered or passed on
 * from the server, never called there.
 */
export function weekNoteOf(volume: Volume | null | undefined): WeekNote {
  const state = volume ? dcuState(volume) : null;
  return state && volume ? { state, ref: referenceOf(volume.basis) } : null;
}

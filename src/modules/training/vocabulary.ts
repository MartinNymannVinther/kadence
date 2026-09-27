import { z } from "zod";
import { structureSchema } from "@/modules/workouts/structure";

/** The words and limits the training services share. */

export const SPORTS = ["bike", "strength", "other"] as const;
export type Sport = (typeof SPORTS)[number];

export const id = z.string().min(1).max(100);
export const isoDate = z.iso.date();
export const MAX_TITLE = 120;
export const MAX_TEXT = 4000;

export const SessionInput = z.object({
  riderId: id,
  onDate: isoDate,
  sport: z.enum(SPORTS),
  title: z.string().trim().min(1).max(MAX_TITLE),
  description: z.string().trim().max(MAX_TEXT).default(""),
  structure: structureSchema,
  plannedMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  plannedKm: z.coerce.number().int().min(0).max(400).nullable().default(null),
  templateId: id.nullable().default(null),
});
export type SessionInputT = z.infer<typeof SessionInput>;

/** A change to a session that belongs to a group plan: this rider's copy, or every rider's. */
export const SCOPES = ["one", "group"] as const;
export type Scope = (typeof SCOPES)[number];

/** Noon in Copenhagen on a day, for activities entered by hand that have no clock time. */
export function noonInCopenhagen(dateIso: string): Date {
  // 10:00 UTC is 11:00 or 12:00 in Copenhagen: the same day either way.
  return new Date(`${dateIso}T10:00:00Z`);
}

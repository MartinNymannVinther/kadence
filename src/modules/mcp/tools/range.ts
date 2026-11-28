import { z } from "zod";
import { addDaysIso } from "@/core/dates";
import { ToolRefusal } from "../tool";

/** A span of days an assistant may ask for: at most nine weeks, the last two by default. */
export const MAX_DAYS = 63;
export const DEFAULT_DAYS = 14;

export const DayRange = z.object({
  from: z.iso
    .date()
    .optional()
    .describe("First day, YYYY-MM-DD (Copenhagen). Default: 13 days before `to`."),
  to: z.iso.date().optional().describe("Last day, YYYY-MM-DD (Copenhagen). Default: today."),
});

/** The range asked for, filled in and checked. Pure. */
export function dayRange(
  input: z.infer<typeof DayRange>,
  today: string,
): { from: string; to: string } {
  const to = input.to ?? today;
  const from = input.from ?? addDaysIso(to, -(DEFAULT_DAYS - 1));
  if (from > to) throw new ToolRefusal("`from` comes after `to`.");
  if (addDaysIso(from, MAX_DAYS - 1) < to)
    throw new ToolRefusal(`Ask for at most ${MAX_DAYS} days at a time.`);
  return { from, to };
}

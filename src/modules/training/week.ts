import { addDaysIso, ISO_DATE, mondayOf } from "@/core/dates";

/**
 * The calendar's week, as arithmetic: which Monday a URL asks for and the
 * seven days after it. What was done against the plan — the colours and
 * the hours — is the load model's (src/modules/load).
 *
 * Pure: imports nothing from the database.
 */

/** The Monday of the week a `?week=` asks for; this week when it asks for nothing sensible. */
export function weekFrom(param: string | undefined, today: string): string {
  if (param && ISO_DATE.test(param) && !Number.isNaN(Date.parse(param))) return mondayOf(param);
  return mondayOf(today);
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
}

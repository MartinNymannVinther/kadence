import { diffDays, formatClock, todayInCopenhagen } from "@/core/dates";
import { dayMonth, weekdayLong } from "@/components/training/day-label";

/**
 * When a rider wrote something, the way a person says it: "i dag 9.05",
 * "i går 18.40", "mandag 18.40" within the week, and the date beyond it.
 * The day is the Copenhagen day the moment fell on, whatever zone the
 * server runs in. Pure: the words for today and yesterday come in.
 */
export function newsWhen(
  at: Date,
  today: string,
  words: { today: string; yesterday: string; when: (day: string, clock: string) => string },
  locale: string,
): string {
  const day = todayInCopenhagen(at);
  const ago = diffDays(day, today);
  const said =
    ago === 0
      ? words.today
      : ago === 1
        ? words.yesterday
        : ago > 1 && ago < 7
          ? weekdayLong(day, locale)
          : dayMonth(day, locale);
  return words.when(said, formatClock(at, locale));
}

import { useLocale, useTranslations } from "next-intl";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { cn } from "@/lib/utils";
import type { ZoneDay } from "./zone-days";
import { ZONE_STYLE } from "./zone-style";

/**
 * Two weeks of check-ins at a glance: one cell a day with the zone's
 * tint, icon and — for a screen reader and on hover — its word. A day
 * without a check-in is an empty cell, not a green one.
 */
export function ZoneStrip({ days, today }: { days: ZoneDay[]; today: string }) {
  const t = useTranslations("wellbeing");
  const locale = useLocale();
  const counts = { green: 0, yellow: 0, red: 0 };
  for (const d of days) if (d.zone) counts[d.zone]++;
  return (
    <div className="flex flex-col gap-2">
      <ol className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
        {days.map((day) => {
          const style = day.zone ? ZONE_STYLE[day.zone] : null;
          const Icon = style?.icon;
          const word = day.zone ? t(`zone.${day.zone}`) : t("noCheckin");
          const label = `${weekdayShort(day.date, locale)} ${dayMonth(day.date, locale)}: ${word}`;
          return (
            <li
              key={day.date}
              title={label}
              className="flex flex-col items-center gap-1"
              aria-current={day.date === today ? "date" : undefined}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-md",
                  style ? style.chip : "border-input border border-dashed",
                  day.date === today && "ring-primary ring-2 ring-offset-1 ring-offset-card",
                )}
              >
                {Icon && <Icon aria-hidden className="size-4" />}
                <span className="sr-only">{label}</span>
              </span>
              <span className="text-meta text-2xs first-letter:uppercase" aria-hidden>
                {weekdayShort(day.date, locale).slice(0, 2)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-meta text-xs">{t("stripSummary", counts)}</p>
    </div>
  );
}

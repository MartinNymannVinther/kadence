import { useLocale, useTranslations } from "next-intl";
import type { CalendarEventCard } from "@/components/calendar/types";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { EventIcon } from "@/components/training/event-icon";
import { timePlaceText } from "@/modules/training/time-place";

/**
 * What is coming for the child in the next 30 days: races, camps, school,
 * exams — with when and where each starts and who drives, so the weekend
 * can be planned (docs/backlog.md P2-03).
 */
export function ChildUpcoming({ events }: { events: CalendarEventCard[] }) {
  const t = useTranslations("parents.child");
  const kinds = useTranslations("training.eventKind");
  const training = useTranslations("training");
  const locale = useLocale();
  if (events.length === 0) return <p className="text-meta text-2sm">{t("noUpcoming")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {events.map((e) => {
        const when = timePlaceText(e, locale);
        const transport = e.transportNote.trim();
        return (
          <li key={e.id} className="flex items-start gap-2 text-2sm">
            <EventIcon kind={e.kind} className="mt-0.5 size-4" />
            <span className="text-meta w-24 shrink-0 pt-0.5 text-xs first-letter:uppercase">
              {weekdayShort(e.startsOn, locale)} {dayMonth(e.startsOn, locale)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="min-w-0 truncate font-medium">
                <span className="sr-only">{kinds(e.kind as "race")}: </span>
                {e.title}
              </span>
              {when && <span className="text-meta text-xs tabular-nums">{when}</span>}
              {transport && (
                <span className="text-meta text-xs">
                  {training("transport", { note: transport })}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

import { useLocale, useTranslations } from "next-intl";
import type { CalendarEventCard } from "@/components/calendar/types";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { EventIcon } from "@/components/training/event-icon";

/** What is coming for the child in the next 30 days: races, camps, school, exams. */
export function ChildUpcoming({ events }: { events: CalendarEventCard[] }) {
  const t = useTranslations("parents.child");
  const kinds = useTranslations("training.eventKind");
  const locale = useLocale();
  if (events.length === 0) return <p className="text-meta text-2sm">{t("noUpcoming")}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {events.map((e) => (
        <li key={e.id} className="flex items-center gap-2 text-2sm">
          <EventIcon kind={e.kind} className="size-4" />
          <span className="text-meta w-24 shrink-0 text-xs first-letter:uppercase">
            {weekdayShort(e.startsOn, locale)} {dayMonth(e.startsOn, locale)}
          </span>
          <span className="sr-only">{kinds(e.kind as "race")}: </span>
          <span className="min-w-0 truncate font-medium">{e.title}</span>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { EventIcon } from "@/components/training/event-icon";
import { Button } from "@/components/ui/button";
import type { FamilyEvent } from "@/modules/training/family-kinds";
import { FamilyEventDialog } from "./family-event-dialog";

/**
 * What a parent has put into one child's calendar, from today on, each
 * with "Ret", and "Tilføj til kalenderen" below (docs/adr/0069). The
 * child and the coach see the same rows in the calendar.
 */
export function FamilyEvents({
  riderId,
  childName,
  events,
  today,
}: {
  riderId: string;
  childName: string;
  events: FamilyEvent[];
  today: string;
}) {
  const t = useTranslations("parents.family");
  const kinds = useTranslations("training.eventKind");
  const locale = useLocale();
  // A new key per opening, so the form starts from its defaults or from the entry.
  const [open, setOpen] = useState<{ key: number; event?: FamilyEvent } | null>(null);
  const day = (iso: string) => `${weekdayShort(iso, locale)} ${dayMonth(iso, locale)}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-meta text-2sm leading-relaxed">{t("body", { name: childName })}</p>
      {events.length === 0 ? (
        <p className="text-meta text-2sm">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-2sm">
              <EventIcon kind={e.kind} className="size-4" />
              <span className="text-meta shrink-0 text-xs first-letter:uppercase">
                {e.endsOn > e.startsOn
                  ? t("range", { from: day(e.startsOn), to: day(e.endsOn) })
                  : day(e.startsOn)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                <span className="sr-only">{kinds(e.kind)}: </span>
                {e.title}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="max-sm:h-11"
                aria-label={t("editOne", { title: e.title })}
                onClick={() => setOpen({ key: Date.now(), event: e })}
              >
                {t("edit")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          className="max-sm:h-11"
          onClick={() => setOpen({ key: Date.now() })}
        >
          <CalendarPlus data-icon="inline-start" />
          {t("add")}
        </Button>
      </div>
      {open && (
        <FamilyEventDialog
          key={open.key}
          open
          onOpenChange={(next) => !next && setOpen(null)}
          riderId={riderId}
          childName={childName}
          event={open.event}
          today={today}
        />
      )}
    </div>
  );
}

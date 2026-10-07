"use client";

import { useLocale, useTranslations } from "next-intl";
import { EventIcon } from "@/components/training/event-icon";
import { cn } from "@/lib/utils";
import { timePlaceText } from "@/modules/training/time-place";
import { placeText } from "./event-results";
import type { CalendarEventCard } from "./types";

/**
 * A race, an exam, a camp or a week ill, as a chip in the day: the kind
 * as an icon and a word, the title, a race's priority — and, in a coach's
 * calendar, the rider's place from Cykling Danmark, small. Below, when
 * and where it starts, and in a rider's day list who drives
 * (docs/backlog.md P2-03). Pressing it opens the event for whoever may
 * change it.
 */
export function EventChip({
  event,
  onOpen,
  compact = false,
  full = false,
  day,
}: {
  event: CalendarEventCard;
  onOpen?: () => void;
  compact?: boolean;
  /** Room for the note on driving too: a day in one rider's week. */
  full?: boolean;
  /** The day the chip stands on: when, where and who drives belong to the first. */
  day?: string;
}) {
  const kinds = useTranslations("training.eventKind");
  const t = useTranslations("training");
  const locale = useLocale();
  const kind = kinds(event.kind as "race");
  // A place belongs to one rider: on a team race, the dialog says whose.
  const places =
    event.riderId !== null ? (event.results ?? []).slice(0, 2).map(placeText).join(" · ") : "";
  const first = day === undefined || day === event.startsOn;
  const when = first ? timePlaceText(event, locale) : "";
  const transport = first ? event.transportNote.trim() : "";
  const label = [
    `${kind}: ${event.title}${event.priority ? ` (${t("priority", { priority: event.priority })})` : ""}${places ? ` (${t("placed", { place: places })})` : ""}`,
    when,
    transport ? t("transport", { note: transport }) : "",
  ]
    .filter(Boolean)
    .join(". ");
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        <EventIcon kind={event.kind} />
        <span className="sr-only">{compact ? label : `${kind}: `}</span>
        {!compact && <span className="min-w-0 truncate">{event.title}</span>}
        {event.priority && !compact && (
          <span className="bg-card rounded-full px-1.5 text-2xs font-semibold">
            {event.priority}
          </span>
        )}
        {places && !compact && (
          <span className="shrink-0 text-2xs tabular-nums opacity-75">{places}</span>
        )}
      </span>
      {!compact && when && (
        <span className="min-w-0 truncate text-2xs font-normal tabular-nums opacity-85">
          {when}
        </span>
      )}
      {!compact && full && transport && (
        <span className="min-w-0 text-2xs font-normal opacity-85">
          {t("transport", { note: transport })}
        </span>
      )}
    </>
  );
  const className = cn(
    "flex min-w-0 flex-col justify-center gap-0.5 rounded-md text-xs font-medium",
    event.kind === "race"
      ? "bg-accent text-accent-foreground"
      : event.kind === "ill"
        ? "bg-warning-tint text-destructive"
        : "bg-sticky/70 text-sticky-ink",
    compact ? "size-6 items-center" : "min-h-8 px-2 py-1",
  );
  if (!onOpen) {
    return (
      <span className={className} title={label}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      title={label}
      aria-label={label}
      className={cn(className, "focus-ring text-left max-sm:min-h-11 hover:opacity-85")}
    >
      {body}
    </button>
  );
}

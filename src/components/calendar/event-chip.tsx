"use client";

import { useTranslations } from "next-intl";
import { EventIcon } from "@/components/training/event-icon";
import { cn } from "@/lib/utils";
import type { CalendarEventCard } from "./types";

/**
 * A race, an exam, a camp or a week ill, as a chip in the day: the kind
 * as an icon and a word, the title, a race's priority. Pressing it opens
 * the event for whoever may change it.
 */
export function EventChip({
  event,
  onOpen,
  compact = false,
}: {
  event: CalendarEventCard;
  onOpen?: () => void;
  compact?: boolean;
}) {
  const kinds = useTranslations("training.eventKind");
  const t = useTranslations("training");
  const kind = kinds(event.kind as "race");
  const label = `${kind}: ${event.title}${event.priority ? ` (${t("priority", { priority: event.priority })})` : ""}`;
  const body = (
    <>
      <EventIcon kind={event.kind} />
      <span className="sr-only">{compact ? label : `${kind}: `}</span>
      {!compact && <span className="min-w-0 truncate">{event.title}</span>}
      {event.priority && !compact && (
        <span className="bg-card rounded-full px-1.5 text-2xs font-semibold">{event.priority}</span>
      )}
    </>
  );
  const className = cn(
    "flex min-w-0 items-center gap-1.5 rounded-md text-xs font-medium",
    event.kind === "race"
      ? "bg-accent text-accent-foreground"
      : event.kind === "ill"
        ? "bg-warning-tint text-destructive"
        : "bg-sticky/70 text-sticky-ink",
    compact ? "size-6 justify-center" : "min-h-8 px-2 py-1",
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

"use client";

import { useLocale, useTranslations } from "next-intl";
import { COLOUR_STYLE, colourOf, stateKey } from "@/components/training/compliance-mark";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { timePlaceText } from "@/modules/training/time-place";
import type { CalendarCard } from "./types";

/**
 * A session in the team grid, as small as it can be and still say what
 * it is: the sport, the length, when and where (ADR 0057) and how it
 * went — as a tint and an icon, with the title, the length and the state
 * in words for a pointer and a screen reader.
 */
export function TeamChip({
  session,
  today,
  href,
  landed,
  dragging,
  dragProps,
}: {
  session: CalendarCard;
  today: string;
  href: string;
  landed: boolean;
  dragging: boolean;
  dragProps: React.HTMLAttributes<HTMLAnchorElement>;
}) {
  const states = useTranslations("training.state");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const colour = colourOf(session, today);
  const style = COLOUR_STYLE[colour];
  const Icon = style.icon;
  const state = states(
    stateKey(colour, session.activity !== null, session.onDate === today) as "planned",
  );
  const minutes = session.plannedMinutes > 0 ? durationText(session.plannedMinutes, duration) : "";
  const when = timePlaceText(session, locale);

  return (
    <Link
      href={href}
      scroll={false}
      {...dragProps}
      title={[session.title, when, state].filter(Boolean).join(" · ")}
      className={cn(
        "focus-ring flex min-h-11 w-full min-w-0 flex-col justify-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium",
        style.chip,
        dragProps.draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-45",
        landed && "landed",
      )}
    >
      <span className="sr-only">
        {[session.title, when, minutes, state].filter(Boolean).join(", ")}
      </span>
      <span aria-hidden className="block truncate">
        {session.title}
      </span>
      {when && (
        <span aria-hidden className="block truncate font-normal">
          {when}
        </span>
      )}
      <span aria-hidden className="flex min-w-0 items-center gap-1">
        <SportIcon sport={session.sport} className="size-3.5" />
        <span className="min-w-0 flex-1 truncate font-normal tabular-nums">{minutes}</span>
        <Icon className="size-3 shrink-0" />
      </span>
    </Link>
  );
}

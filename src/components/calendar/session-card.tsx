"use client";

import { MessageSquare, Repeat, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { COLOUR_STYLE, ComplianceMark, colourOf } from "@/components/training/compliance-mark";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { timePlaceText } from "@/modules/training/time-place";
import { SessionMenu } from "./session-menu";
import type { CalendarCard, RiderOption } from "./types";

/**
 * A planned session in a day: its sport, title and length, when and where
 * it starts (ADR 0057), how it went against the plan (colour, icon and
 * word), and how many comments it has.
 * The card opens the session's panel; its menu moves, copies and deletes;
 * on a desktop it can be dragged to another day.
 */
export function SessionCard({
  session,
  today,
  href,
  canEdit,
  isCoach,
  riders,
  landed,
  dragging,
  dragProps,
  onMoved,
}: {
  session: CalendarCard;
  today: string;
  href: string;
  canEdit: boolean;
  isCoach: boolean;
  riders: RiderOption[];
  landed: boolean;
  dragging: boolean;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
  onMoved: (onDate: string) => void;
}) {
  const t = useTranslations("calendar.card");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const colour = colourOf(session, today);
  const done = session.activity !== null;
  const when = timePlaceText(session, locale);

  return (
    <div
      {...dragProps}
      className={cn(
        "bg-card border-border flex min-w-0 flex-col rounded-lg border border-l-4 shadow-[var(--surface-shadow)]",
        COLOUR_STYLE[colour].edge,
        dragProps.draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-45",
        landed && "landed",
      )}
    >
      <Link
        href={href}
        scroll={false}
        className="focus-ring flex min-w-0 flex-col gap-1.5 rounded-md px-2.5 pt-2.5 pb-1"
      >
        <span className="flex min-w-0 items-start gap-1.5 text-2sm leading-snug font-semibold">
          <SportIcon sport={session.sport} className="mt-0.5 size-3.5" />
          <span className="line-clamp-3 min-w-0 break-words">{session.title}</span>
        </span>
        {when && <span className="text-2sm min-w-0 leading-snug break-words">{when}</span>}
        <span className="text-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {session.plannedMinutes > 0 && (
            <span className="tabular-nums">{durationText(session.plannedMinutes, duration)}</span>
          )}
          {session.groupKey && (
            <span className="flex items-center gap-0.5" title={t("group")}>
              <Users aria-hidden className="size-3" />
              <span className="sr-only">{t("group")}</span>
            </span>
          )}
          {session.seriesKey && (
            <span className="flex items-center gap-0.5" title={t("series")}>
              <Repeat aria-hidden className="size-3" />
              <span className="sr-only">{t("series")}</span>
            </span>
          )}
          {session.commentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare aria-hidden className="size-3" />
              <span className="tabular-nums">{session.commentCount}</span>
              <span className="sr-only">{t("comments", { count: session.commentCount })}</span>
            </span>
          )}
        </span>
      </Link>
      <div className="flex min-h-8 items-center justify-between gap-1 pr-1 pb-1 pl-2.5">
        <ComplianceMark colour={colour} done={done} isToday={session.onDate === today} />
        {canEdit && (
          <SessionMenu
            session={session}
            riders={riders}
            isCoach={isCoach}
            openHref={href}
            onMoved={onMoved}
          />
        )}
      </div>
    </div>
  );
}

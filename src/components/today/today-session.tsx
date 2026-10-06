import { Bike, Clock, MapPin, MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ComplianceMark, colourOf, COLOUR_STYLE } from "@/components/training/compliance-mark";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { buttonVariants } from "@/components/ui/button";
import type { CalendarCard } from "@/components/calendar/types";
import { withQuery } from "@/components/calendar/href";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { rideableStructure } from "@/modules/rulle/rideable";
import { clockText } from "@/modules/training/time-place";
import { CompleteDialog } from "./complete-dialog";

/**
 * A session on today's page, large: what it is, how long, how it went —
 * and for the rider, until it is done, the big "Udført". A bike session
 * with steps can be ridden indoors in Rulle on the day (ADR 0033). The
 * title opens the whole session with its steps and comments.
 */
export function TodaySession({
  session,
  today,
  href,
  canComplete,
}: {
  session: CalendarCard;
  today: string;
  href: string;
  canComplete: boolean;
}) {
  const sports = useTranslations("training.sport");
  const duration = useTranslations("training.duration");
  const t = useTranslations("today.rider");
  const when = useTranslations("training.when");
  const locale = useLocale();
  const colour = colourOf(session, today);
  const done = session.activity !== null;

  return (
    <article
      className={cn(
        "bg-card border-border flex flex-col gap-3 rounded-xl border border-l-4 p-4 shadow-[var(--surface-shadow)]",
        COLOUR_STYLE[colour].edge,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Link
          href={href}
          scroll={false}
          className="focus-ring hover:text-primary text-lg leading-snug font-semibold"
        >
          {session.title}
        </Link>
        <p className="text-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-2sm">
          <span className="flex items-center gap-1.5">
            <SportIcon sport={session.sport} />
            {sports(session.sport as "bike")}
          </span>
          {session.plannedMinutes > 0 && (
            <span>{durationText(session.plannedMinutes, duration)}</span>
          )}
          {session.startTime && (
            <span className="flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              {when("time", { time: clockText(session.startTime, locale) })}
            </span>
          )}
          {session.meetingPlace && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              <span className="sr-only">{when("place")}: </span>
              <span className="min-w-0 break-words">{session.meetingPlace}</span>
            </span>
          )}
          {session.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare aria-hidden className="size-3.5" />
              {t("comments", { count: session.commentCount })}
            </span>
          )}
          <ComplianceMark colour={colour} done={done} isToday={session.onDate === today} />
        </p>
      </div>
      {session.description && (
        <p className="text-2sm line-clamp-3 leading-relaxed">{session.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {canComplete && !done && <CompleteDialog session={session} />}
        {canComplete &&
          !done &&
          session.onDate === today &&
          rideableStructure(session.sport, session.structure) && (
            <Link
              href={withQuery("/rulle", { session: session.id })}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            >
              <Bike data-icon="inline-start" />
              {t("indoors")}
            </Link>
          )}
        <Link
          href={href}
          scroll={false}
          className="focus-ring text-primary flex min-h-11 items-center px-1 text-2sm font-medium hover:underline"
        >
          {t("open")}
        </Link>
      </div>
    </article>
  );
}

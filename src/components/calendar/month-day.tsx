import { useLocale, useTranslations } from "next-intl";
import { COLOUR_STYLE, stateKey } from "@/components/training/compliance-mark";
import { dayLong } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { EventIcon } from "@/components/training/event-icon";
import { SportIcon } from "@/components/training/sport-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ComplianceColour } from "@/modules/load";
import type { MonthCell } from "./month-days";

/** How many things a day shows before "+2". */
const ROOM = 3;

/** A session's state as a dot: filled when something happened, hollow while it is still to ride. */
export const DOT: Record<ComplianceColour, string> = {
  green: "bg-success",
  yellow: "bg-zone-4",
  red: "bg-destructive",
  grey: "border-input bg-card border-2",
  none: "bg-chart-3",
};

const EVENT_TINT: Record<string, string> = {
  race: "bg-accent text-accent-foreground",
  ill: "bg-warning-tint text-destructive",
};

/**
 * One day of a rider's month (docs/adr/0093): on a desktop its events as
 * thin bars, its sessions with sport and minutes in the load model's
 * colours, and the rides nobody planned; on a phone the date and a dot
 * for each. The whole day is one link — to the session's panel when it
 * has one session, otherwise to its week with the day in view — and says
 * what it holds in words, so the colours are never the only reading.
 */
export function MonthDay({ cell }: { cell: MonthCell }) {
  const t = useTranslations("calendar.month");
  const states = useTranslations("training.state");
  const kinds = useTranslations("training.eventKind");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const day = Number(cell.date.slice(8));
  const said = [
    ...cell.events.map((e) => `${kinds(e.kind as "race")}: ${e.title}`),
    ...cell.sessions.map(
      (s) =>
        `${s.title} ${durationText(s.minutes, duration)}, ${states(stateKey(s.colour, s.done, cell.isToday) as "planned")}`,
    ),
    ...(cell.rides.length > 0 ? [t("rides", { count: cell.rides.length })] : []),
  ];
  const label = t("dayLabel", {
    day: dayLong(cell.date, locale),
    what: said.length > 0 ? said.join("; ") : t("nothing"),
  });
  const items = [
    ...cell.sessions.map((s) => ({
      key: s.id,
      sport: s.sport,
      minutes: s.minutes,
      colour: s.colour,
    })),
    ...cell.rides.map((r) => ({
      key: r.id,
      sport: r.sport,
      minutes: r.minutes,
      colour: "none" as const,
    })),
  ];
  const hidden = items.length - ROOM;

  return (
    <Link
      href={cell.href}
      scroll={cell.sessions.length !== 1}
      aria-label={label}
      title={label}
      aria-current={cell.isToday ? "date" : undefined}
      className={cn(
        "focus-ring flex h-full min-h-11 min-w-0 flex-col gap-1 rounded-lg border p-1 transition-colors duration-[120ms] @3xl:min-h-24 @3xl:p-1.5",
        cell.inMonth
          ? "bg-card border-border hover:bg-accent/40"
          : "bg-secondary/40 border-transparent",
        cell.isToday && "border-primary ring-primary/40 ring-1",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center self-start rounded-full text-xs tabular-nums",
          cell.isToday
            ? "bg-primary text-primary-foreground font-semibold"
            : cell.inMonth
              ? "font-medium"
              : "text-meta",
        )}
      >
        {day}
      </span>
      {/* A phone: a dot for each thing, a bar for an event. */}
      <span aria-hidden className="flex flex-wrap items-center gap-0.5 @3xl:hidden">
        {cell.events.length > 0 && (
          <span
            className={cn(
              "h-1 w-full rounded-full",
              EVENT_TINT[cell.events[0]!.kind] ?? "bg-sticky",
            )}
          />
        )}
        {items.map((item) => (
          <span key={item.key} className={cn("size-2 rounded-full", DOT[item.colour])} />
        ))}
      </span>
      {/* A desktop: the events, then sessions and rides with sport and minutes. */}
      <span
        aria-hidden
        className={cn("hidden min-w-0 flex-col gap-1 @3xl:flex", !cell.inMonth && "opacity-75")}
      >
        {cell.events.map((e) => (
          <span
            key={e.id}
            className={cn(
              "flex min-w-0 items-center gap-1 rounded-sm px-1 text-2xs font-medium",
              EVENT_TINT[e.kind] ?? "bg-sticky/70 text-sticky-ink",
            )}
          >
            <EventIcon kind={e.kind} className="size-3" />
            {e.first && <span className="truncate">{e.title}</span>}
          </span>
        ))}
        {items.slice(0, hidden > 0 ? ROOM - 1 : ROOM).map((item) => (
          <span
            key={item.key}
            className={cn(
              "flex min-w-0 items-center gap-1 rounded-sm border-l-2 px-1 text-2xs font-medium tabular-nums",
              COLOUR_STYLE[item.colour].chip,
              COLOUR_STYLE[item.colour].edge,
            )}
          >
            <SportIcon sport={item.sport} className="size-3" />
            <span className="truncate">{durationText(item.minutes, duration)}</span>
          </span>
        ))}
        {hidden > 0 && (
          <span className="text-meta text-2xs">{t("more", { count: hidden + 1 })}</span>
        )}
      </span>
    </Link>
  );
}

"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CalendarEventCard, EventResult, RiderOption } from "./types";

/** "3." for a place, or what stood there instead: DNF. */
export function placeText(result: Pick<EventResult, "place" | "placeNote">): string {
  return result.place !== null ? `${result.place}.` : result.placeNote || "–";
}

/**
 * Under a race read from Cykling Danmark (ADR 0039): where it came from,
 * for everyone who opens it, and — for a coach — the results on it, the
 * class, the place and the result list at Sportstiming. Quiet on purpose:
 * information for the coach, not a scoreboard.
 */
export function EventResults({
  event,
  riders,
}: {
  event: CalendarEventCard;
  riders: RiderOption[];
}) {
  const t = useTranslations("calendar.event.results");
  const results = event.results ?? [];
  if (event.source !== "dcu" && results.length === 0) return null;
  const nameOf = (riderId: string) => riders.find((r) => r.id === riderId)?.name ?? "";
  return (
    <div className="bg-muted/60 flex flex-col gap-2 rounded-md px-3 py-2 text-sm">
      {event.source === "dcu" && <p className="text-meta text-xs">{t("source")}</p>}
      {results.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label={t("label")}>
          {results.map((r) => (
            <li
              key={`${r.riderId}-${r.resultUrl}`}
              className="flex flex-wrap items-baseline gap-x-2"
            >
              <span className="font-semibold tabular-nums">{placeText(r)}</span>
              <span className="min-w-0">
                {event.riderId === null && (
                  <span className="font-medium">{nameOf(r.riderId)} · </span>
                )}
                {r.race}
              </span>
              <span className="text-meta text-xs">{r.raceClass}</span>
              <a
                href={r.resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-primary inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
              >
                {t("list")}
                <ExternalLink aria-hidden className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {results.length > 0 && <p className="text-meta text-xs">{t("coachOnly")}</p>}
    </div>
  );
}

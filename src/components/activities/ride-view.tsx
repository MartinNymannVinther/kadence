"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { clockText } from "@/components/training/duration";
import type { PauseMark } from "./pause-marks";
import { findPauses, withoutPauses } from "./pauses";
import { RouteMap } from "./route-map";
import { RouteMapGl } from "./route-map-gl";
import { StreamsChart, type Streams } from "./streams-chart";

/**
 * The route and the ride over time, sharing one moment: reading the
 * curves at a time moves the dot on the route to where the rider was. A
 * ride without GPS — a trainer indoors — has no route section at all.
 */
export function RideView({
  streams,
  titles,
  km,
  withMap,
}: {
  streams: Streams;
  titles: { route: string; streams: string };
  km: string;
  /** The installation has a map file (ADR 0023): the route goes on a map. */
  withMap: boolean;
}) {
  const t = useTranslations("activities.pauses");
  const [at, setAt] = useState<number | null>(null);
  const [hide, setHide] = useState(false);
  const pauses = useMemo(() => findPauses(streams), [streams]);
  const view = useMemo(
    () => (hide && pauses.length > 0 ? withoutPauses(streams, pauses) : null),
    [hide, pauses, streams],
  );
  const label = (kind: string, seconds: number) =>
    t(kind as "soda", { time: clockText(Math.round(seconds)) });
  const marks: PauseMark[] = view
    ? view.joins.map(({ t: seam, pause }) => ({
        from: seam,
        to: seam,
        kind: pause.kind,
        label: label(pause.kind, pause.seconds),
      }))
    : pauses.map((p) => ({
        from: streams.t[p.start]!,
        to: streams.t[p.end]! + (streams.t[1] ?? 5) - (streams.t[0] ?? 0),
        kind: p.kind,
        label: label(p.kind, p.seconds),
      }));
  // The chart reads its own clock; the route wants the original sample.
  const onIndex = useCallback(
    (index: number | null) =>
      setAt(index === null ? null : view ? (view.index[index] ?? null) : index),
    [view],
  );
  // Memoised: a new list would rebuild the map on every pointer move.
  const stops = useMemo(
    () =>
      pauses.flatMap((p) => {
        // Where the rider stopped: the last fix before the pause, since a
        // device that paused recorded nothing during it.
        let i = p.start;
        while (i > 0 && typeof streams.lat?.[i] !== "number") i--;
        const lat = streams.lat?.[i];
        const lon = streams.lon?.[i];
        return typeof lat === "number" && typeof lon === "number"
          ? [
              {
                lat,
                lon,
                kind: p.kind,
                label: t(p.kind, { time: clockText(Math.round(p.seconds)) }),
              },
            ]
          : [];
      }),
    [pauses, streams, t],
  );
  const hasRoute =
    (streams.lat ?? []).some((v) => typeof v === "number") &&
    (streams.lon ?? []).some((v) => typeof v === "number");

  return (
    <>
      {hasRoute && (
        <section aria-labelledby="activity-route" className="flex flex-col gap-3">
          <h2 id="activity-route" className="text-lg font-semibold">
            {titles.route}
          </h2>
          {withMap ? (
            <RouteMapGl
              lat={streams.lat ?? []}
              lon={streams.lon ?? []}
              at={at}
              km={km}
              stops={stops}
            />
          ) : (
            <RouteMap lat={streams.lat ?? []} lon={streams.lon ?? []} at={at} km={km} />
          )}
        </section>
      )}
      <section aria-labelledby="activity-streams" className="flex flex-col gap-3">
        <h2 id="activity-streams" className="text-lg font-semibold">
          {titles.streams}
        </h2>
        {pauses.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-2sm sm:min-h-9">
              <input
                type="checkbox"
                checked={hide}
                onChange={(e) => setHide(e.target.checked)}
                className="accent-primary size-4"
              />
              {t("hide", { count: pauses.length })}
            </label>
            <p className="text-meta text-xs leading-relaxed">{t("note")}</p>
          </div>
        )}
        <StreamsChart streams={view?.streams ?? streams} onIndex={onIndex} pauses={marks} />
      </section>
    </>
  );
}

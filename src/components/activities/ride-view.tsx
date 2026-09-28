"use client";

import { useState } from "react";
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
  const [at, setAt] = useState<number | null>(null);
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
            <RouteMapGl lat={streams.lat ?? []} lon={streams.lon ?? []} at={at} km={km} />
          ) : (
            <RouteMap lat={streams.lat ?? []} lon={streams.lon ?? []} at={at} km={km} />
          )}
        </section>
      )}
      <section aria-labelledby="activity-streams" className="flex flex-col gap-3">
        <h2 id="activity-streams" className="text-lg font-semibold">
          {titles.streams}
        </h2>
        <StreamsChart streams={streams} onIndex={setAt} />
      </section>
    </>
  );
}

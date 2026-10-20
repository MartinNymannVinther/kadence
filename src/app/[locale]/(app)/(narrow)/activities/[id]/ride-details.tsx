import { useLocale, useTranslations } from "next-intl";
import { ActivitySummary, type PlanFit } from "@/components/activities/activity-summary";
import { BestPowers } from "@/components/activities/best-powers";
import { ClimbsList } from "@/components/activities/climbs-list";
import { LapsTable } from "@/components/activities/laps-table";
import { PlanVsRideTable } from "@/components/activities/plan-vs-ride-table";
import { PowerCurve } from "@/components/activities/power-curve";
import { RideView } from "@/components/activities/ride-view";
import type { Streams } from "@/components/activities/streams-chart";
import { ZoneTime } from "@/components/activities/zone-time";
import { num } from "@/components/charts/format";
import type { ActivityRow } from "@/core/db/schema";
import type { MapVersions } from "@/core/map/paths";
import type { ClimbSummary, LapSummary } from "@/modules/fit";
import type { PlanVsRide } from "@/modules/load";
import type { getRiderRecords } from "@/modules/training/records";

/** A ride read before the power curve kept only the five tiles' durations. */
const BEST_TILES = 5;

const isStreams = (value: unknown): value is Streams =>
  typeof value === "object" && value !== null && Array.isArray((value as Streams).t);

/**
 * Everything under "Mere data" on a ride's page (docs/adr/0063): the
 * numbers after the first four, the route and the ride over time, the
 * plan step by step, laps, climbs, time in zones and the power curve.
 */
export function RideDetails({
  activity,
  plan,
  planResult,
  sessionTitle,
  map,
  riderRecords,
}: {
  activity: ActivityRow;
  plan: PlanFit | null;
  planResult: PlanVsRide | null;
  sessionTitle: string | null;
  map: MapVersions | null;
  riderRecords: Awaited<ReturnType<typeof getRiderRecords>> | null;
}) {
  const t = useTranslations("activities");
  const locale = useLocale();
  const streams = isStreams(activity.streams) ? activity.streams : null;
  const zones = (activity.zoneSeconds ?? null) as { power?: number[]; hr?: number[] } | null;
  const best = (activity.bestPowers ?? {}) as Record<string, number>;
  const fromFile = activity.source !== "manual";
  const laps = (Array.isArray(activity.laps) ? activity.laps : []) as LapSummary[];
  const climbs = (Array.isArray(activity.climbs) ? activity.climbs : []) as ClimbSummary[];
  const hasPower = activity.avgPower !== null && activity.avgPower > 0;

  return (
    <>
      <ActivitySummary facts={activity} plan={plan} part="rest" />

      {fromFile &&
        (streams ? (
          <RideView
            streams={streams}
            titles={{ route: t("routeTitle"), streams: t("streamsTitle") }}
            km={num((activity.distanceM ?? 0) / 1000, locale, 1)}
            map={map}
          />
        ) : (
          <section aria-labelledby="activity-streams" className="flex flex-col gap-3">
            <h2 id="activity-streams" className="text-lg font-semibold">
              {t("streamsTitle")}
            </h2>
            <p className="text-meta text-2sm">{t("noStreams")}</p>
          </section>
        ))}

      {planResult && sessionTitle !== null && (
        <section aria-labelledby="activity-plan" className="flex flex-col gap-3">
          <h2 id="activity-plan" className="text-lg font-semibold">
            {t("plan.title", { title: sessionTitle })}
          </h2>
          <PlanVsRideTable result={planResult} />
        </section>
      )}

      {laps.length > 0 && (
        <section aria-labelledby="activity-laps" className="flex flex-col gap-3">
          <h2 id="activity-laps" className="text-lg font-semibold">
            {t("lapsTitle")}
          </h2>
          <LapsTable laps={laps} />
        </section>
      )}

      {climbs.length > 0 && (
        <section aria-labelledby="activity-climbs" className="flex flex-col gap-3">
          <h2 id="activity-climbs" className="text-lg font-semibold">
            {t("climbsTitle")}
          </h2>
          <ClimbsList climbs={climbs} />
          <p className="text-meta text-xs leading-relaxed">{t("climbs.note")}</p>
        </section>
      )}

      {fromFile && (
        <section aria-labelledby="activity-zones" className="flex flex-col gap-3">
          <h2 id="activity-zones" className="text-lg font-semibold">
            {t("zonesTitle")}
          </h2>
          <ZoneTime
            zoneSeconds={zones}
            hasPower={hasPower}
            hasHr={activity.avgHr !== null && activity.avgHr > 0}
          />
          <p className="text-meta text-xs leading-relaxed">{t("zonesNote")}</p>
        </section>
      )}

      {hasPower && (
        <section aria-labelledby="activity-best" className="flex flex-col gap-3">
          <h2 id="activity-best" className="text-lg font-semibold">
            {t("bestTitle")}
          </h2>
          <BestPowers best={best} />
          {Object.keys(best).length > BEST_TILES && (
            <>
              <h3 className="mt-2 text-sm font-semibold">{t("curveTitle")}</h3>
              <PowerCurve
                best={best}
                compare={
                  riderRecords
                    ? { curves: riderRecords.curves, setBy: riderRecords.setBy }
                    : undefined
                }
              />
              <p className="text-meta text-xs leading-relaxed">{t("curveNote")}</p>
            </>
          )}
        </section>
      )}
    </>
  );
}

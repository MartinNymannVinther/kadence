import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ActivityActions } from "@/components/activities/activity-actions";
import { ActivityFeedback } from "@/components/activities/activity-feedback";
import { ActivitySummary } from "@/components/activities/activity-summary";
import { BestPowers } from "@/components/activities/best-powers";
import { ClimbsList } from "@/components/activities/climbs-list";
import { LapsTable } from "@/components/activities/laps-table";
import { PlanVsRideTable } from "@/components/activities/plan-vs-ride-table";
import { PowerCurve } from "@/components/activities/power-curve";
import { RideView } from "@/components/activities/ride-view";
import type { Streams } from "@/components/activities/streams-chart";
import { TogetherSection } from "@/components/activities/together-section";
import { ZoneTime } from "@/components/activities/zone-time";
import { calendarHref } from "@/components/calendar/href";
import { num } from "@/components/charts/format";
import { CommentThread } from "@/components/session/comment-thread";
import { dayLong } from "@/components/training/day-label";
import { SportIcon } from "@/components/training/sport-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { getOrgContext } from "@/core/auth/session";
import { mapAvailable } from "@/core/map/file";
import { mondayOf } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import type { ClimbSummary, LapSummary } from "@/modules/fit";
import { planVsRide } from "@/modules/load";
import { bikeStructureSchema } from "@/modules/workouts/structure";
import { whoAmI } from "@/modules/team/access";
import { getRider } from "@/modules/team/riders";
import { getActivityFileName } from "@/modules/devices/import";
import { formatOfName } from "@/modules/files";
import { getActivity, getActivitySession } from "@/modules/training/activities";
import { listCompanions } from "@/modules/training/companions";
import { getRiderRecords } from "@/modules/training/records";
import { listComments } from "@/modules/training/comments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities");
  return { title: t("title") };
}

/** A ride read before the power curve kept only the five tiles' durations. */
const BEST_TILES = 5;

const isStreams = (value: unknown): value is Streams =>
  typeof value === "object" && value !== null && Array.isArray((value as Streams).t);

/**
 * One ride or session that was done: what it came to, the route and the
 * ride over time, its laps and climbs, time in zones and the power curve,
 * how it felt, and the conversation about
 * it — with the original file to take out again and the way to delete it.
 * Whoever may read the rider's training may read this; the coach and the
 * rider may change it (ADR 0011).
 */
export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("activities");
  const sports = await getTranslations("training.sport");
  const { id } = await params;
  const [me, activity] = await Promise.all([whoAmI(ctx.orgId, ctx.userId), getActivity(ctx, id)]);
  if (!me || !activity) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <EmptyState title={t("missing")} hint={t("missingHint")} />
      </div>
    );
  }
  const [rider, session, comments, fileName, withMap, riderRecords, companions] = await Promise.all(
    [
      getRider(ctx, activity.riderId),
      getActivitySession(ctx, activity.id),
      listComments(ctx, { activityId: activity.id }),
      activity.source === "fit" ? getActivityFileName(ctx, activity.id) : null,
      mapAvailable(),
      activity.avgPower !== null && activity.avgPower > 0
        ? getRiderRecords(ctx, activity.riderId, { activityId: activity.id })
        : null,
      activity.sport === "bike" ? listCompanions(ctx, activity) : [],
    ],
  );
  const format = fileName ? formatOfName(fileName) : null;
  const canWrite = me.isCoach || me.rider?.id === activity.riderId;
  const back = calendarHref({
    week: mondayOf(activity.onDate),
    rider: me.rider?.id === activity.riderId ? null : activity.riderId,
  });
  const streams = isStreams(activity.streams) ? activity.streams : null;
  const zones = (activity.zoneSeconds ?? null) as { power?: number[]; hr?: number[] } | null;
  const best = (activity.bestPowers ?? {}) as Record<string, number>;
  const started = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(activity.startedAt);
  const fromFile = activity.source !== "manual";
  const laps = (Array.isArray(activity.laps) ? activity.laps : []) as LapSummary[];
  const plan = session?.sport === "bike" ? bikeStructureSchema.safeParse(session.structure) : null;
  const planResult =
    plan?.success && streams && rider
      ? planVsRide(plan.data, streams, { ftp: rider.ftpWatts, thresholdHr: rider.thresholdHr })
      : null;
  const climbs = (Array.isArray(activity.climbs) ? activity.climbs : []) as ClimbSummary[];

  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-7">
      <Link
        href={back}
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-primary text-2sm font-medium first-letter:uppercase">
          {dayLong(activity.onDate, locale)}
          {fromFile ? ` · ${t("startedAt", { time: started })}` : ""}
          {rider ? ` · ${rider.name}` : ""}
        </p>
        <h1 className="flex items-center gap-2 text-[1.625rem] leading-tight font-semibold tracking-[-0.02em]">
          <SportIcon sport={activity.sport} className="size-5" />
          {activity.title || sports(activity.sport as "bike")}
        </h1>
        <p className="text-meta text-2sm">
          {format === "fit" || format === "tcx" || format === "gpx"
            ? t("sourceFormat", { format: format.toUpperCase() })
            : t(`source.${activity.source}` as "source.fit")}
          {session && (
            <>
              {" · "}
              <Link
                href={`/calendar/session/${session.id}`}
                className="focus-ring text-primary font-medium hover:underline"
              >
                {t("session", { title: session.title })}
              </Link>
            </>
          )}
        </p>
      </header>

      <ActivitySummary facts={activity} />

      {fromFile &&
        (streams ? (
          <RideView
            streams={streams}
            titles={{ route: t("routeTitle"), streams: t("streamsTitle") }}
            km={num((activity.distanceM ?? 0) / 1000, locale, 1)}
            withMap={withMap}
          />
        ) : (
          <section aria-labelledby="activity-streams" className="flex flex-col gap-3">
            <h2 id="activity-streams" className="text-lg font-semibold">
              {t("streamsTitle")}
            </h2>
            <p className="text-meta text-2sm">{t("noStreams")}</p>
          </section>
        ))}

      {planResult && session && (
        <section aria-labelledby="activity-plan" className="flex flex-col gap-3">
          <h2 id="activity-plan" className="text-lg font-semibold">
            {t("plan.title", { title: session.title })}
          </h2>
          <PlanVsRideTable result={planResult} />
        </section>
      )}

      <TogetherSection activityId={activity.id} companions={companions} />

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
            hasPower={activity.avgPower !== null && activity.avgPower > 0}
            hasHr={activity.avgHr !== null && activity.avgHr > 0}
          />
          <p className="text-meta text-xs leading-relaxed">{t("zonesNote")}</p>
        </section>
      )}

      {activity.avgPower !== null && activity.avgPower > 0 && (
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

      <section aria-labelledby="activity-feel" className="flex flex-col gap-3">
        <h2 id="activity-feel" className="text-lg font-semibold">
          {t("feelTitle")}
        </h2>
        <ActivityFeedback
          canWrite={canWrite}
          activity={{
            id: activity.id,
            movingSeconds: activity.movingSeconds,
            distanceM: activity.distanceM,
            rpe: activity.rpe,
            feel: activity.feel,
            note: activity.note,
            load: activity.load,
            source: activity.source,
          }}
        />
      </section>

      <section aria-labelledby="activity-comments" className="flex max-w-2xl flex-col gap-3">
        <h2 id="activity-comments" className="text-lg font-semibold">
          {t("commentsTitle", { count: comments.length })}
        </h2>
        <CommentThread
          target={{ activityId: activity.id }}
          comments={comments}
          currentUserId={ctx.userId}
          isCoach={me.isCoach}
          canWrite={canWrite}
        />
      </section>

      <div className="border-border flex flex-col gap-2 border-t pt-5">
        <ActivityActions
          activityId={activity.id}
          hasFile={fromFile}
          canWrite={canWrite}
          afterDeleteHref={back}
        />
      </div>
    </div>
  );
}

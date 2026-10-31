import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ActivityActions } from "@/components/activities/activity-actions";
import { ActivityFeedback } from "@/components/activities/activity-feedback";
import { ActivitySummary, type PlanFit } from "@/components/activities/activity-summary";
import { FtpRaisedHint } from "@/components/activities/ftp-raised-hint";
import { MoreData } from "@/components/activities/more-data";
import type { Streams } from "@/components/activities/streams-chart";
import { TogetherSection } from "@/components/activities/together-section";
import { calendarHref } from "@/components/calendar/href";
import { CommentThread } from "@/components/session/comment-thread";
import { colourOf } from "@/components/training/compliance-mark";
import { dayLong } from "@/components/training/day-label";
import { SportIcon } from "@/components/training/sport-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { getOrgContext } from "@/core/auth/session";
import { mapVersions } from "@/core/map/installed";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { Link, redirect } from "@/i18n/navigation";
import { indoorFromStreams, rideName, rideNameText } from "@/modules/activities/ride-name";
import { planVsRide } from "@/modules/load";
import { ftpLooksRaised } from "@/modules/load/threshold-estimate";
import { bikeStructureSchema } from "@/modules/workouts/structure";
import { whoAmI } from "@/modules/team/access";
import { getRider } from "@/modules/team/riders";
import { garminAttribution } from "@/modules/devices/attribution";
import { getActivityFileName } from "@/modules/devices/import";
import { formatOfName } from "@/modules/files";
import { getActivity, getActivitySession } from "@/modules/training/activities";
import { listCompanions } from "@/modules/training/companions";
import { getRiderRecords } from "@/modules/training/records";
import { listComments } from "@/modules/training/comments";
import { getSession } from "@/modules/training/sessions";
import { RideDetails } from "./ride-details";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities");
  return { title: t("title") };
}

/** How long after a ride its page may still say it beat the saved FTP. */
const RAISED_HINT_DAYS = 30;

const isStreams = (value: unknown): value is Streams =>
  typeof value === "object" && value !== null && Array.isArray((value as Streams).t);

/**
 * One ride or session that was done: four numbers first — time, distance,
 * climbing, and how close it came to the plan or the average pulse — and
 * how it felt; under "Mere data" the rest of the numbers, the route and
 * the ride over time, the plan step by step, laps and climbs, time in
 * zones and the power curve (docs/adr/0063). Then who rode along and the
 * conversation about it, with the original file to take out again and
 * the way to delete it. Whoever may read the rider's training may read
 * this; the coach and the rider may change it (ADR 0011).
 */
export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("activities");
  const names = await getTranslations("activities.names");
  const { id } = await params;
  const [me, activity] = await Promise.all([whoAmI(ctx.orgId, ctx.userId), getActivity(ctx, id)]);
  if (!me || !activity) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <EmptyState title={t("missing")} hint={t("missingHint")} />
      </div>
    );
  }
  const [rider, session, comments, fileName, map, riderRecords, companions] = await Promise.all([
    getRider(ctx, activity.riderId),
    getActivitySession(ctx, activity.id),
    listComments(ctx, { activityId: activity.id }),
    activity.source === "fit" ? getActivityFileName(ctx, activity.id) : null,
    mapVersions(),
    activity.avgPower !== null && activity.avgPower > 0
      ? getRiderRecords(ctx, activity.riderId, { activityId: activity.id })
      : null,
    activity.sport === "bike" ? listCompanions(ctx, activity) : [],
  ]);
  // The planned side, for how close the ride came to it.
  const planned = session ? await getSession(ctx, session.id) : null;
  const format = fileName ? formatOfName(fileName) : null;
  const canWrite = me.isCoach || me.rider?.id === activity.riderId;
  // A recent ride that beats the saved FTP points to the proposal (docs/adr/0094).
  const ftpRaised =
    canWrite &&
    activity.sport === "bike" &&
    activity.onDate >= addDaysIso(todayInCopenhagen(), -RAISED_HINT_DAYS) &&
    ftpLooksRaised(activity.bestPowers as Record<string, number> | null, rider?.ftpWatts ?? null);
  const back = calendarHref({
    week: mondayOf(activity.onDate),
    rider: me.rider?.id === activity.riderId ? null : activity.riderId,
  });
  const streams = isStreams(activity.streams) ? activity.streams : null;
  const started = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(activity.startedAt);
  const fromFile = activity.source !== "manual";
  const name = rideNameText(
    rideName({
      ...activity,
      sessionTitle: session?.title,
      indoor: indoorFromStreams(activity.streams),
    }),
    names,
  );
  const plan = session?.sport === "bike" ? bikeStructureSchema.safeParse(session.structure) : null;
  const planResult =
    plan?.success && streams && rider
      ? planVsRide(plan.data, streams, { ftp: rider.ftpWatts, thresholdHr: rider.thresholdHr })
      : null;
  const fit: PlanFit | null = planned
    ? {
        colour: colourOf(planned, todayInCopenhagen()),
        steps:
          planResult && planResult.judged > 0
            ? { hit: planResult.hit, judged: planResult.judged }
            : null,
      }
    : null;

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
        <h1 className="flex items-center gap-2 text-title-section leading-tight font-semibold tracking-[-0.02em]">
          <SportIcon sport={activity.sport} className="size-5" />
          {name}
        </h1>
        <p className="text-meta text-2sm">
          {/* Garmin's attribution, directly under the title (src/modules/devices/attribution.ts). */}
          {garminAttribution(activity) ??
            (format === "fit" || format === "tcx" || format === "gpx"
              ? t("sourceFormat", { format: format.toUpperCase() })
              : t(`source.${activity.source}` as "source.fit"))}
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

      <ActivitySummary facts={activity} plan={fit} part="first" />
      {ftpRaised && (
        <FtpRaisedHint riderId={activity.riderId} own={me.rider?.id === activity.riderId} />
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

      <MoreData userId={ctx.userId} defaultOpen={me.isCoach}>
        <RideDetails
          activity={activity}
          plan={fit}
          planResult={planResult}
          sessionTitle={session?.title ?? null}
          map={map}
          riderRecords={riderRecords}
        />
      </MoreData>

      <TogetherSection activityId={activity.id} companions={companions} />

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

import { Bike, Clock, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { withQuery } from "@/components/calendar/href";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionMenu } from "@/components/calendar/session-menu";
import { toCard } from "@/components/calendar/to-card";
import { ComplianceMark, colourOf } from "@/components/training/compliance-mark";
import { dayLong } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { StructureView } from "@/components/workouts/structure-view";
import { todayInCopenhagen } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { listDeviceLinks } from "@/modules/devices/links";
import { refsInStructure } from "@/modules/exercises/program-session";
import { resolveExercises } from "@/modules/exercises/resolve";
import type { Me } from "@/modules/team/access";
import { getRider, getRiders } from "@/modules/team/riders";
import { getActivity } from "@/modules/training/activities";
import { listComments } from "@/modules/training/comments";
import { getSession as getPlannedSession } from "@/modules/training/sessions";
import { clockText } from "@/modules/training/time-place";
import { readStructure } from "@/modules/workouts/structure";
import { modelConfigured } from "@/modules/ai/service";
import { getTeamSettings } from "@/modules/team/settings";
import { AiComment } from "./ai-comment";
import { CommentThread } from "./comment-thread";
import { DeviationInline } from "./deviation-inline";
import { CompleteForm } from "./complete-form";
import { DoneSummary } from "./done-summary";
import { ExportMenu } from "./export-menu";
import { PushButtons } from "./push-buttons";
import { SendToDeviceButton } from "./send-to-device-button";

/**
 * One planned session, whole: what it is, how to ride it for this rider,
 * whether it was done and how it felt, and the conversation about it.
 * Rendered in the calendar's panel and on the session's own page. The
 * database decides whether the caller may see it at all; a parent sees
 * everything and writes nothing (ADR 0011, 0012). A bike session with
 * steps can be taken to a trainer or head unit as a file, and sent to the
 * rider's connected Wahoo or Garmin by the rider or a coach; the rider can
 * ride it indoors in Rulle, and a coach try it there (ADR 0033). When it
 * went off its plan, why stands under its mark; once done, the rider or a
 * coach may ask the AI for a short comment on it (ADR 0095).
 */
export async function SessionView({
  ctx,
  me,
  sessionId,
  closeHref,
  heading = "h2",
}: {
  ctx: OrgContext;
  me: Me;
  sessionId: string;
  /** Where the page goes once the session is deleted. */
  closeHref: string;
  heading?: "h1" | "h2";
}) {
  const t = await getTranslations("session");
  const sports = await getTranslations("training.sport");
  const duration = await getTranslations("training.duration");
  const when = await getTranslations("training.when");
  const locale = await getLocale();
  const session = await getPlannedSession(ctx, sessionId);
  if (!session) {
    return <EmptyState variant="inline" title={t("notFound")} hint={t("notFoundHint")} />;
  }

  const ownSession = me.rider?.id === session.riderId;
  const canWrite = me.isCoach || ownSession;
  const [rider, comments, activity, team] = await Promise.all([
    getRider(ctx, session.riderId),
    listComments(ctx, { plannedSessionId: session.id }),
    session.activity ? getActivity(ctx, session.activity.id) : null,
    me.isCoach ? getRiders(ctx) : [],
  ]);
  const card = toCard(session);
  const sport = card.sport as "bike" | "strength" | "other";
  const structure = readStructure(session.structure, sport);
  const exportable = structure.kind === "bike" && structure.steps.length > 0;
  // A programme's exercises carry their place in the library: the figure
  // and how-to of those this reader may see (src/modules/exercises/resolve.ts).
  const exercises =
    structure.kind === "strength"
      ? await resolveExercises(ctx, refsInStructure(structure), await getTranslations("exercises"))
      : {};
  const pushTo =
    exportable && canWrite && !card.activity
      ? (await listDeviceLinks(ctx, session.riderId))
          .filter((l) => l.canPush && l.status === "connected")
          .map((l) => l.provider)
      : [];
  const today = todayInCopenhagen();
  const Heading = heading;
  // The AI's comment: only on a done session, for whoever may write on it,
  // with a model, and where the AI may read riders' data (ADR 0017, 0095).
  const aiComment =
    activity !== null &&
    canWrite &&
    (await modelConfigured(ctx)) &&
    (await getTeamSettings(ctx)).aiOnRiderData;

  return (
    <article className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-primary text-2sm font-medium first-letter:uppercase">
          {dayLong(card.onDate, locale)}
          {rider ? ` · ${rider.name}` : ""}
        </p>
        <div className="flex items-start justify-between gap-3">
          <Heading className="text-title-section leading-tight font-semibold tracking-[-0.02em]">
            {card.title}
          </Heading>
          {canWrite && (
            <SessionMenu
              session={card}
              riders={team.map((r) => ({ id: r.id, name: r.name }))}
              isCoach={me.isCoach}
              afterDeleteHref={closeHref}
            />
          )}
        </div>
        <div className="text-meta flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2sm">
          <span className="flex items-center gap-1.5">
            <SportIcon sport={sport} />
            {sports(sport)}
          </span>
          {card.plannedMinutes > 0 && <span>{durationText(card.plannedMinutes, duration)}</span>}
          {card.plannedKm ? <span>{t("km", { km: card.plannedKm })}</span> : null}
          {card.startTime && (
            <span className="flex items-center gap-1.5">
              <Clock aria-hidden className="size-4" />
              {when("time", { time: clockText(card.startTime, locale) })}
            </span>
          )}
          {card.meetingPlace && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin aria-hidden className="size-4 shrink-0" />
              <span className="sr-only">{when("place")}: </span>
              <span className="min-w-0 break-words">{card.meetingPlace}</span>
            </span>
          )}
          <ComplianceMark
            colour={colourOf(card, today)}
            done={card.activity !== null}
            isToday={card.onDate === today}
          />
          {card.groupKey && <Badge variant="outline">{t("group")}</Badge>}
        </div>
        <DeviationInline ctx={ctx} session={session} activity={activity} today={today} />
      </header>

      {card.description && (
        <p className="text-reading leading-relaxed whitespace-pre-line">{card.description}</p>
      )}

      <section aria-labelledby="session-structure" className="flex flex-col gap-3">
        <h3 id="session-structure" className="text-base font-semibold">
          {t("structure")}
        </h3>
        <StructureView
          structure={structure}
          rider={rider ? { ftp: rider.ftpWatts, thresholdHr: rider.thresholdHr } : null}
          programmeSession={card.programmeSession}
          exercises={exercises}
        />
        {exportable && (
          <div className="flex flex-col items-start gap-2">
            {(ownSession || me.isCoach) && !card.activity && (
              <Link
                href={withQuery("/rulle", { session: card.id })}
                className={cn(buttonVariants({ variant: "outline" }), "max-sm:h-11")}
              >
                <Bike data-icon="inline-start" />
                {ownSession ? t("indoors") : t("tryIndoors")}
              </Link>
            )}
            <ExportMenu sessionId={card.id} />
            <SendToDeviceButton
              sessions={[{ id: card.id, title: card.title, onDate: card.onDate }]}
            />
            {pushTo.length > 0 && <PushButtons sessionId={card.id} providers={pushTo} />}
          </div>
        )}
      </section>

      <section aria-labelledby="session-done" className="flex flex-col gap-3">
        <h3 id="session-done" className="text-base font-semibold">
          {t("doneTitle")}
        </h3>
        {activity ? (
          <DoneSummary
            sessionId={card.id}
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
        ) : canWrite ? (
          <CompleteForm sessionId={card.id} plannedMinutes={card.plannedMinutes} sport={sport} />
        ) : (
          <p className="text-meta text-2sm">{t("notDoneYet")}</p>
        )}
        {aiComment && <AiComment sessionId={card.id} />}
      </section>

      <section aria-labelledby="session-comments" className="flex flex-col gap-3">
        <h3 id="session-comments" className="text-base font-semibold">
          {t("commentsTitle", { count: comments.length })}
        </h3>
        <CommentThread
          target={{ plannedSessionId: card.id }}
          comments={comments}
          currentUserId={ctx.userId}
          isCoach={me.isCoach}
          canWrite={canWrite}
        />
      </section>
    </article>
  );
}

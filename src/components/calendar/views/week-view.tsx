import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { basisText } from "@/components/season/basis-text";
import { TeamAttention } from "@/components/insight/team-attention";
import { teamAttentionData } from "@/components/insight/team-attention-data";
import { ATTENTION_ID } from "@/components/insight/signals";
import { mondayOf } from "@/core/dates";
import { refreshStaleRaces } from "@/modules/results/refresh";
import { listRaceResults } from "@/modules/results/service";
import { volumesFor } from "@/modules/season/volumes";
import { WeekNoteProvider } from "@/components/training/week-note";
import { getTeamName } from "@/modules/team/name";
import { listUnplanned } from "@/modules/training/activities";
import { listEvents } from "@/modules/training/events";
import { listSessions } from "@/modules/training/sessions";
import { listOwnTemplates, listTemplates } from "@/modules/training/templates";
import { weekDates } from "@/modules/training/week";
import { calendarHref } from "../href";
import { RiderWeek } from "../rider-week";
import { TeamGrid } from "../team-grid";
import { toActivityCard, toCard, toEventCard, withResults } from "../to-card";
import { WeekNav } from "../week-nav";
import type { ViewProps } from "./types";

/**
 * The calendar's week, for one rider or — for a coach — the whole team:
 * the place a week is planned and read in detail. The team's week in
 * progress also carries the signals — each rider's flags as badges, and
 * under the grid the attention list, the AI's summary and the coach's
 * tips — so that is where a coach sees who needs a talk (ADR 0062).
 */
export async function WeekView({
  ctx,
  me,
  today,
  locale,
  riderRows,
  visible,
  rider,
  teamView,
  query,
  monday,
}: ViewProps & { monday: string }) {
  const days = weekDates(monday);
  const range = { from: monday, to: days[6] ?? monday };
  const riderIds = teamView ? visible.map((r) => r.id) : [rider.id];
  const canWrite = me.isCoach || me.rider?.id === rider.id;

  // Flags belong to the week in progress (ADR 0026), so the signals come with that week only.
  const thisMonday = mondayOf(today);
  const [sessions, unplanned, eventRows, results, templates, volumes, attention, teamName] =
    await Promise.all([
      listSessions(ctx, { ...range, riderIds }),
      listUnplanned(ctx, { ...range, riderIds }),
      listEvents(ctx, { ...range, riderIds }),
      // The places from Cykling Danmark are the coach's (ADR 0039).
      me.isCoach ? listRaceResults(ctx, { ...range, riderIds }) : Promise.resolve([]),
      canWrite ? listTemplates(ctx) : Promise.resolve([]),
      volumesFor(ctx, riderIds, range, today),
      teamView && monday === thisMonday
        ? teamAttentionData(ctx, { today, locale, riders: riderRows })
        : Promise.resolve(null),
      getTeamName(ctx),
    ]);
  // A rider plans their own sessions into their own calendar too (ADR 0050).
  const ownTemplates =
    canWrite && !teamView && me.rider?.id === rider.id
      ? await listOwnTemplates(ctx, { riderId: rider.id })
      : [];
  const events = withResults(eventRows.map(toEventCard), results);
  // A coach's visit puts the stale riders' races in the queue (ADR 0039,
  // 0085). after() only for the putting in, which is a query or two the
  // page need not wait for; the reading is a job. Lost in a deploy, it
  // loses nothing: the hourly dcu.races job finds the same riders.
  if (me.isCoach) after(() => refreshStaleRaces(ctx, riderIds));
  const templateOptions = [...ownTemplates, ...templates].map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    sport: tpl.sport,
    plannedMinutes: tpl.plannedMinutes,
    source: tpl.source,
  }));
  const volume = teamView ? null : (volumes.get(rider.id) ?? null);
  const seasonT = await getTranslations("season");

  return (
    <>
      <WeekNav monday={monday} today={today} query={query} />
      {teamView ? (
        <TeamGrid
          riders={visible}
          days={days}
          today={today}
          sessions={sessions.map(toCard)}
          activities={unplanned.map(toActivityCard)}
          events={events}
          templates={templateOptions}
          query={query}
          volumes={Object.fromEntries(volumes)}
          signals={attention?.signals ?? {}}
          teamName={teamName}
        />
      ) : (
        <WeekNoteProvider volume={volume}>
          <RiderWeek
            riderId={rider.id}
            days={days}
            today={today}
            sessions={sessions.map(toCard)}
            activities={unplanned.map(toActivityCard)}
            events={events}
            canWrite={canWrite}
            isCoach={me.isCoach}
            riders={me.isCoach ? visible : [rider]}
            templates={templateOptions}
            query={query}
            volume={volume}
            basisLabel={volume?.basis ? basisText(volume.basis, (k, v) => seasonT(k, v)) : null}
            teamName={teamName}
          />
        </WeekNoteProvider>
      )}
      {teamView && (
        <TeamAttention
          data={attention}
          thisWeekHref={`${calendarHref({ view: "team" })}#${ATTENTION_ID}`}
        />
      )}
    </>
  );
}

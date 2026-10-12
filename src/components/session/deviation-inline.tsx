import { getLocale, getTranslations } from "next-intl/server";
import {
  deviationWords,
  type DeviationT,
  type DurationT,
} from "@/components/training/deviation-text";
import { weekNoteOf } from "@/components/training/week-note";
import { addDaysIso, mondayOf } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { deviation, type ZoneSecondsBySource } from "@/modules/load";
import { volumesFor } from "@/modules/season/volumes";
import { readStructure } from "@/modules/workouts/structure";

/**
 * Why the session went off its plan, written out under its mark in the
 * session's panel (docs/adr/0095): the same heading and facts the
 * calendar's popover shows, here with the ride's time in zones too, and
 * the week's sentence from the four numbers of the session's week.
 * Nothing at all when the session went as planned or is still ahead.
 */
export async function DeviationInline({
  ctx,
  session,
  activity,
  today,
}: {
  ctx: OrgContext;
  session: {
    riderId: string;
    onDate: string;
    sport: string;
    structure: unknown;
    plannedMinutes: number;
    plannedLoad: number | null;
  };
  activity: { movingSeconds: number; load: number | null; zoneSeconds: unknown } | null;
  today: string;
}) {
  const sport = session.sport as "bike" | "strength" | "other";
  const explained = deviation(
    {
      minutes: session.plannedMinutes,
      load: session.plannedLoad,
      structure: readStructure(session.structure, sport),
    },
    activity
      ? {
          minutes: activity.movingSeconds / 60,
          load: activity.load,
          zoneSeconds: (activity.zoneSeconds ?? null) as ZoneSecondsBySource,
        }
      : null,
    session.onDate,
    today,
  );
  if (!explained.heading) return null;
  const monday = mondayOf(session.onDate);
  const volumes = await volumesFor(
    ctx,
    [session.riderId],
    { from: monday, to: addDaysIso(monday, 6) },
    today,
  );
  const t = await getTranslations("training.deviation");
  const duration = await getTranslations("training.duration");
  const words = deviationWords(
    explained,
    session.sport,
    t as unknown as DeviationT,
    duration as unknown as DurationT,
    await getLocale(),
    weekNoteOf(volumes.get(session.riderId)),
  );
  if (!words) return null;
  return (
    <div className="border-border flex flex-col gap-1 border-l-2 pl-3 text-2sm">
      <p className="font-semibold">{words.heading}</p>
      {words.lines.map((line) => (
        <p key={line} className="text-meta leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}

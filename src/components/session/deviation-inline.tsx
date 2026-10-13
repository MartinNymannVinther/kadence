import { getLocale, getTranslations } from "next-intl/server";
import {
  countedNumbers,
  deviationWords,
  type DeviationReader,
  type DeviationT,
  type DurationT,
} from "@/components/training/deviation-text";
import { weekNoteOf } from "@/components/training/week-note-of";
import { addDaysIso, mondayOf } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { Link } from "@/i18n/navigation";
import { deviation, type LoadMethod, type ZoneSecondsBySource } from "@/modules/load";
import { volumesFor } from "@/modules/season/volumes";
import { readStructure } from "@/modules/workouts/structure";

/**
 * Why the session went off its plan, written out under its mark in the
 * session's panel (docs/adr/0095): the same heading and sentences the
 * calendar's popover shows, here with the ride's time in zones too, and
 * the week's sentence from the four numbers of the session's week. Under
 * them, closed, "Sådan er det regnet": what load is, in two sentences,
 * and this ride's and the plan's — the only place the numbers appear
 * (the amendment of 13 October). Nothing at all when the session went as
 * planned or is still ahead.
 */
export async function DeviationInline({
  ctx,
  session,
  activity,
  today,
  reader,
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
  activity: {
    movingSeconds: number;
    load: number | null;
    loadMethod: string;
    rpe: number | null;
    zoneSeconds: unknown;
  } | null;
  today: string;
  reader: DeviationReader;
}) {
  const sport = session.sport as "bike" | "strength" | "other";
  const explained = deviation(
    {
      sport,
      minutes: session.plannedMinutes,
      load: session.plannedLoad,
      structure: readStructure(session.structure, sport),
    },
    activity
      ? {
          minutes: activity.movingSeconds / 60,
          load: activity.load,
          zoneSeconds: (activity.zoneSeconds ?? null) as ZoneSecondsBySource,
          method: activity.loadMethod as LoadMethod,
          rpe: activity.rpe,
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
  const locale = await getLocale();
  const words = deviationWords(
    explained,
    session.sport,
    t as unknown as DeviationT,
    duration as unknown as DurationT,
    locale,
    weekNoteOf(volumes.get(session.riderId)),
    reader,
  );
  if (!words) return null;
  const numbers = countedNumbers(explained, locale);
  return (
    <div className="border-border flex flex-col gap-1 border-l-2 pl-3 text-2sm">
      <p className="font-semibold">{words.heading}</p>
      {words.lines.map((line) => (
        <p key={line} className="text-meta leading-relaxed">
          {line}
        </p>
      ))}
      {words.hint && (
        <p className="text-meta leading-relaxed">
          {words.hint.text}{" "}
          <Link
            href={words.hint.href}
            className="focus-ring text-primary font-medium hover:underline"
          >
            {words.hint.link}
          </Link>
        </p>
      )}
      {numbers && (
        <details className="text-meta mt-1">
          <summary className="focus-ring w-fit cursor-pointer rounded-sm font-medium">
            {t("howCounted.summary")}
          </summary>
          <p className="mt-1 leading-relaxed">{t("howCounted.body")}</p>
          <p className="leading-relaxed">{t("howCounted.numbers", numbers)}</p>
        </details>
      )}
    </div>
  );
}

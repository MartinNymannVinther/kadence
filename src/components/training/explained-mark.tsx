"use client";

import { Popover } from "@base-ui/react/popover";
import { useLocale, useTranslations } from "next-intl";
import { deviation, type Deviation } from "@/modules/load";
import { readStructure } from "@/modules/workouts/structure";
import { ComplianceMark, stateKey, type PlannedLike } from "./compliance-mark";
import { deviationWords, type DeviationT, type DurationT } from "./deviation-text";
import { useWeekNote } from "./week-note";

/**
 * The compliance mark that explains itself (docs/adr/0095): on a yellow
 * or red session it is a button that opens a small popover with why — a
 * heading in plain words, two or three lines of facts, and the week's
 * sentence when the page knows the week. Anywhere else it is the plain
 * mark. Base UI's popover gives the button its aria-expanded and closes
 * on Escape and on a click outside, as the calendar's month jump does.
 */

export type ExplainableSession = PlannedLike & { sport: string; structure?: unknown };

/** The deviation for a calendar card: time and load (zones are not on the card). */
export function cardDeviation(session: ExplainableSession, today: string): Deviation {
  const sport = session.sport as "bike" | "strength" | "other";
  return deviation(
    {
      minutes: session.plannedMinutes,
      load: session.plannedLoad,
      structure:
        session.structure !== undefined && ["bike", "strength", "other"].includes(sport)
          ? readStructure(session.structure, sport)
          : null,
    },
    session.activity
      ? { minutes: session.activity.movingSeconds / 60, load: session.activity.load }
      : null,
    session.onDate,
    today,
  );
}

export function ExplainedMark({
  session,
  today,
  className,
}: {
  session: ExplainableSession;
  today: string;
  className?: string;
}) {
  const t = useTranslations("training.deviation");
  const states = useTranslations("training.state");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const week = useWeekNote();
  const explained = cardDeviation(session, today);
  const done = session.activity !== null;
  const isToday = session.onDate === today;
  const words = deviationWords(
    explained,
    session.sport,
    t as unknown as DeviationT,
    duration as unknown as DurationT,
    locale,
    week,
  );
  if (!words)
    return (
      <ComplianceMark
        colour={explained.colour}
        done={done}
        isToday={isToday}
        className={className}
      />
    );
  const word = states(stateKey(explained.colour, done, isToday) as "planned");
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t("open", { state: word })}
        className="focus-ring hover:ring-ring/40 w-fit cursor-pointer rounded-full hover:ring-2"
      >
        <ComplianceMark
          colour={explained.colour}
          done={done}
          isToday={isToday}
          className={className}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="border-border bg-popover text-popover-foreground flex w-72 flex-col gap-1.5 rounded-xl border p-3 text-2sm shadow-lg outline-none">
            <Popover.Title className="text-sm font-semibold">{words.heading}</Popover.Title>
            {words.lines.map((text) => (
              <p key={text} className="leading-relaxed">
                {text}
              </p>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

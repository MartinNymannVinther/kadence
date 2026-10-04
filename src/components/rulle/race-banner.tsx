"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { Beeps } from "./ride/beeps";
import type { RaceLive } from "./ride/race";

/** Seconds the call stays up as he comes. */
const CALL = 4.5;

const ARCADE =
  "animate-in fade-in zoom-in-75 bg-foreground/90 border-sticky max-w-md rounded-2xl border-4 px-8 py-5 text-center shadow-[var(--dialog-shadow)] duration-300 motion-reduce:animate-none";

/**
 * The challenger's race on the screen (ADR 0049): as he comes up, a call
 * in the cheat code's arcade manner — a race, how far, that his wheel
 * breaks the wind, and that only the landscape races; while it runs, the
 * distance left and the gap in the road's top corner, clear of him; at the line, who won
 * and by how much. A fanfare as he comes, a cowbell for a win.
 */
export function RaceBanner({ race, beeps }: { race: NonNullable<RaceLive>; beeps: Beeps }) {
  const t = useTranslations("rulle.challenge");
  const format = useFormatter();
  const was = useRef<RaceLive>(null);

  useEffect(() => {
    const before = was.current?.phase ?? null;
    was.current = race;
    if (race.phase === before) return;
    if (race.phase === "racing") beeps.play("fanfare");
    else beeps.play(race.won ? "cheer" : "fanfareOff");
  }, [race, beeps]);

  const metres = (m: number) => Math.round(Math.abs(m));

  if (race.phase === "over")
    return (
      <div
        role="status"
        className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4"
      >
        <div className={ARCADE}>
          <p className="text-sticky text-4xl font-black tracking-[0.3em] uppercase">
            {race.won ? t("won") : t("lost")}
          </p>
          <p className="text-background mt-1 text-lg font-semibold">
            {t("margin", { m: metres(race.margin) })}
          </p>
        </div>
      </div>
    );

  const km = format.number(race.left / 1000, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const gap =
    race.gap > 0.5
      ? t("ahead", { m: metres(race.gap) })
      : race.gap < -0.5
        ? t("behind", { m: metres(race.gap) })
        : t("level");
  return (
    <>
      {race.seconds < CALL && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4"
        >
          <div className={ARCADE}>
            <p className="text-sticky text-4xl font-black tracking-[0.3em] uppercase">
              {t("title")}
            </p>
            <p className="text-background mt-1 text-lg font-semibold">
              {race.hill ? t("onHill") : t("on")}
            </p>
            <p className="text-background/85 mt-3 text-sm">{t("draft")}</p>
            <p className="text-background/70 mt-2 text-xs">{t("honest")}</p>
          </div>
        </div>
      )}
      <div className="bg-foreground/85 pointer-events-none absolute top-3 left-3 flex w-max items-baseline gap-3 rounded-xl px-4 py-2 shadow-[var(--surface-shadow)] sm:left-4 lg:left-6">
        <span className="text-sticky text-sm font-black tracking-[0.25em] uppercase">
          {t("badge")}
        </span>
        <span className="text-background text-2xl font-black tabular-nums">
          {t("left", { km })}
        </span>
        <span className="text-background/85 text-lg font-semibold tabular-nums">{gap}</span>
      </div>
    </>
  );
}

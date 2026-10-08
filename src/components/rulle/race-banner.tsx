"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Beeps } from "./ride/beeps";
import type { RaceLive } from "./ride/race";

/** Seconds "go" stays up after the start. */
const GO = 1.5;

/**
 * The challenger's race on the screen (ADR 0074), or the sprinter's (ADR
 * 0075), each with his own words: as he comes up of himself, his offer of
 * a race, with a yes and a no to click; said yes to, or called by his
 * code, a call
 * in the cheat code's arcade manner — a race, how far, that his wheel
 * breaks the wind, that only the landscape races — over the count from
 * ten; "go" at the start; while it runs, the distance left and the gap in
 * the road's top corner, clear of him; at the line, who won and by how
 * much. A fanfare as he comes, a beep for each of the last three, a
 * whistle for the start, a cowbell for a win.
 */
export function RaceBanner({
  race,
  beeps,
  onAnswer,
}: {
  race: NonNullable<RaceLive>;
  beeps: Beeps;
  /** The rider's answer to his offer. */
  onAnswer: (yes: boolean) => void;
}) {
  const t = useTranslations("rulle.challenge");
  const format = useFormatter();
  const was = useRef<RaceLive>(null);

  useEffect(() => {
    const before = was.current;
    was.current = race;
    if (race.phase === "offer") {
      if (before?.phase !== "offer") beeps.play("fanfare");
    } else if (race.phase === "countdown") {
      if (before?.phase === "countdown") {
        if (race.count !== before.count && race.count <= 3) beeps.play("count");
        // Said yes to, he is already beside the rider: the fanfare was for his offer.
      } else if (before?.phase !== "offer") beeps.play("fanfare");
    } else if (race.phase !== before?.phase) {
      if (race.phase === "racing") beeps.play("whistle");
      else beeps.play(race.won ? "cheer" : "fanfareOff");
    }
  }, [race, beeps]);

  const metres = (m: number) => Math.round(Math.abs(m));

  if (race.phase === "over")
    return (
      <Call title={race.won ? t("won") : t("lost")}>
        <p className="text-background mt-1 text-lg font-semibold">
          {t("margin", { m: metres(race.margin) })}
        </p>
      </Call>
    );

  if (race.phase === "offer")
    return (
      <Call title={t("title")}>
        <p className="text-background mt-1 text-lg font-semibold">
          {race.who === "sprinter" ? t("sprinterOffer") : race.hill ? t("offerHill") : t("offer")}
        </p>
        <div className="pointer-events-auto mt-4 flex justify-center gap-3">
          <Button size="lg" onClick={() => onAnswer(true)}>
            {t("yes")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => onAnswer(false)}>
            {t("no")}
          </Button>
        </div>
        <p className="text-background/70 mt-3 text-xs">{t("waits", { s: race.wait })}</p>
      </Call>
    );

  if (race.phase === "countdown")
    return (
      <Call title={t("title")}>
        <p className="text-background mt-1 text-lg font-semibold">
          {race.who === "sprinter" ? t("sprinter") : race.hill ? t("onHill") : t("on")}
        </p>
        <p className="text-sticky mt-2 text-7xl leading-none font-black tabular-nums">
          {race.count}
        </p>
        <p className="text-background/85 mt-3 text-sm">
          {race.who === "sprinter" ? t("sprinterWheel") : t("draft")}
        </p>
        <p className="text-background/70 mt-2 text-xs">{t("honest")}</p>
      </Call>
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
      {race.seconds < GO && <Call title={t("go")} />}
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

/** A call in the middle of the road, in the arcade manner. */
function Call({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4"
    >
      <div className="animate-in fade-in zoom-in-75 bg-foreground/90 border-sticky max-w-md rounded-2xl border-4 px-8 py-5 text-center shadow-[var(--dialog-shadow)] duration-300 motion-reduce:animate-none">
        <p className="text-sticky text-4xl font-black tracking-[0.3em] uppercase">{title}</p>
        {children}
      </div>
    </div>
  );
}

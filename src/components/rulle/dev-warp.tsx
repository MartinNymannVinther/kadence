"use client";

import { Rewind, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WARPS } from "./ride/warp";

/**
 * Development only (`next dev`): the rider's way along the route run
 * faster — two, four, eight or twenty times — or backwards, to look at a
 * route without riding it. "," and "." step the speed down and up, B
 * turns the way round, and G calls the challenger up (ADR 0049). Never
 * drawn in a build that is shipped; `hidden`
 * with nothing but the rider and the land on screen, its keys still at
 * work.
 */
export function DevWarp({
  onWarp,
  onChallenge,
  hidden = false,
}: {
  onWarp: (factor: number) => void;
  /** The challenger, called up now rather than ten kilometres on (ADR 0049). */
  onChallenge: () => void;
  hidden?: boolean;
}) {
  const t = useTranslations("rulle.dev");
  const [step, setStep] = useState(0);
  const [back, setBack] = useState(false);
  const warp = useRef(onWarp);

  useEffect(() => {
    warp.current = onWarp;
  });

  const choose = (nextStep: number, nextBack: boolean) => {
    setStep(nextStep);
    setBack(nextBack);
    const factor = WARPS[nextStep]!;
    warp.current(nextBack ? -factor : factor);
  };

  const latest = useRef({ step, back, choose, challenge: onChallenge });
  useEffect(() => {
    latest.current = { step, back, choose, challenge: onChallenge };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { step: now, back: backwards, choose: go } = latest.current;
      if (event.key === ".") go(Math.min(WARPS.length - 1, now + 1), backwards);
      else if (event.key === ",") go(Math.max(0, now - 1), backwards);
      else if (event.key.toLowerCase() === "b") go(now, !backwards);
      else if (event.key.toLowerCase() === "g") latest.current.challenge();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (hidden) return null;
  return (
    <div
      className="bg-card/85 border-border absolute top-3 right-3 flex items-center gap-1 rounded-xl border p-1 shadow-[var(--surface-shadow)] sm:right-4 lg:right-6"
      role="group"
      aria-label={t("title")}
      title={t("hint")}
    >
      <span className="text-meta px-1.5 text-xs font-semibold tracking-wide uppercase">
        {t("title")}
      </span>
      <Button
        size="xs"
        variant={back ? "default" : "outline"}
        aria-pressed={back}
        aria-label={t("back")}
        onClick={() => choose(step, !back)}
      >
        <Rewind />
      </Button>
      {WARPS.map((factor, index) => (
        <Button
          key={factor}
          size="xs"
          variant={index === step ? "default" : "outline"}
          aria-pressed={index === step}
          className="tabular-nums"
          onClick={() => choose(index, back)}
        >
          {t("times", { factor })}
        </Button>
      ))}
      <Button size="xs" variant="outline" aria-label={t("challenge")} onClick={onChallenge}>
        <Swords />
      </Button>
    </div>
  );
}

"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { wheelTurns, type BikeCheck } from "@/modules/calc/gearing";
import { cn } from "@/lib/utils";

/**
 * The sum behind the drawing in one sentence, then the bike's biggest
 * gear against its class: how far under or over in centimetres, and the
 * way back within it. Status is said in words with an icon, never by
 * colour alone, and only the status is read aloud as the sliders move.
 */
export function GearingResult({
  check,
  limit,
  className,
  circumferenceMm,
}: {
  check: BikeCheck;
  limit: number | null;
  className: string;
  circumferenceMm: number;
}) {
  const t = useTranslations("calculators.gearing.result");
  const cm = check.marginM === null ? 0 : Math.round(Math.abs(check.marginM) * 100);
  const tone =
    check.status === "over"
      ? "bg-warning-tint text-destructive"
      : check.status === "close"
        ? "bg-sticky text-sticky-ink"
        : "bg-secondary text-foreground";
  const Icon =
    check.status === "over" ? CircleAlert : check.status === "close" ? TriangleAlert : CircleCheck;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-reading leading-relaxed">
        {t("explain", {
          ring: check.ring,
          cog: check.cog,
          turns: wheelTurns(check.ring, check.cog),
          circumference: circumferenceMm / 1000,
          rollout: check.rolloutM,
        })}
      </p>
      <p
        aria-live="polite"
        className={cn("flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed", tone)}
      >
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
        {limit === null ? t("free") : t(check.status as "over", { cm, class: className, limit })}
      </p>
      {check.status === "over" && (
        <p className="text-reading leading-relaxed">
          {t("wayBack", {
            cog: check.cog,
            ring: check.ring,
            largestRing: check.largestRing ?? 0,
            smallestCog: check.smallestCog ?? 0,
          })}
        </p>
      )}
    </div>
  );
}

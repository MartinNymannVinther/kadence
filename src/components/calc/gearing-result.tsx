"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BikeCheck } from "@/modules/calc/gearing";
import { cn } from "@/lib/utils";

/**
 * The bike's biggest gear against its class: the rollout, the limit, how
 * far under or over in centimetres, and the way back within it. Status
 * is said in words with an icon, never by colour alone.
 */
export function GearingResult({
  check,
  limit,
  className,
}: {
  check: BikeCheck;
  limit: number | null;
  className: string;
}) {
  const t = useTranslations("calculators.gearing.result");
  const cm = check.marginM === null ? 0 : Math.abs(check.marginM) * 100;
  const tone =
    check.status === "over"
      ? "bg-warning-tint text-destructive"
      : check.status === "close"
        ? "bg-sticky text-sticky-ink"
        : "bg-secondary text-foreground";
  const Icon =
    check.status === "over" ? CircleAlert : check.status === "close" ? TriangleAlert : CircleCheck;

  return (
    <section
      aria-live="polite"
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5"
    >
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-reading">
        {t("gear", { ring: check.ring, cog: check.cog, rollout: check.rolloutM })}
      </p>
      {limit === null ? (
        <p className={cn("flex items-start gap-2 rounded-md px-3 py-2 text-2sm", tone)}>
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("free")}
        </p>
      ) : (
        <>
          <p className="text-meta text-2sm">{t("limit", { class: className, limit })}</p>
          <p
            className={cn(
              "flex items-start gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed",
              tone,
            )}
          >
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t(check.status as "over", { cm })}
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
        </>
      )}
    </section>
  );
}

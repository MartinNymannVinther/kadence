"use client";

import { useTranslations } from "next-intl";
import { propose } from "@/modules/calc/gear-build";
import { ringsFor } from "@/modules/calc/gear-products";
import { largestRing, rolloutM } from "@/modules/calc/gearing";
import { GearBuildCard } from "./gear-build-card";
import { RingList } from "./ring-list";

/**
 * How the bike could be built (ADR 0055): a concrete build for the gear
 * on the sliders — or, when it is over the limit, the two nearest builds
 * that hold, one keeping the chainring and one keeping the sprocket —
 * each drawn and named part by part. Then every chainring that keeps the
 * chosen sprocket within the class.
 */
export function GearProducts({
  ring,
  cog,
  limit,
  circumferenceMm,
  className,
}: {
  ring: number;
  cog: number;
  limit: number | null;
  circumferenceMm: number;
  className: string;
}) {
  const t = useTranslations("calculators.gearing.products");
  const proposal = propose(ring, cog, limit, circumferenceMm);
  const overCm =
    limit === null ? 0 : Math.round((rolloutM(ring, cog, circumferenceMm) - limit) * 100);

  return (
    <section className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("intro")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">{t("build.title")}</h3>
        {proposal.kind === "fits" ? (
          <>
            <p className="text-reading leading-relaxed">
              {limit === null
                ? t("build.fitsFree", { class: className })
                : t("build.fits", { class: className })}
              {proposal.asked !== null &&
                ` ${t("build.asked", { asked: proposal.asked, used: proposal.build.ring })}`}
            </p>
            <GearBuildCard
              build={proposal.build}
              title={null}
              limit={limit}
              className={className}
            />
          </>
        ) : (
          <>
            <p className="text-reading leading-relaxed">
              {t("build.over", { class: className, cm: overCm })}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {proposal.keepRing ? (
                <GearBuildCard
                  build={proposal.keepRing}
                  title={t("build.keepRing", {
                    ring: proposal.keepRing.ring,
                    cog: proposal.keepRing.cog,
                  })}
                  limit={limit}
                  className={className}
                />
              ) : (
                <p className="bg-secondary rounded-lg p-3 text-2sm leading-relaxed">
                  {t("build.keepRingNone", { ring, cog: proposal.needCog })}
                </p>
              )}
              {proposal.keepCog ? (
                <GearBuildCard
                  build={proposal.keepCog}
                  title={t("build.keepCog", { cog, ring: proposal.keepCog.ring })}
                  limit={limit}
                  className={className}
                />
              ) : (
                <p className="bg-secondary rounded-lg p-3 text-2sm leading-relaxed">
                  {t("build.keepCogNone", { cog })}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {limit !== null && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">{t("rings", { cog })}</h3>
            <p className="text-reading leading-relaxed">
              {t("ringsLimit", {
                cog,
                max: largestRing(cog, limit, circumferenceMm),
                class: className,
              })}
            </p>
          </div>
          <RingList fits={ringsFor(cog, limit, circumferenceMm)} />
        </div>
      )}
    </section>
  );
}

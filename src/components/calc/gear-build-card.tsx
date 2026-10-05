"use client";

import { useLocale, useTranslations } from "next-intl";
import { ORDINARY_RANGE, type Build } from "@/modules/calc/gear-build";
import { cn } from "@/lib/utils";
import { DrivetrainDrawing } from "./drivetrain-drawing";
import { formatPrice } from "./format";
import { Outlink } from "./outlink";

/**
 * One concrete build: its drivetrain drawn, then the cassette, the
 * chainring and the gear they give, each with where it was seen. An
 * ordinary 10 or 11 T cassette is named as ordinary, without a product.
 */
export function GearBuildCard({
  build,
  title,
  limit,
  className,
}: {
  build: Build;
  title: string | null;
  limit: number | null;
  className: string;
}) {
  const t = useTranslations("calculators.gearing.products.build");
  const p = useTranslations("calculators.gearing.products");
  const locale = useLocale();
  const { cassette, cassette11, chainring } = build;
  const range = cassette ? cassette.version : ORDINARY_RANGE[build.cog]!;
  const speeds = cassette?.cassette.speeds ?? 12;
  const cm = limit === null ? null : Math.round((limit - build.rolloutM) * 100);
  const row = "flex flex-col gap-0.5";
  const term = "text-label text-xs font-medium";

  return (
    <article className="border-border flex min-w-0 flex-col gap-3 rounded-lg border p-3 sm:p-4">
      {title && <h4 className="font-semibold">{title}</h4>}
      <DrivetrainDrawing
        ring={build.ring}
        small={chainring?.set[1] ?? null}
        smallest={range[0]}
        largest={range[1]}
        speeds={speeds}
      />
      <dl className="flex flex-col gap-2.5 text-2sm leading-relaxed">
        <div className={row}>
          <dt className={term}>{t("cassette")}</dt>
          <dd>
            {cassette ? (
              <>
                <span className="font-semibold">
                  {cassette.cassette.name} {cassette.version[0]}-{cassette.version[1]}
                </span>{" "}
                <span className="text-meta text-xs">{t("speeds", { speeds })}</span>
              </>
            ) : (
              t("ordinary", { cog: build.cog })
            )}
          </dd>
          {cassette && (
            <dd className="text-meta text-xs">{p(`items.${cassette.cassette.id}` as "title")}</dd>
          )}
          {cassette && (
            <dd className="text-meta flex flex-wrap items-center gap-x-3 text-xs">
              {cassette.cassette.price && (
                <span>
                  {t("price", {
                    price: formatPrice(cassette.cassette.price, locale),
                    shop: cassette.cassette.price.seenAt,
                  })}
                </span>
              )}
              <Outlink href={cassette.cassette.url} label={t("link")} />
            </dd>
          )}
          {cassette11 && (
            <dd className="text-meta text-xs">
              {t("also11", {
                name: cassette11.cassette.name,
                version: `${cassette11.version[0]}-${cassette11.version[1]}`,
              })}
            </dd>
          )}
        </div>
        <div className={row}>
          <dt className={term}>{t("ring")}</dt>
          <dd>
            {chainring ? (
              <>
                <span className="font-semibold">
                  {chainring.family.name}{" "}
                  {chainring.set.length === 2
                    ? `${chainring.set[0]}-${chainring.set[1]}`
                    : t("teeth", { n: build.ring })}
                </span>{" "}
                <span className="text-meta text-xs">
                  {chainring.set.length === 2 ? t("double") : t("single")}
                </span>
              </>
            ) : (
              t("noRing", { ring: build.ring })
            )}
          </dd>
          {chainring && (
            <dd className="text-meta text-xs">
              {p(`ringNotes.${chainring.family.id}` as "title")}
            </dd>
          )}
          {chainring && (
            <dd className="text-meta flex flex-wrap items-center gap-x-3 text-xs">
              {chainring.family.price && (
                <span>
                  {t("priceFrom", {
                    price: formatPrice(chainring.family.price, locale),
                    shop: chainring.family.price.seenAt,
                  })}
                </span>
              )}
              <Outlink href={chainring.family.url} label={t("link")} />
            </dd>
          )}
        </div>
        <div className={row}>
          <dt className={term}>{t("gear")}</dt>
          <dd className={cn("tabular-nums", cm !== null && cm < 5 && "font-semibold")}>
            {cm === null
              ? t("gearFree", { ring: build.ring, cog: build.cog, rollout: build.rolloutM })
              : t("gearWithin", {
                  ring: build.ring,
                  cog: build.cog,
                  rollout: build.rolloutM,
                  cm,
                  class: className,
                })}
          </dd>
        </div>
      </dl>
    </article>
  );
}

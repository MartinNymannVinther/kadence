"use client";

import { ExternalLink } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  cassetteFor,
  ORDINARY_COGS,
  ringsFor,
  type ChainringFamily,
  type RingsFit,
} from "@/modules/calc/gear-products";
import { largestRing } from "@/modules/calc/gearing";
import { formatPrice } from "./format";

const SPEEDS = [12, 11] as const;

/**
 * One way to build the gear chosen (ADR 0055): the cassette for the
 * smallest sprocket — none for an ordinary 10 or 11, else one concrete
 * cassette for 12- and for 11-speed — and the chainrings that keep that
 * sprocket within the class, two in front or one. Families with no ring
 * small enough are named together at the end.
 */
export function GearProducts({
  cog,
  limit,
  circumferenceMm,
  className,
}: {
  cog: number;
  limit: number | null;
  circumferenceMm: number;
  className: string;
}) {
  const t = useTranslations("calculators.gearing.products");
  const format = useFormatter();
  const locale = useLocale();
  const fits = ringsFor(cog, limit, circumferenceMm);
  const tooBig = fits.filter((f) => f.sets.length === 0).map((f) => f.family.name);
  const group = (kind: ChainringFamily["kind"]) =>
    fits.filter((f) => f.family.kind === kind && f.sets.length > 0);

  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">{t("intro")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-label text-xs font-medium">{t("cassette", { cog })}</h3>
        {ORDINARY_COGS.includes(cog) ? (
          <p className="text-reading leading-relaxed">
            {cog === 10 ? t("ordinary10") : t("ordinary11")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {SPEEDS.map((speeds) => {
              const pick = cassetteFor(cog, speeds);
              return (
                <li key={speeds} className="flex gap-3">
                  <span className="bg-secondary h-fit shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums">
                    {t("speeds", { speeds })}
                  </span>
                  {pick ? (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="font-semibold">
                        {pick.cassette.name}{" "}
                        <span className="tabular-nums">
                          {pick.version[0]}-{pick.version[1]}
                        </span>
                      </p>
                      <p className="text-2sm leading-relaxed">
                        {t(`items.${pick.cassette.id}` as "title")}
                      </p>
                      <p className="text-meta flex flex-wrap items-center gap-x-3 text-xs">
                        {pick.cassette.price && (
                          <span>
                            {t("price", {
                              price: formatPrice(pick.cassette.price, locale),
                              shop: pick.cassette.price.seenAt,
                            })}
                          </span>
                        )}
                        <Outlink href={pick.cassette.url} label={t("link")} />
                      </p>
                    </div>
                  ) : (
                    <p className="text-meta text-2sm leading-relaxed">
                      {t("none", { speeds, cog })}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-label text-xs font-medium">{t("rings")}</h3>
        {limit === null ? (
          <p className="text-reading leading-relaxed">{t("ringsFree", { class: className })}</p>
        ) : (
          <>
            <p className="text-reading leading-relaxed">
              {t("ringsLimit", {
                cog,
                max: largestRing(cog, limit, circumferenceMm),
                class: className,
              })}
            </p>
            {tooBig.length === fits.length ? (
              <p className="text-reading leading-relaxed">{t("noRings")}</p>
            ) : (
              (["double", "single"] as const).map(
                (kind) =>
                  group(kind).length > 0 && (
                    <div key={kind} className="flex flex-col gap-2 pt-1">
                      <p className="text-2sm font-medium">{t(kind)}</p>
                      <ul className="flex flex-col gap-2.5">
                        {group(kind).map((fit) => (
                          <RingRow key={fit.family.id} fit={fit} />
                        ))}
                      </ul>
                    </div>
                  ),
              )
            )}
            {tooBig.length > 0 && tooBig.length < fits.length && (
              <p className="text-meta text-2sm leading-relaxed">
                {t("tooBig", { names: format.list(tooBig, { type: "conjunction" }) })}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** A family's rings that fit: each double set, or the span of single rings. */
function RingRow({ fit }: { fit: RingsFit }) {
  const t = useTranslations("calculators.gearing.products");
  const locale = useLocale();
  const { family, sets } = fit;
  const chips =
    family.kind === "double"
      ? sets.map(([big, small]) => `${big}-${small}`)
      : [
          sets.length === 1
            ? t("ring", { n: sets[0]![0]! })
            : t("ringSpan", { from: sets.at(-1)![0]!, to: sets[0]![0]! }),
        ];
  return (
    <li className="flex flex-col gap-1">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold">{family.name}</span>
        {chips.map((chip) => (
          <span key={chip} className="bg-secondary rounded-md px-2 py-0.5 text-xs tabular-nums">
            {chip}
          </span>
        ))}
      </p>
      <p className="text-meta flex flex-wrap items-center gap-x-3 text-xs leading-relaxed">
        <span>{t(`ringNotes.${family.id}` as "title")}</span>
        {family.price && (
          <span>
            {t("priceFrom", {
              price: formatPrice(family.price, locale),
              shop: family.price.seenAt,
            })}
          </span>
        )}
        <Outlink href={family.url} label={t("ringsLink")} />
      </p>
    </li>
  );
}

function Outlink({ href, label }: { href: string; label: string }) {
  const open = useTranslations("open");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring text-primary inline-flex items-center gap-1 hover:underline"
    >
      {label}
      <ExternalLink aria-hidden className="size-3" />
      <span className="sr-only">{open("opensElsewhere")}</span>
    </a>
  );
}

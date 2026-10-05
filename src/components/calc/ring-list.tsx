"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ChainringFamily, RingsFit } from "@/modules/calc/gear-products";
import { formatPrice } from "./format";
import { Outlink } from "./outlink";

/** Two rings in front or one, as a small drawing beside the words. */
export function RingGlyph({
  kind,
  className = "size-6",
}: {
  kind: ChainringFamily["kind"];
  className?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`${className} shrink-0`}>
      <circle cx={12} cy={12} r={10} fill="none" stroke="currentColor" strokeWidth={2} />
      {kind === "double" && (
        <circle cx={12} cy={12} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
      )}
      <circle cx={12} cy={12} r={1.8} fill="currentColor" />
    </svg>
  );
}

/**
 * Every chainring of the kind chosen that keeps the chosen sprocket
 * within the class, with the families whose rings are all too big named
 * together at the end.
 */
export function RingList({ fits }: { fits: RingsFit[] }) {
  const t = useTranslations("calculators.gearing.products");
  const format = useFormatter();
  const tooBig = fits.filter((f) => f.sets.length === 0).map((f) => f.family.name);
  const fitting = fits.filter((f) => f.sets.length > 0);

  if (fitting.length === 0) return <p className="text-reading leading-relaxed">{t("noRings")}</p>;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {fitting.map((fit) => (
          <RingRow key={fit.family.id} fit={fit} />
        ))}
      </ul>
      {tooBig.length > 0 && (
        <p className="text-meta text-2sm leading-relaxed">
          {t("tooBig", { names: format.list(tooBig, { type: "conjunction" }) })}
        </p>
      )}
    </div>
  );
}

/** A family's rings that fit: each double set, or each size of single ring. */
function RingRow({ fit }: { fit: RingsFit }) {
  const t = useTranslations("calculators.gearing.products");
  const locale = useLocale();
  const { family, sets } = fit;
  // A double is a set of two rings; a single ring comes in sizes, each its own chip.
  const chips =
    family.kind === "double"
      ? sets.map(([big, small]) => `${big}-${small}`)
      : sets.map(([n]) => t("ring", { n: n! }));
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

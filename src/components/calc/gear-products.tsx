"use client";

import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { GEAR_PRODUCTS, type GearProduct } from "@/modules/calc/gear-products";
import { largestRing, smallestCog } from "@/modules/calc/gearing";
import { formatPrice } from "./format";

/**
 * Parts that could bring a bike within its class, as a neutral list. For
 * each version the calculator says what it allows with the class and
 * tyre chosen: the biggest chainring for a cassette's smallest sprocket,
 * or the smallest sprocket for a chainring set's big ring.
 */
export function GearProducts({
  limit,
  circumference,
  className,
}: {
  limit: number | null;
  circumference: number;
  className: string;
}) {
  const t = useTranslations("calculators.gearing.products");
  const open = useTranslations("open");
  const locale = useLocale();

  const versions = (product: GearProduct) =>
    product.kind === "cassette"
      ? product.ranges.map(([small, large]) =>
          limit === null
            ? t("fitsFree", { a: small, b: large })
            : t("cassetteFits", { small, large, ring: largestRing(small, limit, circumference) }),
        )
      : product.sets.map(([big, small]) =>
          limit === null
            ? t("fitsFree", { a: big, b: small })
            : t("chainringFits", { big, small, cog: smallestCog(big, limit, circumference) }),
        );

  return (
    <section className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)] sm:p-5">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-reading leading-relaxed">{t("intro")}</p>
      {limit !== null && (
        <p className="text-meta text-2sm">{t("forClass", { class: className })}</p>
      )}
      <ul className="flex flex-col gap-3">
        {GEAR_PRODUCTS.map((product) => (
          <li key={product.id} className="border-border flex flex-col gap-1 border-t pt-3">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{product.name}</span>
              <span className="text-meta text-xs">{t("speeds", { speeds: product.speeds })}</span>
            </p>
            <p className="text-2sm leading-relaxed">{t(`items.${product.id}` as "title")}</p>
            <ul className="flex flex-wrap gap-1.5">
              {versions(product).map((line) => (
                <li key={line} className="bg-secondary rounded-md px-2 py-0.5 text-xs tabular-nums">
                  {line}
                </li>
              ))}
            </ul>
            <p className="text-meta flex flex-wrap items-center gap-x-3 text-xs">
              <span>
                {product.price
                  ? t("price", {
                      price: formatPrice(product.price, locale),
                      shop: product.price.seenAt,
                    })
                  : t("noPrice")}
              </span>
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-primary inline-flex items-center gap-1 hover:underline"
              >
                {t("link")}
                <ExternalLink aria-hidden className="size-3" />
                <span className="sr-only">{open("opensElsewhere")}</span>
              </a>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

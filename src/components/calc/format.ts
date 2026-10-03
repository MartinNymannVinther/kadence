import type { Price } from "@/modules/calc/gear-products";

/** A seen price in its own currency, the reader's way: 999 kr., £209.99, 75 $. */
export function formatPrice(price: Price, locale: string): string {
  return new Intl.NumberFormat(locale === "da" ? "da-DK" : "en-GB", {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
  }).format(price.amount);
}

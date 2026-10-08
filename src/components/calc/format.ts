import type { Price } from "@/modules/calc/gear-products";

/** A seen price in its own currency, the reader's way: 999 kr., £209.99, 75 $. */
export function formatPrice(price: Price, locale: string): string {
  return new Intl.NumberFormat(locale === "da" ? "da-DK" : "en-GB", {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
  }).format(price.amount);
}

/** Minutes since midnight as the reader's clock: "07.30" in Danish, "07:30" in English. */
export function formatClock(minutes: number, locale: string): string {
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, 0, minutes)));
}

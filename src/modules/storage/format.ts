/**
 * A number of bytes as people read it: "350 MB", "1,2 GB" in Danish,
 * "1.2 GB" in English. Decimal units (1 GB = 1,000,000,000 bytes), as the
 * stores and the operating systems show them; the quotas themselves are
 * set in bytes (docs/adr/0087). Pure.
 */
export function formatBytes(bytes: number, locale: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte", "terabyte"] as const;
  let value = Math.max(0, bytes);
  let index = 0;
  while (value >= 1000 && index < units.length - 1) {
    value /= 1000;
    index += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[index],
    unitDisplay: "short",
    maximumFractionDigits: index >= 3 ? 1 : 0,
  }).format(value);
}

/** Gigabytes typed by a person, "20" or "2,5", as bytes; empty is null; anything else NaN. */
export function parseGigabytes(text: string): number | null {
  const trimmed = text.trim().replace(/\s|GB/gi, "").replace(",", ".");
  if (trimmed === "") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number(trimmed) * 1000 ** 3);
}

import type { FitErrorCode } from "@/modules/fit/errors";

/**
 * What `/api/share` wrote in the address when it landed on today's page
 * (src/modules/devices/share.ts), read back as keys of the catalogue. The
 * values are the address bar's, and anyone can write anything there: each
 * is one of a list or it is nothing, and none is looked up in the
 * catalogue as it came. Pure.
 */

const KINDS = [
  "imported",
  "duplicate",
  "refused",
  "not_a_rider",
  "rate_limited",
  "no_file",
] as const;
type Kind = (typeof KINDS)[number];

/**
 * Why the decoder refuses a file, each with words of its own in
 * `activities.upload.error`. Every code is here: a new one does not
 * compile until it is.
 */
const REASONS: Record<FitErrorCode, true> = {
  not_fit: true,
  truncated: true,
  bad_crc: true,
  too_large: true,
  unsupported: true,
  corrupt: true,
  empty: true,
  unknown_format: true,
  no_activity: true,
};

/** The most rides one share brings in (MAX_SHARED_FILES). */
const MAX_COUNT = 3;

export type SharedWords =
  | { kind: "imported"; count: number }
  | { kind: "refused"; reason: FitErrorCode | "generic" }
  | { kind: Exclude<Kind, "imported" | "refused"> };

export function sharedWords(
  shared: string | undefined,
  count: string | undefined,
  reason: string | undefined,
): SharedWords | null {
  if (!shared || !(KINDS as readonly string[]).includes(shared)) return null;
  const kind = shared as Kind;
  if (kind === "imported") {
    const n = /^[0-9]{1,3}$/.test(count ?? "") ? Number(count) : 1;
    return { kind, count: Math.min(Math.max(n, 1), MAX_COUNT) };
  }
  if (kind === "refused")
    return {
      kind,
      reason: reason && Object.hasOwn(REASONS, reason) ? (reason as FitErrorCode) : "generic",
    };
  return { kind };
}

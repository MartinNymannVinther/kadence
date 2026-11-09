/**
 * The device a ride was recorded on, as the provider names it ("Edge 1040",
 * "Forerunner 965"): kept on the ride as `activities.device_name`, where
 * Garmin's attribution reads it (src/modules/devices/attribution.ts, ADR
 * 0110). It comes from an unsigned push, so it is made plain before it
 * goes anywhere: letters, digits, spaces and a little punctuation, one
 * line, at most 80 characters, which is also what the job payload's
 * `device` field accepts (src/core/jobs/payload.ts). A ride entered by
 * hand on the provider's website has no device, and a provider's
 * "unknown" is no name. Pure.
 */

export const MAX_DEVICE_NAME = 80;

export function deviceModelName(
  raw: string | null | undefined,
  manual = false,
): string | undefined {
  if (manual) return undefined;
  const clean = (raw ?? "")
    .replace(/[^\p{L}\p{N} .,+&'()/_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .slice(0, MAX_DEVICE_NAME)
    // A cut through a character outside the basic plane leaves half of it.
    .replace(/[\uD800-\uDBFF]$/, "")
    .trim();
  if (!clean || /^unknown$/i.test(clean)) return undefined;
  return clean;
}

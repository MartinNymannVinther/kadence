import { isIPv4 } from "node:net";

/**
 * Where Garmin's pushes come from (docs/adr/0113). Garmin signs nothing it
 * sends, so the caller's address is one of the two things a push can be
 * checked by, beside the `garmin-client-id` header (garmin.ts). The ranges
 * are Garmin's own, as given to licensees; a range Garmin adds later is
 * refused until it is written here, and the refusal is logged by the
 * webhook, so it shows.
 *
 * Pure: the caller's address is read by `clientAddress()` behind the
 * installation's proxy (src/core/rate-limit.ts) and handed in.
 */

export const GARMIN_PUSH_RANGES: readonly string[] = [
  "204.77.162.0/23",
  "204.77.163.0/24",
  "98.199.124.0/23",
  "185.132.79.0/24",
  "208.65.206.0/23",
  "185.207.94.0/23",
  "198.233.176.0/24",
];

/** An IPv4 address as a 32-bit number, or null for anything else. */
function ipv4Number(address: string): number | null {
  if (!isIPv4(address)) return null;
  return address.split(".").reduce((n, part) => n * 256 + Number(part), 0);
}

/** The IPv4 address itself, or the one inside an IPv4-mapped IPv6 address (::ffff:a.b.c.d). */
function asIpv4(address: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address.trim());
  return mapped ? mapped[1]! : address.trim();
}

/** Whether `address` lies in the CIDR range `range` (IPv4 only). */
export function inRange(address: string, range: string): boolean {
  const [base, bitsText] = range.split("/");
  const bits = Number(bitsText);
  const ip = ipv4Number(asIpv4(address));
  const net = ipv4Number(base ?? "");
  if (ip === null || net === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const size = 2 ** (32 - bits);
  return Math.floor(ip / size) === Math.floor(net / size);
}

/** Whether a push from `address` may be Garmin's. */
export function fromGarmin(
  address: string,
  ranges: readonly string[] = GARMIN_PUSH_RANGES,
): boolean {
  return ranges.some((range) => inRange(address, range));
}

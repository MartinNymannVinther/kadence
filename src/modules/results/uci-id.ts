/**
 * The UCI ID on a rider's licence: eleven digits, printed in groups
 * ("101 585 903 34") on the card and on Cykling Danmark's pages, stored
 * without the spaces. Every rider with a DCU licence has one; it is the
 * key Cykling Danmark's member portal files a rider's results under
 * (docs/research/dcu-results.md).
 *
 * Pure: imports nothing, tested on its own.
 */

const DIGITS = /^[0-9]{11}$/;

/** The eleven digits of what a person typed, or null when it is not a UCI ID. */
export function parseUciId(raw: string): string | null {
  const digits = raw.replace(/[\s.-]/g, "");
  return DIGITS.test(digits) ? digits : null;
}

/** As the licence prints it: three, three, three and two. */
export function formatUciId(uciId: string): string {
  return DIGITS.test(uciId)
    ? `${uciId.slice(0, 3)} ${uciId.slice(3, 6)} ${uciId.slice(6, 9)} ${uciId.slice(9)}`
    : uciId;
}

/** The rider's public page at Cykling Danmark's member portal, where their results are. */
export function dcuProfileUrl(uciId: string): string {
  if (!DIGITS.test(uciId)) throw new Error("not a UCI ID");
  return `https://dcumedlem.sportstiming.dk/profile/${uciId}`;
}

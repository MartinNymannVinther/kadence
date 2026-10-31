/**
 * The SQLSTATE behind a failed query, or undefined when there is none.
 *
 * Drizzle wraps what the driver threw, so the database's own error is the
 * cause; `pg` puts the code on the error itself. Both are looked at, and
 * the chain is walked rather than assumed to be one deep.
 */
export function sqlStateOf(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

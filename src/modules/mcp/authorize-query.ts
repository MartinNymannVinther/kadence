/**
 * The way back into Better Auth's authorize endpoint after a person has
 * signed in (docs/adr/0118). Better Auth sends an assistant's sign-in to
 * /connect with the authorize request's parameters, signed; once there is
 * a session, the same request is made again without the signature, and
 * Better Auth goes on to the consent page. Kadence's own login has just
 * happened, so a request for a fresh login (`prompt=login`, `max_age`) is
 * already met and is dropped, or it would send the person round again.
 * Pure.
 */

const SIGNING = new Set(["sig", "exp", "ba_iat", "ba_pl", "ba_param"]);

export function authorizeQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const [key, value] of params) {
    if (SIGNING.has(key) || key === "max_age") continue;
    if (key === "prompt") {
      const rest = value
        .split(" ")
        .filter((p) => p && p !== "login")
        .join(" ");
      if (rest) out.append(key, rest);
      continue;
    }
    out.append(key, value);
  }
  return out.toString();
}

/** The search params of a page, as Next hands them, as one URLSearchParams. */
export function searchParamsOf(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) for (const v of value) params.append(key, v);
    else if (value !== undefined) params.append(key, value);
  }
  return params;
}

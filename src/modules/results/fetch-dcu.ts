import { env } from "@/core/env";
import { buildInfo } from "@/core/version";
import { DeviceHttpError, PROVIDER_TIMEOUT_MS, readLimited } from "@/modules/devices/http";
import { dcuProfileUrl } from "./uci-id";

/**
 * Fetches a rider's public page at Cykling Danmark's member portal
 * (docs/research/dcu-results.md). One host, one path, built from a UCI ID
 * that has already been read as eleven digits: there is nothing in the
 * request a person typed but those digits. No redirect is followed, the
 * answer is capped and must be HTML, and the request says who is asking —
 * Kadence, and the installation's own address — so the portal can see it
 * and say no.
 *
 * The page is a little under 100 KB for a rider with six seasons.
 */

const MAX_PAGE_BYTES = 1024 * 1024;

export async function fetchDcuProfile(uciId: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(dcuProfileUrl(uciId), {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      headers: {
        Accept: "text/html",
        "User-Agent": `Kadence/${buildInfo.version} (+${new URL(env.BETTER_AUTH_URL).origin})`,
      },
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new DeviceHttpError(
      name === "TimeoutError" || name === "AbortError" ? "timeout" : "network",
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new DeviceHttpError("status", response.status);
  }
  if (!(response.headers.get("content-type") ?? "").startsWith("text/html")) {
    await response.body?.cancel().catch(() => undefined);
    throw new DeviceHttpError("invalid_response");
  }
  const bytes = await readLimited(
    response.body,
    MAX_PAGE_BYTES,
    response.headers.get("content-length"),
  );
  return new TextDecoder("utf-8").decode(bytes);
}

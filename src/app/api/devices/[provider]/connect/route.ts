import { NextResponse } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { env } from "@/core/env";
import { rateLimit } from "@/core/rate-limit";
import { settingsUrl, startConnect } from "@/modules/devices/connect";
import { isProviderId } from "@/modules/devices/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts connecting the signed-in rider's Wahoo or Garmin account: sets
 * the short-lived, sealed state-and-verifier cookie and sends the browser
 * to the provider (src/modules/devices/connect.ts). Everything that is not
 * a rider with a configured provider lands back on the devices settings
 * with a short error code.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProviderId(provider)) return new Response("Not found", { status: 404 });
  const back = (path: string) => NextResponse.redirect(new URL(path, env.BETTER_AUTH_URL));

  const ctx = await requireOrgContext();
  if (!ctx) return back(settingsUrl({ error: "unauthorized" }));
  if (!rateLimit(`device-connect:${ctx.userId}`, 10, 10 * 60_000).allowed)
    return back(settingsUrl({ error: "rate_limited" }));

  const started = await startConnect(ctx, provider);
  if (!started.cookie) return back(started.location);
  const response = NextResponse.redirect(started.location);
  response.cookies.set(started.cookie.name, started.cookie.value, {
    httpOnly: true,
    secure: started.cookie.secure,
    sameSite: "lax",
    path: "/api/devices",
    maxAge: started.cookie.maxAge,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

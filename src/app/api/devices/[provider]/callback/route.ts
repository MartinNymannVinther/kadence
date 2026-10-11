import { NextResponse, type NextRequest } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { env } from "@/core/env";
import { rateLimit } from "@/core/rate-limit";
import { finishConnect, OAUTH_COOKIE, settingsUrl } from "@/modules/devices/connect";
import { loggable } from "@/modules/devices/http";
import { isProviderId } from "@/modules/devices/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Wahoo, Garmin or Polar sends the rider back: checks the state against
 * the sealed cookie, exchanges the code with the verifier, stores the
 * rider's link (src/modules/devices/connect.ts) and lands on the devices
 * settings with `?connected=<provider>` or `?error=<code>`. The cookie is
 * cleared whatever happened: a state is good for one try.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProviderId(provider)) return new Response("Not found", { status: 404 });

  const query = (name: string) => {
    const value = request.nextUrl.searchParams.get(name);
    return value && value.length <= 2048 ? value : null;
  };
  const ctx = await requireOrgContext();
  let location: string;
  if (!ctx) location = settingsUrl({ error: "unauthorized" });
  else if (!(await rateLimit(`device-callback:${ctx.userId}`, 20, 10 * 60_000)).allowed)
    location = settingsUrl({ error: "rate_limited" });
  else {
    try {
      location = await finishConnect(
        ctx,
        provider,
        { code: query("code"), state: query("state"), error: query("error") },
        request.cookies.get(OAUTH_COOKIE)?.value,
      );
    } catch (error) {
      console.error("device connect: callback failed", provider, loggable(error));
      location = settingsUrl({ error: "failed" });
    }
  }

  const response = NextResponse.redirect(new URL(location, env.BETTER_AUTH_URL));
  response.cookies.set(OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/devices",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

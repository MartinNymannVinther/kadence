import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/core/auth/session";
import { DEMO_ROLES, switchDemoRole, type DemoRole } from "@/modules/demo/roles";
import { demoCookieSecure, demoEnabled, demoLandingUrl } from "@/modules/demo/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Se som træner / rytter / forælder": the demo stripe's switch between
 * the demo's three people. Only a session that already is one of this
 * demo's accounts may use it (roles.ts), and only while the demo lives.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string; role: string }> },
) {
  if (!demoEnabled()) return new NextResponse("Not found", { status: 404 });
  const { locale, role } = await params;
  const language = locale === "en" ? "en" : "da";
  if (!(DEMO_ROLES as readonly string[]).includes(role))
    return new NextResponse("Not found", { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.redirect(demoLandingUrl(language), { status: 303 });
  const headers = await switchDemoRole(
    {
      userId: session.user.id,
      orgId:
        (session.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null,
    },
    role as DemoRole,
  );
  if (!headers) return new NextResponse("Not found", { status: 404 });

  const response = NextResponse.redirect(demoLandingUrl(language), { status: 303 });
  for (const cookie of headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const [name, ...rest] = (pair ?? "").split("=");
    if (name && rest.length)
      response.cookies.set(name, rest.join("="), {
        httpOnly: true,
        sameSite: "lax",
        secure: demoCookieSecure(),
        path: "/",
      });
  }
  return response;
}

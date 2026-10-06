import { getLocale } from "next-intl/server";
import { getSession } from "@/core/auth/session";
import { demoExpiresAt, hoursLeft } from "@/modules/demo/expiry";
import { currentDemoRole, DEMO_ROLES } from "@/modules/demo/roles";
import { DEMO_TTL_HOURS } from "@/modules/demo/service";
import { DemoStripe } from "./demo-stripe";

/**
 * A stripe at the top of every page in a demo workspace. It says what a
 * visitor needs and nobody would guess: this is a demo, it is thrown away,
 * the way to keep something is to ask for an account — and that the demo
 * has three people in it, so the visitor can see Kadence as the coach, as
 * the rider and as the rider's parent (src/modules/demo/roles.ts).
 *
 * One line, so a phone keeps its first screen for the product (ADR 0061):
 * the countdown, the switch between the three people, and the way to an
 * account. The longer explanation waits behind a small info button.
 */
export async function DemoBanner() {
  const locale = await getLocale();
  const session = await getSession();
  const orgId = (session?.session as { activeOrganizationId?: string | null } | undefined)
    ?.activeOrganizationId;
  const role = session && orgId ? await currentDemoRole(session.user.id, orgId) : null;
  const expiresAt = orgId ? await demoExpiresAt(orgId) : null;

  return (
    <DemoStripe
      role={role}
      roles={DEMO_ROLES}
      prefix={locale === "da" ? "" : `/${locale}`}
      hoursLeft={expiresAt ? hoursLeft(expiresAt) : DEMO_TTL_HOURS}
      lifetime={DEMO_TTL_HOURS}
    />
  );
}

import { getLocale } from "next-intl/server";
import { getSession } from "@/core/auth/session";
import { redirect } from "@/i18n/navigation";

/**
 * Rulle's frame (ADR 0032): the whole screen, with no sidebar and no
 * header, for a screen that stands in front of a bike. Signed in like
 * the rest of Kadence — the same session and the same workspace — and the
 * pages inside ask the database the same questions every page does.
 */
export default async function RideLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const locale = await getLocale();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (!session.session.activeOrganizationId) {
    redirect({ href: "/onboarding", locale });
    return null;
  }
  return (
    <main id="main" tabIndex={-1} className="bg-background min-h-svh">
      {children}
    </main>
  );
}

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { ownerAccessSummary } from "@/core/access/summary";
import { getOrgContext, getSession } from "@/core/auth/session";
import { organizations } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { redirect } from "@/i18n/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { isDemoWorkspace } from "@/modules/demo/service";
import { refreshOwnRacesLater } from "@/modules/results/own";
import { refreshStaleRaces } from "@/modules/results/refresh";
import { whoAmI } from "@/modules/team/access";
import { AppSidebar } from "./app-sidebar";
import { MobileHeader } from "./mobile-header";
import { SidebarShell, SidebarToggle } from "./sidebar-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

  // Named in the sidebar lockup, so the tenant is visible on every screen.
  const context = await getOrgContext();
  const [organization] = context
    ? await withOrgContext(context, (tx) =>
        tx
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, context.orgId))
          .limit(1),
      )
    : [];

  // The owner sees how many people are waiting at the door; nobody else
  // is told there is a door.
  const attention = (await ownerAccessSummary())?.pending ?? 0;
  const t = await getTranslations("app.nav");
  const demo = context ? await isDemoWorkspace(context.orgId) : false;
  const me = context ? await whoAmI(context.orgId, context.userId) : null;
  const isCoach = Boolean(me?.isCoach);
  // Opening Kadence is when races are read from Cykling Danmark (ADR 0039):
  // a coach's visit reads the whole team, a rider's their own, in the
  // background after the page, and only what is more than three hours old.
  if (context && me?.isCoach) after(() => refreshStaleRaces(context));
  else if (context && me?.rider) after(() => refreshOwnRacesLater(context));
  // Rulle is for riding, and for a coach trying a session on the trainer (ADR 0033).
  const rides = Boolean(me?.isCoach || me?.rider);

  // Read on the server so the first paint is already the layout this
  // person left behind, rather than a rail that appears and vanishes.
  const sidebarHidden = (await cookies()).get("kadence-sidebar")?.value === "hidden";

  return (
    <div className="flex min-h-svh">
      {/* Tabbing into a page should not mean tabbing through the whole
          sidebar first, every time. */}
      <a
        href="#main"
        className="bg-card text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:ring-2"
      >
        {t("skipToContent")}
      </a>
      <SidebarShell
        defaultHidden={sidebarHidden}
        sidebar={
          <AppSidebar
            userName={session.user.name}
            userEmail={session.user.email}
            organization={organization?.name ?? ""}
            attention={attention}
            isCoach={isCoach}
            rides={rides}
            toggle={<SidebarToggle placement="sidebar" />}
          />
        }
      >
        {demo && <DemoBanner />}
        <MobileHeader
          userName={session.user.name}
          userEmail={session.user.email}
          organization={organization?.name ?? ""}
          attention={attention}
          isCoach={isCoach}
          rides={rides}
        />
        {children}
      </SidebarShell>
    </div>
  );
}

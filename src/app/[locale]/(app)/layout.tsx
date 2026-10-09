import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { ownerAccessSummary } from "@/core/access/summary";
import { getOrgContext, getSession } from "@/core/auth/session";
import { teamCount } from "@/core/auth/teams";
import { featureOn } from "@/core/features";
import { organizations } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { redirect } from "@/i18n/navigation";
import { SIDEBAR_TONE_COOKIE, sidebarToneFrom } from "@/components/common/sidebar-tone";
import { DemoBanner } from "@/components/demo-banner";
import { isDemoWorkspace } from "@/modules/demo/service";
import { orgImageUrls } from "@/modules/team/images";
import { refreshOwnRacesLater } from "@/modules/results/own";
import { refreshStaleRaces } from "@/modules/results/refresh";
import { whoAmI } from "@/modules/team/access";
import { AppSidebar } from "./app-sidebar";
import { BottomBar } from "./bottom-bar";
import { MobileHeader } from "./mobile-header";
import { homeHref, menuFor, nameChild, navFlags, navRole } from "./nav-items";
import { SidebarShell, SidebarToggle } from "./sidebar-shell";
import { getTeamSettings } from "@/modules/team/settings";
import { unreadThreadCount } from "@/modules/community/service";

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
  const owner = await ownerAccessSummary();
  const attention = owner?.pending ?? 0;
  // Only the installation's owner creates workspaces (ADR 0048).
  const canCreate = owner !== null;
  // The team's name is the switcher only when there is somewhere to go:
  // another team, or for the owner a new one to create (ADR 0068).
  const switchable = canCreate || (await teamCount(session.user.id)) > 1;
  const logo = context ? (await orgImageUrls(context)).logo : null;
  const t = await getTranslations("app.nav");
  const demo = context ? await isDemoWorkspace(context.orgId) : false;
  const me = context ? await whoAmI(context.orgId, context.userId) : null;
  const isCoach = Boolean(me?.isCoach);
  // Opening Kadence is when races are read from Cykling Danmark (ADR 0039):
  // a coach's visit reads the whole team, a rider's their own, in the
  // background after the page, and only what is more than three hours old.
  if (context && me?.isCoach) after(() => refreshStaleRaces(context));
  else if (context && me?.rider) after(() => refreshOwnRacesLater(context));
  // One menu per role, in two tiers (ADR 0061, 0068, 0077). The club
  // championship is in it once the installation has it (ADR 0057) and the
  // club has turned it on (ADR 0051); Trænerrummet once the installation
  // has it (ADR 0052). A parent's child is named by their first name.
  const clubOn = featureOn("clubChampionship");
  const club = context && clubOn ? (await getTeamSettings(context)).clubChampionship : false;
  const coachesRoom = featureOn("coachesRoom");
  const role = navRole(me);
  const flags = navFlags(me, { club, coachesRoom });
  const menu = nameChild(menuFor(role, flags), me?.children ?? []);
  const home = homeHref(role);
  // Threads with something new in Trænerrummet, for a coach (ADR 0052).
  const counts =
    context && isCoach && coachesRoom ? { coaches: await unreadThreadCount(context) } : {};

  // Read on the server so the first paint is already the layout this
  // person left behind, rather than a rail that appears and vanishes, or
  // changes colour (docs/adr/0077).
  const jar = await cookies();
  const sidebarHidden = jar.get("kadence-sidebar")?.value === "hidden";
  const tone = sidebarToneFrom(jar.get(SIDEBAR_TONE_COOKIE)?.value);
  const team = { organization: organization?.name ?? "", logo, switchable, canCreate };

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
            {...team}
            attention={attention}
            menu={menu}
            home={home}
            counts={counts}
            tone={tone}
            toggle={<SidebarToggle placement="sidebar" />}
          />
        }
      >
        {demo && <DemoBanner />}
        <MobileHeader userName={session.user.name} userEmail={session.user.email} home={home} />
        {children}
        <BottomBar
          menu={menu}
          tone={tone}
          counts={counts}
          attention={attention}
          {...team}
          userName={session.user.name}
          userEmail={session.user.email}
        />
      </SidebarShell>
    </div>
  );
}

import { cookies } from "next/headers";
import { after } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { ownerAccessSummary } from "@/core/access/summary";
import { getOrgContext, getSession } from "@/core/auth/session";
import { teamCount } from "@/core/auth/teams";
import { featureOn } from "@/core/features";
import { redirect } from "@/i18n/navigation";
import { SIDEBAR_TONE_COOKIE, sidebarToneFrom } from "@/components/common/sidebar-tone";
import { DemoBanner } from "@/components/demo-banner";
import { SearchProvider } from "@/components/search/search-provider";
import { isDemoWorkspace } from "@/modules/demo/service";
import { orgImageUrls } from "@/modules/team/images";
import { getTeamName } from "@/modules/team/name";
import { refreshOwnRacesLater } from "@/modules/results/own";
import { refreshStaleRacesOnVisit } from "@/modules/results/refresh";
import { whoAmI } from "@/modules/team/access";
import { AppSidebar } from "./app-sidebar";
import { BottomBar } from "./bottom-bar";
import { MobileHeader } from "./mobile-header";
import { settingsItems } from "./(narrow)/settings/settings-items";
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

  const context = await getOrgContext();
  const clubOn = featureOn("clubChampionship");
  // Everything the shell needs that does not depend on anything else here
  // is asked at once rather than one after the other (docs/adr/0083): the
  // team's name, shown in the sidebar lockup so the tenant is visible on
  // every screen; whether this is the installation's owner and how many
  // wait at the door; how many teams this person has; the logo; whether
  // this is a demo; who the person is on the team; and the club's
  // settings. Each is cached per request, so a page that asks again is
  // answered without the database.
  const [organization, owner, teams, images, demo, me, settings] = await Promise.all([
    context ? getTeamName(context) : "",
    ownerAccessSummary(),
    teamCount(session.user.id),
    context ? orgImageUrls(context) : null,
    context ? isDemoWorkspace(context.orgId) : false,
    context ? whoAmI(context.orgId, context.userId) : null,
    context && clubOn ? getTeamSettings(context) : null,
  ]);

  // The owner sees how many people are waiting at the door; nobody else
  // is told there is a door.
  const attention = owner?.pending ?? 0;
  // Only the installation's owner creates workspaces (ADR 0048).
  const canCreate = owner !== null;
  // The team's name is the switcher only when there is somewhere to go:
  // another team, or for the owner a new one to create (ADR 0068).
  const switchable = canCreate || teams > 1;
  const logo = images?.logo ?? null;
  const t = await getTranslations("app.nav");
  const isCoach = Boolean(me?.isCoach);
  // Opening Kadence is when races are read from Cykling Danmark (ADR 0039):
  // a coach's visit reads the whole team, at most once an hour (ADR 0083),
  // a rider's their own, in the background after the page, and only what
  // is more than three hours old.
  if (context && me?.isCoach) after(() => refreshStaleRacesOnVisit(context));
  else if (context && me?.rider) after(() => refreshOwnRacesLater(context));
  // One menu per role, in two tiers (ADR 0061, 0068, 0077). The club
  // championship is in it once the installation has it (ADR 0057) and the
  // club has turned it on (ADR 0051); Trænerrummet once the installation
  // has it (ADR 0052). A parent's child is named by their first name.
  const club = settings?.clubChampionship ?? false;
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
  const team = { organization, logo, switchable, canCreate };
  // Søg finds the places the menu has, and the settings tabs this person
  // has, from anywhere: ⌘K or the field in the sidebar, the magnifier on a
  // phone. The riders and the library it reads itself, when first opened.
  const search = {
    scope: context?.orgId ?? "",
    menu,
    settings: settingsItems({ owner: canCreate, isCoach, isRider: Boolean(me?.rider) }),
    who: { coach: isCoach, riderId: me?.rider?.id ?? null },
  };

  const shell = (
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
  return <SearchProvider {...search}>{shell}</SearchProvider>;
}

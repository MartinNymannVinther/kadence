import type { NavGroup } from "./nav-items";
import { SidebarNav, SidebarSettingsLink } from "./sidebar-nav";
import { SIDEBAR_ID } from "./sidebar-shell";
import { TeamLockup, type TeamLockupProps } from "./team-lockup";
import { UserMenu } from "./user-menu";
import { VersionLink } from "./version-link";

/**
 * The 2a navigation rail: 236 px on the sidebar ground with no outer edge of
 * its own - the content area carries the dividing line. The lockup with the
 * team's name (the switcher, when there is a choice) on top, the grouped
 * navigation in the middle, settings and the user card at the foot.
 */
export function AppSidebar({
  userName,
  userEmail,
  attention = 0,
  groups,
  home,
  counts = {},
  toggle,
  ...team
}: TeamLockupProps & {
  userName: string;
  userEmail: string;
  /** Items waiting for the installation's owner; zero for everyone else. */
  attention?: number;
  /** The role's grouped list (menuGroups in ./nav-items.ts, ADR 0068). */
  groups: NavGroup[];
  /** Where the wordmark leads: the first place in the role's day. */
  home: string;
  /** Counts beside menu items (ADR 0052). */
  counts?: Partial<Record<string, number>>;
  /** The control that folds the rail away; rendered next to the lockup. */
  toggle?: React.ReactNode;
}) {
  return (
    <aside
      id={SIDEBAR_ID}
      className="print:hidden! bg-sidebar sticky top-0 hidden h-svh w-[236px] shrink-0 flex-col lg:flex"
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-5 pb-3">
        <TeamLockup home={home} {...team} />
        {toggle}
      </div>
      <SidebarNav groups={groups} counts={counts} />
      <div className="flex flex-col gap-1.5 px-3 pt-1 pb-3">
        <SidebarSettingsLink attention={attention} />
        <UserMenu name={userName} email={userEmail} variant="row" />
        <VersionLink />
      </div>
    </aside>
  );
}

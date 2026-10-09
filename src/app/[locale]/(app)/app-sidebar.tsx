import { sidebarToneClass, type SidebarTone } from "@/components/common/sidebar-tone";
import { cn } from "@/lib/utils";
import type { NavMenu } from "./nav-items";
import { SidebarNav } from "./sidebar-nav";
import { SIDEBAR_ID } from "./sidebar-shell";
import { TeamLockup, type TeamLockupProps } from "./team-lockup";
import { UserMenu } from "./user-menu";
import { VersionLink } from "./version-link";

/**
 * The navigation rail: 236 px on the sidebar ground with no outer edge of
 * its own - the content area carries the dividing line. The lockup with the
 * team's name (the switcher, when there is a choice) on top, the two tiers
 * of places in the middle, and the user card at the foot. In dark moss
 * (docs/adr/0073) the rail re-points the tokens it reads on itself, so the
 * page beside it keeps its paper.
 */
export function AppSidebar({
  userName,
  userEmail,
  attention = 0,
  menu,
  home,
  counts = {},
  toggle,
  tone,
  ...team
}: TeamLockupProps & {
  userName: string;
  userEmail: string;
  /** Items waiting for the installation's owner; zero for everyone else. */
  attention?: number;
  /** The role's two tiers (menuFor in ./nav-items.ts). */
  menu: NavMenu;
  /** Where the wordmark leads: the first place in the role's day. */
  home: string;
  /** Counts beside menu items (ADR 0052). */
  counts?: Partial<Record<string, number>>;
  /** The control that folds the rail away; rendered next to the lockup. */
  toggle?: React.ReactNode;
  /** Dark moss or paper, as the person chose under Indstillinger → Profil. */
  tone: SidebarTone;
}) {
  return (
    <aside
      id={SIDEBAR_ID}
      className={cn(
        "print:hidden! bg-sidebar text-sidebar-foreground sticky top-0 hidden h-svh w-[236px] shrink-0 flex-col lg:flex",
        sidebarToneClass(tone),
      )}
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-5 pb-3">
        <TeamLockup home={home} {...team} />
        {toggle}
      </div>
      <SidebarNav menu={menu} attention={attention} counts={counts} />
      <div className="flex flex-col gap-1.5 px-3 pt-1 pb-3">
        <UserMenu name={userName} email={userEmail} variant="row" />
        <VersionLink />
      </div>
    </aside>
  );
}

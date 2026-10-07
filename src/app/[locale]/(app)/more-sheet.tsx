"use client";

import { useTranslations } from "next-intl";
import { SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { NavGroup } from "./nav-items";
import { SidebarNav, SidebarSettingsLink } from "./sidebar-nav";
import { TeamLockup, type TeamLockupProps } from "./team-lockup";
import { UserMenu } from "./user-menu";
import { VersionLink } from "./version-link";

export type MoreSheetProps = TeamLockupProps & {
  /** The role's whole list, grouped (menuGroups in ./nav-items.ts). */
  groups: NavGroup[];
  counts?: Partial<Record<string, number>>;
  /** Items waiting for the installation's owner; zero for everyone else. */
  attention?: number;
  userName: string;
  userEmail: string;
};

/**
 * "Mere" on a phone (ADR 0061, 0068): the sidebar's whole content in a
 * sheet — the lockup with the team's name (the switcher, when there is a
 * choice), the role's grouped list, settings and the person — so the
 * bottom bar can stay at four or five places and nothing is lost. The
 * content only: the bar holds the sheet's root and its trigger, so focus
 * goes back to "Mere" when the sheet closes.
 */
export function MoreSheetContent({
  onNavigate,
  groups,
  counts = {},
  attention = 0,
  userName,
  userEmail,
  ...team
}: MoreSheetProps & { onNavigate: () => void }) {
  const t = useTranslations("app.nav");
  const close = onNavigate;

  return (
    <SheetContent side="left" className="bg-sidebar w-[272px]">
      <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
      {/* One scroll for the whole sheet: a coach's list is longer than a
          phone, and a list that scrolls inside a fixed frame hides that it
          goes on. Settings and the person follow the list. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="pt-5 pr-14 pb-3 pl-4">
          <TeamLockup {...team} />
        </div>
        <SidebarNav
          groups={groups}
          onNavigate={close}
          counts={counts}
          className="overflow-visible"
        />
        <div className="flex flex-col gap-1.5 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <SidebarSettingsLink onNavigate={close} attention={attention} />
          <UserMenu name={userName} email={userEmail} variant="row" />
          <VersionLink onNavigate={close} />
        </div>
      </div>
    </SheetContent>
  );
}

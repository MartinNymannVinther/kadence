"use client";

import { useTranslations } from "next-intl";
import { sidebarToneClass, type SidebarTone } from "@/components/common/sidebar-tone";
import { SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavMenu } from "./nav-items";
import { SidebarNav } from "./sidebar-nav";
import { TeamLockup, type TeamLockupProps } from "./team-lockup";
import { UserMenu } from "./user-menu";
import { VersionLink } from "./version-link";

export type MoreSheetProps = TeamLockupProps & {
  /** The role's two tiers (menuFor in ./nav-items.ts). */
  menu: NavMenu;
  counts?: Partial<Record<string, number>>;
  /** Items waiting for the installation's owner; zero for everyone else. */
  attention?: number;
  userName: string;
  userEmail: string;
  /** Dark moss or paper, the same as the sidebar's (docs/adr/0077). */
  tone: SidebarTone;
};

/**
 * "Mere" on a phone (ADR 0061, 0068, 0077): the sidebar's whole content in
 * a sheet — the lockup with the team's name (the switcher, when there is
 * a choice), the two tiers of places with Indstillinger last, and the
 * person — so the bottom bar can stay at the primary places and nothing
 * is lost. The content only: the bar holds the sheet's root and its
 * trigger, so focus goes back to "Mere" when the sheet closes.
 */
export function MoreSheetContent({
  onNavigate,
  menu,
  counts = {},
  attention = 0,
  userName,
  userEmail,
  tone,
  ...team
}: MoreSheetProps & { onNavigate: () => void }) {
  const t = useTranslations("app.nav");
  const close = onNavigate;

  return (
    <SheetContent
      side="left"
      className={cn("bg-sidebar text-sidebar-foreground w-[272px]", sidebarToneClass(tone))}
    >
      <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
      {/* One scroll for the whole sheet: a coach's list is longer than a
          phone, and a list that scrolls inside a fixed frame hides that it
          goes on. The person follows the lists. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="pt-5 pr-14 pb-3 pl-4">
          <TeamLockup {...team} />
        </div>
        <SidebarNav
          menu={menu}
          attention={attention}
          onNavigate={close}
          counts={counts}
          className="overflow-visible"
        />
        <div className="flex flex-col gap-1.5 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <UserMenu name={userName} email={userEmail} variant="row" />
          <VersionLink onNavigate={close} />
        </div>
      </div>
    </SheetContent>
  );
}

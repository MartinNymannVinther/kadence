"use client";

import { useTranslations } from "next-intl";
import { SheetContent, SheetTitle } from "@/components/ui/sheet";
import { WordmarkLockup } from "@/components/wordmark";
import type { NavItem } from "./nav-items";
import { OrgSwitcher } from "./org-switcher";
import { SidebarNav, SidebarSettingsLink } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { VersionLink } from "./version-link";

export type MoreSheetProps = {
  /** The role's whole list (menuItems in ./nav-items.ts). */
  menu: NavItem[];
  counts?: Partial<Record<string, number>>;
  /** Items waiting for the installation's owner; zero for everyone else. */
  attention?: number;
  /** The installation's owner may create workspaces; nobody else sees the button. */
  canCreate?: boolean;
  organization: string;
  /** The club's logo, when it has one (ADR 0048). */
  logo?: string | null;
  userName: string;
  userEmail: string;
};

/**
 * "Mere" on a phone (ADR 0060): the sidebar's whole content in a sheet —
 * the role's full list, the team switcher, settings and the person — so
 * the bottom bar can stay at four or five places and nothing is lost.
 * The content only: the bar holds the sheet's root and its trigger, so
 * focus goes back to "Mere" when the sheet closes.
 */
export function MoreSheetContent({
  onNavigate,
  menu,
  counts = {},
  attention = 0,
  canCreate = false,
  organization,
  logo = null,
  userName,
  userEmail,
}: MoreSheetProps & { onNavigate: () => void }) {
  const t = useTranslations("app.nav");
  const tOrg = useTranslations("app.orgSwitcher");
  const close = onNavigate;

  return (
    <SheetContent side="left" className="bg-sidebar w-[262px]">
      <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
      <div className="px-4 pt-5 pb-3">
        <WordmarkLockup organization={organization} logo={logo} />
      </div>
      <SidebarNav items={menu} onNavigate={close} counts={counts} />
      <div className="flex flex-col gap-1.5 px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <OrgSwitcher
          canCreate={canCreate}
          triggerClassName="text-sidebar-foreground hover:bg-sidebar-hover h-auto w-full justify-between rounded-[9px] px-3 py-2.5 text-sm font-normal"
          label={tOrg("switch")}
        />
        <SidebarSettingsLink onNavigate={close} attention={attention} />
        <UserMenu name={userName} email={userEmail} variant="row" />
        <VersionLink onNavigate={close} />
      </div>
    </SheetContent>
  );
}

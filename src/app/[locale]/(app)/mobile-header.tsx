"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark, WordmarkLockup } from "@/components/wordmark";
import { Link } from "@/i18n/navigation";
import { OrgSwitcher } from "./org-switcher";
import { SidebarNav, SidebarSettingsLink } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { VersionLink } from "./version-link";

/** Slim top bar for small screens: burger menu, brand, user. */
export function MobileHeader({
  userName,
  userEmail,
  organization,
  logo = null,
  canCreate = false,
  attention = 0,
  isCoach = false,
  rides = false,
  club = false,
  counts = {},
}: {
  userName: string;
  userEmail: string;
  organization: string;
  /** The club's logo, when it has one (ADR 0048). */
  logo?: string | null;
  /** The installation's owner may create workspaces; nobody else sees the button. */
  canCreate?: boolean;
  attention?: number;
  isCoach?: boolean;
  /** The club keeps a club championship (ADR 0051). */
  club?: boolean;
  /** Counts beside menu items (ADR 0052). */
  counts?: Partial<Record<string, number>>;
  rides?: boolean;
}) {
  const t = useTranslations("app.nav");
  const tOrg = useTranslations("app.orgSwitcher");
  const [open, setOpen] = useState(false);

  return (
    <header className="print:hidden! bg-background/90 border-border sticky top-0 z-40 border-b backdrop-blur-md lg:hidden">
      <div className="flex h-[3.75rem] items-center justify-between gap-3 px-[18px]">
        <div className="flex min-w-0 items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label={t("openMenu")} />}
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar w-[262px]">
              <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
              <div className="px-4 pt-5 pb-3">
                <WordmarkLockup organization={organization} logo={logo} />
              </div>
              <SidebarNav
                onNavigate={() => setOpen(false)}
                isCoach={isCoach}
                rides={rides}
                club={club}
                counts={counts}
              />
              <div className="flex flex-col gap-1.5 px-3 pt-1 pb-3">
                <OrgSwitcher
                  canCreate={canCreate}
                  triggerClassName="text-sidebar-foreground hover:bg-sidebar-hover h-auto w-full justify-between rounded-[9px] px-3 py-2.5 text-sm font-normal"
                  label={tOrg("switch")}
                />
                <SidebarSettingsLink onNavigate={() => setOpen(false)} attention={attention} />
                <VersionLink onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/today" aria-label="Kadence">
            <Wordmark className="text-lg" />
          </Link>
        </div>
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}

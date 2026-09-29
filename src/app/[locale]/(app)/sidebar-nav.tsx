"use client";

import { useTranslations } from "next-intl";
import { CountPill } from "@/components/ui/count-pill";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The app navigation. Text only, per the 2a handoff, in the rhythm a
 * week is lived in: today, the calendar, Rulle for the days indoors
 * (riders and coaches, ADR 0032), the season, the team (coaches only),
 * the library, the parents' page, and help. Rendered in the desktop
 * sidebar and inside the mobile sheet, where `onNavigate` lets the sheet
 * close itself.
 */
const ITEMS = [
  { href: "/today", key: "today", coach: false, rides: false },
  { href: "/calendar", key: "calendar", coach: false, rides: false },
  { href: "/rulle", key: "rulle", coach: false, rides: true },
  { href: "/season", key: "season", coach: false, rides: false },
  { href: "/riders", key: "riders", coach: true, rides: false },
  { href: "/library", key: "library", coach: false, rides: false },
  { href: "/parents", key: "parents", coach: false, rides: false },
  { href: "/help", key: "help", coach: false, rides: false },
] as const;

export function navItemClass(active: boolean): string {
  return cn(
    "block rounded-[9px] px-3 py-2.5 text-sm transition-colors duration-[120ms] ease-out max-lg:py-3",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "text-sidebar-foreground hover:bg-sidebar-hover",
  );
}

export function SidebarNav({
  onNavigate,
  isCoach = false,
  rides = false,
}: {
  onNavigate?: () => void;
  /** The team's list of riders is the coaches' page (ADR 0010). */
  isCoach?: boolean;
  /** Rulle is for those who ride, and for coaches trying a session. */
  rides?: boolean;
}) {
  const t = useTranslations("app.nav");
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
      {ITEMS.filter((item) => (isCoach || !item.coach) && (rides || !item.rides)).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={navItemClass(active)}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Settings sits apart at the foot of the sidebar, above the user card. The
 * count is the installation owner's: applications waiting for a decision.
 */
export function SidebarSettingsLink({
  onNavigate,
  attention = 0,
}: {
  onNavigate?: () => void;
  attention?: number;
}) {
  const t = useTranslations("app.nav");
  const pathname = usePathname();
  const active = pathname.startsWith("/settings");
  return (
    <Link
      href={attention > 0 ? "/settings/access" : "/settings/me"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(navItemClass(active), "flex items-center")}
    >
      {t("settings")}
      <CountPill count={attention} />
    </Link>
  );
}

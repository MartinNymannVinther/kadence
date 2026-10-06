"use client";

import { useTranslations } from "next-intl";
import { CountPill } from "@/components/ui/count-pill";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isActive, type NavItem } from "./nav-items";

/**
 * The app navigation. Text only, per the 2a handoff, one list per role
 * (ADR 0061, the lists in ./nav-items.ts). Rendered in the desktop sidebar
 * and inside the phone's "Mere" sheet, where `onNavigate` lets the sheet
 * close itself.
 */
export function navItemClass(active: boolean): string {
  return cn(
    "focus-ring block rounded-[9px] px-3 py-2.5 text-sm transition-colors duration-[120ms] ease-out max-lg:py-3",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "text-sidebar-foreground hover:bg-sidebar-hover",
  );
}

export function SidebarNav({
  items,
  onNavigate,
  counts = {},
}: {
  /** The role's list, decided on the server (menuItems in ./nav-items.ts). */
  items: NavItem[];
  onNavigate?: () => void;
  /** Something new behind an item, e.g. unread threads in Trænerrummet (ADR 0052). */
  counts?: Partial<Record<string, number>>;
}) {
  const t = useTranslations("app.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("menuTitle")}
      className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(navItemClass(active), counts[item.key] ? "flex items-center" : "")}
          >
            {t(item.key)}
            {counts[item.key] ? <CountPill count={counts[item.key]!} /> : null}
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

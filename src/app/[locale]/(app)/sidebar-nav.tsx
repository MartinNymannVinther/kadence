"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { CountPill } from "@/components/ui/count-pill";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";
import { activeHref, labelKey, type NavItem, type NavMenu } from "./nav-items";

/**
 * The app navigation in two tiers (docs/adr/0077; the lists in
 * ./nav-items.ts): the role's primary places large, with their icons, and
 * "Mere" under them, smaller, closed by Indstillinger. Rendered in the
 * desktop sidebar and inside the phone's "Mere" sheet, where `onNavigate`
 * lets the sheet close itself.
 *
 * "Mere" is a list named by its header, so a screen reader hears "Mere,
 * list, 5 items" and can skip past it; the header is quiet text, not a
 * heading, so the page's own outline stays the page's.
 */

export type NavTier = "primary" | "more";

export function navItemClass(active: boolean, tier: NavTier): string {
  return cn(
    "focus-ring flex items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-[120ms] ease-out max-lg:min-h-11",
    tier === "primary" ? "h-10 text-[15px]" : "h-8 text-2sm",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "text-sidebar-foreground hover:bg-sidebar-hover",
  );
}

const iconClass = (active: boolean, tier: NavTier) =>
  cn(
    "shrink-0",
    tier === "primary" ? "size-5" : "size-4",
    active ? "text-sidebar-accent-foreground" : "text-meta",
  );

/** Where Indstillinger leads: the door, while people wait at it for the owner; the person's own page otherwise. */
export function settingsHref(attention: number): string {
  return attention > 0 ? "/settings/access" : "/settings/me";
}

export function SidebarNav({
  menu,
  attention = 0,
  onNavigate,
  counts = {},
  className,
}: {
  /** The role's two tiers, decided on the server (menuFor in ./nav-items.ts). */
  menu: NavMenu;
  /** Items waiting for the installation's owner; zero for everyone else. */
  attention?: number;
  onNavigate?: () => void;
  /** Something new behind an item, e.g. unread threads in Trænerrummet (ADR 0052). */
  counts?: Partial<Record<string, number>>;
  className?: string;
}) {
  const t = useTranslations("app.nav");
  const pathname = usePathname();
  // The sidebar and the sheet can both be in the page; their headers'
  // ids must not meet.
  const moreId = useId();
  const lit = activeHref(
    pathname,
    [...menu.primary, ...menu.more].map((item) => item.href),
  );
  const settingsActive = pathname.startsWith("/settings");

  const place = (item: NavItem, tier: NavTier) => {
    const active = item.href === lit;
    const Icon = NAV_ICONS[item.key];
    const count = counts[item.key] ?? 0;
    return (
      <li key={item.key}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={navItemClass(active, tier)}
        >
          <Icon aria-hidden className={iconClass(active, tier)} />
          <span className="min-w-0 truncate">{item.text ?? t(labelKey(item))}</span>
          <CountPill count={count} />
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label={t("menuTitle")}
      className={cn("flex flex-1 flex-col overflow-y-auto px-3 py-1.5", className)}
    >
      <ul className="flex flex-col gap-0.5">
        {menu.primary.map((item) => place(item, "primary"))}
      </ul>
      <p
        id={moreId}
        className="text-label px-2.5 pt-5 pb-1 text-2xs font-medium tracking-[0.04em] uppercase max-lg:pt-6"
      >
        {t("more")}
      </p>
      <ul aria-labelledby={moreId} className="flex flex-col gap-px">
        {menu.more.map((item) => place(item, "more"))}
        <li>
          <Link
            href={settingsHref(attention)}
            onClick={onNavigate}
            aria-current={settingsActive ? "page" : undefined}
            className={navItemClass(settingsActive, "more")}
          >
            <Settings aria-hidden className={iconClass(settingsActive, "more")} />
            <span className="min-w-0 truncate">{t("settings")}</span>
            <CountPill count={attention} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}

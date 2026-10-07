"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { CountPill } from "@/components/ui/count-pill";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";
import { activeHref, type NavGroup } from "./nav-items";

/**
 * The app navigation: the role's places in small groups by task, each
 * with its icon (ADR 0061, amended by 0068; the lists in ./nav-items.ts).
 * Rendered in the desktop sidebar and inside the phone's "Mere" sheet,
 * where `onNavigate` lets the sheet close itself.
 *
 * Each group is a list named by its header, so a screen reader hears
 * "Planlægning, list, 3 items" and can skip from group to group; the
 * header is quiet text, not a heading, so the page's own outline stays
 * the page's.
 */
export function navItemClass(active: boolean): string {
  return cn(
    "focus-ring flex items-center gap-2.5 rounded-[9px] px-3 py-1.75 text-sm transition-colors duration-[120ms] ease-out max-lg:min-h-11",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "text-sidebar-foreground hover:bg-sidebar-hover",
  );
}

const iconClass = (active: boolean) =>
  cn("size-4 shrink-0", active ? "text-sidebar-accent-foreground" : "text-meta");

export function SidebarNav({
  groups,
  onNavigate,
  counts = {},
  className,
}: {
  /** The role's grouped list, decided on the server (menuGroups in ./nav-items.ts). */
  groups: NavGroup[];
  onNavigate?: () => void;
  /** Something new behind an item, e.g. unread threads in Trænerrummet (ADR 0052). */
  counts?: Partial<Record<string, number>>;
  className?: string;
}) {
  const t = useTranslations("app.nav");
  const pathname = usePathname();
  // The sidebar and the sheet can both be in the page; their headers'
  // ids must not meet.
  const id = useId();
  const lit = activeHref(
    pathname,
    groups.flatMap((group) => group.items.map((item) => item.href)),
  );

  return (
    <nav
      aria-label={t("menuTitle")}
      className={cn(
        "flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-1.5 max-lg:gap-4",
        className,
      )}
    >
      {groups.map((group) => {
        const headerId = group.key ? `${id}-${group.key}` : undefined;
        return (
          <div key={group.key ?? "day"} className="flex flex-col gap-0.5">
            {group.key ? (
              <p id={headerId} className="text-label px-3 pb-0.5 text-xs font-medium max-lg:pb-1">
                {t(`groups.${group.key}`)}
              </p>
            ) : null}
            <ul aria-labelledby={headerId} className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.href === lit;
                const Icon = NAV_ICONS[item.key];
                const count = counts[item.key] ?? 0;
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={navItemClass(active)}
                    >
                      <Icon aria-hidden className={iconClass(active)} />
                      <span className="min-w-0 truncate">{t(item.key)}</span>
                      <CountPill count={count} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
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
      className={navItemClass(active)}
    >
      <Settings aria-hidden className={iconClass(active)} />
      {t("settings")}
      <CountPill count={attention} />
    </Link>
  );
}

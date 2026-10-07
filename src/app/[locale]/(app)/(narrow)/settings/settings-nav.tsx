"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { CountPill } from "@/components/ui/count-pill";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SettingsGroup } from "./settings-items";

/**
 * Sub-navigation for settings, mirroring the main nav: a column of tabs in
 * groups by whose they are — Dig, Holdet, Installationen, then Om (ADR
 * 0068) — and on a narrow screen one row that scrolls sideways, each
 * group's name over its tabs and a hairline between the groups. Which
 * tabs a person sees is decided on the server by role
 * (./settings-items.ts); `access` carries the installation owner's count
 * of applications waiting, and is null for everyone else.
 */
export function SettingsNav({
  groups,
  access,
}: {
  groups: SettingsGroup[];
  access: { pending: number } | null;
}) {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();
  const id = useId();

  return (
    <nav
      aria-label={t("label")}
      className="border-border flex items-end gap-1 overflow-x-auto @2xl:w-[210px] @2xl:shrink-0 @2xl:flex-col @2xl:items-stretch @2xl:gap-4 @2xl:overflow-visible @2xl:border-r @2xl:pr-4"
    >
      {groups.map((group, index) => {
        const headerId = group.key ? `${id}-${group.key}` : undefined;
        return (
          <div
            key={group.key ?? "about"}
            className={cn(
              "flex shrink-0 flex-col gap-0.5",
              // Side by side, a hairline tells one group from the next.
              index > 0 && "border-border ml-1 border-l pl-2 @2xl:ml-0 @2xl:border-l-0 @2xl:pl-0",
            )}
          >
            {group.key ? (
              <p
                id={headerId}
                className="text-label px-3 text-xs font-medium whitespace-nowrap @2xl:pb-0.5"
              >
                {t(`groups.${group.key}`)}
              </p>
            ) : null}
            <ul aria-labelledby={headerId} className="flex gap-1 @2xl:flex-col @2xl:gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring flex items-center rounded-[9px] px-3 py-2 text-sm whitespace-nowrap transition-colors duration-[120ms] ease-out max-sm:min-h-11",
                        active
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "text-secondary-foreground hover:bg-muted",
                      )}
                    >
                      {t(item.key)}
                      {item.key === "access" && access ? (
                        <CountPill count={access.pending} />
                      ) : null}
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

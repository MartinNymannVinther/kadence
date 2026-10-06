"use client";

import { useTranslations } from "next-intl";
import { CountPill } from "@/components/ui/count-pill";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SettingsItem } from "./settings-items";

/**
 * Vertical sub-navigation for settings, mirroring the main nav's active
 * style. Which tabs a person sees is decided on the server by role
 * (./settings-items.ts); `access` carries the installation owner's count
 * of applications waiting, and is null for everyone else.
 */
export function SettingsNav({
  items,
  access,
}: {
  items: SettingsItem[];
  access: { pending: number } | null;
}) {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="border-border flex gap-1 overflow-x-auto @2xl:w-[210px] @2xl:shrink-0 @2xl:flex-col @2xl:overflow-visible @2xl:border-r @2xl:pr-4"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring flex items-center rounded-[9px] px-3 py-2.5 text-sm whitespace-nowrap transition-colors duration-[120ms] ease-out max-sm:min-h-11",
              active
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-secondary-foreground hover:bg-muted",
            )}
          >
            {t(item.key)}
            {item.key === "access" && access ? <CountPill count={access.pending} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

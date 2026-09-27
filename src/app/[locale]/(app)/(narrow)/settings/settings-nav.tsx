"use client";

import { useTranslations } from "next-intl";
import { CountPill } from "@/components/ui/count-pill";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings/me", key: "me" },
  { href: "/settings/workspace", key: "workspace" },
  { href: "/settings/security", key: "security" },
  { href: "/settings/ai", key: "ai" },
  { href: "/settings/data", key: "data" },
  { href: "/settings/about", key: "about" },
] as const;

/**
 * Vertical sub-navigation for settings, mirroring the main nav's active
 * style. "Holdet" is the coaches' and comes first for them; "Mig" is
 * everyone's; "Enheder" is the riders', who connect their own Wahoo and
 * Garmin (ADR 0018). The admission page only exists for the installation's
 * owner, so its entry is passed in rather than listed: `access` is null
 * for everyone else and the item is simply not there.
 */
export function SettingsNav({
  access,
  isCoach,
  isRider,
}: {
  access: { pending: number } | null;
  isCoach: boolean;
  isRider: boolean;
}) {
  const t = useTranslations("settings.nav");
  const pathname = usePathname();
  const base = access
    ? [
        ...ITEMS.slice(0, 3),
        { href: "/settings/access", key: "access" } as const,
        ...ITEMS.slice(3),
      ]
    : ITEMS;
  const withDevices = isRider
    ? [base[0]!, { href: "/settings/devices", key: "devices" } as const, ...base.slice(1)]
    : base;
  const items = isCoach
    ? [{ href: "/settings/team", key: "team" } as const, ...withDevices]
    : withDevices;

  return (
    <nav className="border-border flex gap-1 overflow-x-auto @2xl:w-[210px] @2xl:shrink-0 @2xl:flex-col @2xl:overflow-visible @2xl:border-r @2xl:pr-4">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center rounded-[9px] px-3 py-2.5 text-sm whitespace-nowrap transition-colors duration-[120ms] ease-out max-sm:min-h-11",
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

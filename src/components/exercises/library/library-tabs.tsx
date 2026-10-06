"use client";

import { useTranslations } from "next-intl";
import { SegmentedFilter } from "@/components/ui/segmented";
import { usePathname } from "@/i18n/navigation";

/**
 * The library's two halves (ADR 0061 keeps "Bibliotek" one menu item):
 * the team's sessions and blocks, and the exercises and programmes with
 * their drawings (docs/plan-ovelser-og-programmer.md). Links, so each
 * half has its own address.
 */
export function LibraryTabs() {
  const t = useTranslations("exercises.library.tabs");
  const pathname = usePathname();
  const programs =
    pathname.startsWith("/library/programs") || pathname.startsWith("/library/exercises");

  return (
    <nav aria-label={t("label")} className="max-w-full overflow-x-auto">
      <SegmentedFilter
        className="[&>a]:max-sm:min-h-10 [&>a]:max-sm:content-center"
        items={[
          { key: "sessions", label: t("sessions"), href: "/library", active: !programs },
          { key: "programs", label: t("programs"), href: "/library/programs", active: programs },
        ]}
      />
    </nav>
  );
}

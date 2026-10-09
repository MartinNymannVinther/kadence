"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import {
  sidebarToneCookie,
  SIDEBAR_TONES,
  type SidebarTone,
} from "@/components/common/sidebar-tone";
import { SegmentedChoice } from "@/components/ui/segmented";
import { useRouter } from "@/i18n/navigation";

const THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof THEMES)[number];

/**
 * "Udseende" under Indstillinger → Profil (docs/adr/0077): light or dark,
 * and the rail in dark moss or on paper. Both are this device's, not the
 * account's — the theme is kept by the browser as it always was, the
 * rail's tone in a cookie the server reads — and the card says so.
 *
 * The theme is painted only once the page is in the browser: the server
 * does not know it, and a choice that flickered from "system" to "dark"
 * on arrival would be a wrong answer shown first.
 */
export function AppearanceCard({ tone }: { tone: SidebarTone }) {
  const t = useTranslations("settings.appearance");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // False while the server's markup is on screen, true once the browser has taken over.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [rail, setRail] = useState<SidebarTone>(tone);

  function chooseRail(next: SidebarTone) {
    setRail(next);
    document.cookie = sidebarToneCookie(next);
    // The rail is painted on the server from the cookie: ask for it again.
    router.refresh();
  }

  return (
    <section
      aria-labelledby="appearance-title"
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-surface sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h3 id="appearance-title" className="text-base font-semibold">
          {t("title")}
        </h3>
        <p className="text-meta text-2sm leading-relaxed">{t("body")}</p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">{t("theme")}</span>
          {mounted ? (
            <SegmentedChoice<Theme>
              label={t("theme")}
              value={THEMES.includes(theme as Theme) ? (theme as Theme) : "system"}
              onChange={setTheme}
              options={THEMES.map((value) => ({ value, label: t(value) }))}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-col">
            <span className="text-sm font-medium">{t("sidebar")}</span>
            <span className="text-meta text-xs">{t("sidebarHint")}</span>
          </span>
          <SegmentedChoice<SidebarTone>
            label={t("sidebar")}
            value={rail}
            onChange={chooseRail}
            options={SIDEBAR_TONES.map((value) => ({ value, label: t(value) }))}
          />
        </div>
      </div>
    </section>
  );
}

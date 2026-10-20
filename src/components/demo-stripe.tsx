"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { segmentedSegment, segmentedTrack } from "@/components/ui/segmented";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { DemoRole } from "@/modules/demo/roles";

/**
 * The demo stripe's one line (./demo-banner.tsx): "Demo · slettes om 23 t",
 * an info button for the rest, the switch between the three people and
 * "Ansøg". The switch is a segmented row from sm up and the phone's own
 * picker below it.
 *
 * Switching follows a plain link, never prefetched: following it signs
 * the visitor in as someone else, which a prefetch must not do. The
 * picker navigates the same way, to the same address.
 */
export function DemoStripe({
  role,
  roles,
  prefix,
  hoursLeft,
  lifetime,
}: {
  /** Who the visitor is now; null when the session is not one of the demo's people. */
  role: DemoRole | null;
  /** The demo's three people, in order (DEMO_ROLES, src/modules/demo/roles.ts). */
  roles: readonly DemoRole[];
  /** "" in Danish, "/en" in English: the switch is a route, not a page. */
  prefix: string;
  hoursLeft: number;
  /** A demo's whole lifetime in hours, for the longer explanation. */
  lifetime: number;
}) {
  const t = useTranslations("demo");
  const [open, setOpen] = useState(false);
  const infoId = useId();
  const switchTo = (r: DemoRole) => `${prefix}/demo/as/${r}`;

  return (
    <div className="print:hidden border-chart-4/40 bg-warning-tint border-b px-5 text-2sm sm:px-7 lg:px-8">
      <div className="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1 py-1">
        <p className="min-w-0 truncate">
          <span className="font-semibold">{t("bannerShort")}</span>
          <span className="text-meta"> · {t("bannerLeft", { hours: hoursLeft })}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-controls={infoId}
          aria-label={t("about")}
          title={t("about")}
          className="focus-ring text-meta hover:text-foreground -ml-1 flex size-9 shrink-0 items-center justify-center rounded-full"
        >
          <Info aria-hidden className="size-4" />
        </button>
        {role && (
          <>
            <nav aria-label={t("viewAs")} className="ml-auto hidden items-center gap-2 sm:flex">
              <span className="text-meta">{t("viewAs")}</span>
              <span className={segmentedTrack}>
                {roles.map((r) =>
                  r === role ? (
                    <span
                      key={r}
                      aria-current="true"
                      title={t(`roles.${r}`)}
                      className={segmentedSegment(true)}
                    >
                      {t(`rolesShort.${r}`)}
                    </span>
                  ) : (
                    <a
                      key={r}
                      href={switchTo(r)}
                      title={t(`roles.${r}`)}
                      className={cn(segmentedSegment(false), "focus-ring")}
                    >
                      {t(`rolesShort.${r}`)}
                    </a>
                  ),
                )}
              </span>
            </nav>
            <NativeSelect
              variant="xs"
              aria-label={t("viewAs")}
              value={role}
              onChange={(event) => window.location.assign(switchTo(event.target.value as DemoRole))}
              className="ml-auto w-auto bg-card sm:hidden"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {t(`rolesShort.${r}`)}
                </option>
              ))}
            </NativeSelect>
          </>
        )}
        <Link
          href="/register"
          aria-label={t("bannerCta")}
          className={cn(
            "focus-ring text-primary flex min-h-9 shrink-0 items-center font-medium hover:underline",
            !role && "ml-auto",
          )}
        >
          <span className="md:hidden">{t("bannerCtaShort")}</span>
          <span className="max-md:hidden">{t("bannerCta")}</span>
        </Link>
      </div>
      <p id={infoId} hidden={!open} className="text-meta max-w-3xl pb-2.5 leading-relaxed">
        {t("bannerTitle")} {t("bannerBody", { hours: lifetime })} {role ? t("rolesNote") : null}
      </p>
    </div>
  );
}

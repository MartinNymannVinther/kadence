import { getLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/core/auth/session";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { currentDemoRole, DEMO_ROLES } from "@/modules/demo/roles";
import { DEMO_TTL_HOURS } from "@/modules/demo/service";

/**
 * A stripe at the top of every page in a demo workspace. It says what a
 * visitor needs and nobody would guess: this is a demo, it is thrown away,
 * the way to keep something is to ask for an account — and that the demo
 * has three people in it, so the visitor can see Kadence as the coach, as
 * the rider and as the rider's parent (src/modules/demo/roles.ts).
 *
 * The switch is a plain link, never prefetched: following it signs the
 * visitor in as someone else, which a prefetch must not do.
 */
export async function DemoBanner() {
  const t = await getTranslations("demo");
  const locale = await getLocale();
  const session = await getSession();
  const orgId = (session?.session as { activeOrganizationId?: string | null } | undefined)
    ?.activeOrganizationId;
  const role = session && orgId ? await currentDemoRole(session.user.id, orgId) : null;
  const prefix = locale === "da" ? "" : `/${locale}`;

  return (
    <div className="print:hidden border-chart-4/40 bg-warning-tint flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-5 py-2 text-2sm sm:px-7 lg:px-8">
      <span className="font-semibold">{t("bannerTitle")}</span>
      <span className="text-meta">{t("bannerBody", { hours: DEMO_TTL_HOURS })}</span>
      {role && (
        <nav aria-label={t("viewAs")} className="flex flex-wrap items-center gap-1.5">
          <span className="text-meta">{t("viewAs")}</span>
          {DEMO_ROLES.map((r) =>
            r === role ? (
              <span
                key={r}
                aria-current="true"
                className="bg-primary text-primary-foreground rounded-full px-3 py-1 font-medium"
              >
                {t(`roles.${r}`)}
              </span>
            ) : (
              <a
                key={r}
                href={`${prefix}/demo/as/${r}`}
                className={cn(
                  "border-border hover:bg-card rounded-full border px-3 py-1 font-medium",
                  "min-h-9 inline-flex items-center",
                )}
              >
                {t(`roles.${r}`)}
              </a>
            ),
          )}
        </nav>
      )}
      <Link href="/register" className="text-primary ml-auto font-medium hover:underline">
        {t("bannerCta")}
      </Link>
    </div>
  );
}

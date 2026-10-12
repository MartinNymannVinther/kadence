import { User, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { LandingCopy } from "@/modules/billing/landing";

/**
 * "To måder at bruge Kadence" on the front page (docs/adr/0080, 0081): a
 * club's team, or one person alone. The headline stays the young riders';
 * this says the door is open to the one who trains alone too, young or
 * adult. With door 2 open (ADR 0088) each way has its button: an account
 * alone, an application for a team (src/modules/billing/landing.ts).
 */
export async function LandingWays({
  copy,
  demoHref,
}: {
  copy: Pick<LandingCopy, "aloneKey" | "teamApply">;
  /** The demo of a rider alone, when the installation has demos. */
  demoHref: string | null;
}) {
  const t = await getTranslations("landing.ways");
  const card = "bg-card ring-foreground/10 shadow-surface rounded-xl p-6 ring-1";
  const icon =
    "bg-accent text-accent-foreground mb-4 flex size-9 items-center justify-center rounded-lg";

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <p className="text-muted-foreground mb-3 text-center text-xs font-medium tracking-wide uppercase">
        {t("label")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <div className={icon}>
            <Users className="size-4.5" />
          </div>
          <h2 className="font-medium">{t("teamTitle")}</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">{t("teamBody")}</p>
          {copy.teamApply && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/register?apply=1" className={buttonVariants({ size: "sm" })}>
                {t("teamApply")}
              </Link>
            </div>
          )}
        </div>
        <div className={card}>
          <div className={icon}>
            <User className="size-4.5" />
          </div>
          <h2 className="font-medium">{t("aloneTitle")}</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">{t("aloneBody")}</p>
          <p className="text-muted-foreground mt-1.5 text-sm">{t("aloneAge")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              {t(copy.aloneKey)}
            </Link>
            {demoHref && (
              <a href={demoHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
                {t("aloneDemo")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

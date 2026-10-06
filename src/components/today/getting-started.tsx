import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "riders", href: "/riders" },
  { key: "session", href: "/library" },
  { key: "week", href: "/calendar" },
] as const;

/**
 * An empty team's first page for the coach: three steps, in order — add
 * the riders, build or pick a session, plan the week — each with the
 * button that does it.
 */
export function GettingStarted() {
  const t = useTranslations("today.start");
  return (
    <section aria-labelledby="start-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="start-title" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-meta text-2sm">{t("body")}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <li
            key={step.key}
            className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{t(`${step.key}.title`)}</p>
                <p className="text-meta text-2sm leading-relaxed">{t(`${step.key}.body`)}</p>
              </div>
            </div>
            <Link
              href={step.href}
              className={cn(
                buttonVariants({ variant: i === 0 ? "default" : "outline" }),
                "shrink-0 max-sm:h-11",
              )}
            >
              {t(`${step.key}.action`)}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

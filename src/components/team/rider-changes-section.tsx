import { getLocale, getTranslations } from "next-intl/server";
import { patternText } from "@/components/training/pattern-text";
import { dayMonth } from "@/components/training/day-label";
import type { OrgContext } from "@/core/db/tenant";
import { riderChanges } from "@/modules/training/session-changes";

/**
 * "Ændringer i planen" on a rider's page (docs/adr/0119): how many of the
 * rider's sessions were moved or skipped in the last eight weeks, the
 * reasons, the patterns Kadence sees in them, and the latest changes with
 * the words beside them — where the reader may read them.
 */
export async function RiderChangesSection({
  ctx,
  riderId,
  today,
}: {
  ctx: OrgContext;
  riderId: string;
  today: string;
}) {
  const t = await getTranslations("changes.patterns");
  const reason = await getTranslations("changes.reason");
  const locale = await getLocale();
  const { summary, recent } = await riderChanges(ctx, riderId, today);
  const day = (iso: string) => dayMonth(iso, locale);
  const tell = t as unknown as Parameters<typeof patternText>[1];
  const why = reason as unknown as Parameters<typeof patternText>[2];

  return (
    <section aria-labelledby="rider-changes" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="rider-changes" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-meta text-2sm">{t("hint")}</p>
      </div>
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface sm:p-5">
        {recent.length === 0 ? (
          <p className="text-meta text-2sm">{t("empty")}</p>
        ) : (
          <>
            <p className="text-2sm font-medium">
              {t("counts", { moved: summary.moved, skipped: summary.skipped })}
              {summary.reasons.length > 0 &&
                ` · ${summary.reasons.map((r) => `${reason(r.reason as "ill")} ${r.count}`).join(", ")}`}
            </p>
            {summary.patterns.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {summary.patterns.map((p) => (
                  <li
                    key={p.key}
                    className="bg-sticky text-sticky-ink rounded-md px-3 py-2 text-2sm"
                  >
                    {patternText(p, tell, why, locale)}
                  </li>
                ))}
              </ul>
            )}
            <ul className="divide-hairline flex flex-col divide-y">
              {recent.map((c) => (
                <li key={c.id} className="flex flex-col gap-0.5 py-2 text-2sm">
                  <span>
                    <span className="text-meta tabular-nums">{day(c.fromDate)}</span>{" "}
                    <span className="font-medium">{c.title}</span>
                    {" · "}
                    {c.kind === "moved" && c.toDate
                      ? t("moved", { day: day(c.toDate) })
                      : t(c.kind === "unskipped" ? "unskipped" : "skipped")}
                    {c.reason && ` · ${reason(c.reason as "ill")}`}
                    {c.byRole === "coach" && <span className="text-meta"> · {t("byCoach")}</span>}
                    {c.viaAi && <span className="text-meta"> · {t("viaAi")}</span>}
                  </span>
                  {c.note && <span className="text-meta break-words">“{c.note}”</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

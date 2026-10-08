import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { CompareChart } from "@/components/activities/compare-chart";
import type { Streams } from "@/components/activities/streams-chart";
import { num } from "@/components/charts/format";
import { dayLong } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { EmptyState } from "@/components/ui/empty-state";
import { getOrgContext } from "@/core/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { getRidesToCompare } from "@/modules/training/companions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities.together");
  return { title: t("pageTitle") };
}

const isStreams = (value: unknown): value is Streams =>
  typeof value === "object" && value !== null && Array.isArray((value as Streams).t);
const MAX_RIDES = 6;

/**
 * The same ride, ridden by several: their curves over each other, and the
 * plain numbers side by side. Reads only the rides the caller may read;
 * the riders keep the team's order, and nothing is ranked (ADR 0013).
 */
export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ with?: string }>;
}) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("activities.together");
  const summary = await getTranslations("activities.summary");
  const duration = await getTranslations("training.duration");
  const sports = await getTranslations("training.sport");
  const { id } = await params;
  const ids = [
    ...new Set([id, ...((await searchParams).with ?? "").split(",").filter(Boolean)]),
  ].slice(0, MAX_RIDES);
  const rows = await getRidesToCompare(ctx, ids);
  const rides = ids
    .flatMap((rideId) => rows.filter((r) => r.activity.id === rideId))
    .filter((r) => isStreams(r.activity.streams))
    .sort((a, b) => a.riderName.localeCompare(b.riderName, "da"));
  const first = rides[0];

  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-6">
      <Link
        href={`/activities/${id}`}
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-title-section leading-tight font-semibold tracking-[-0.02em]">
          {t("pageTitle")}
        </h1>
        {first && (
          <p className="text-meta text-2sm first-letter:uppercase">
            {dayLong(first.activity.onDate, locale)} ·{" "}
            {first.activity.title || sports(first.activity.sport as "bike")}
          </p>
        )}
      </header>
      {rides.length < 2 ? (
        <EmptyState title={t("tooFew")} hint={t("tooFewHint")} />
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full text-2sm tabular-nums">
              <thead className="bg-secondary text-label text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {t("rider")}
                  </th>
                  {(
                    ["time", "distance", "avgPower", "weightedPower", "avgHr", "load"] as const
                  ).map((k) => (
                    <th
                      key={k}
                      scope="col"
                      className="px-3 py-2 text-right font-medium whitespace-nowrap"
                    >
                      {summary(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rides.map((r) => {
                  const a = r.activity;
                  const cell = (v: number | null, f: (n: number) => string) =>
                    v === null || v <= 0 ? "–" : f(v);
                  return (
                    <tr key={a.id} className="border-border border-t">
                      <th scope="row" className="px-3 py-2 text-left font-semibold">
                        <Link href={`/activities/${a.id}`} className="focus-ring hover:underline">
                          {r.riderName}
                        </Link>
                      </th>
                      <td className="px-3 py-2 text-right">
                        {durationText(a.movingSeconds / 60, duration)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {cell(a.distanceM, (v) => summary("km", { km: num(v / 1000, locale, 1) }))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {cell(a.avgPower, (v) => summary("watt", { w: v }))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {cell(a.weightedPower, (v) => summary("watt", { w: v }))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {cell(a.avgHr, (v) => summary("bpm", { bpm: v }))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {cell(a.load, (v) => num(v, locale))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <CompareChart
            rides={rides.map((r) => ({
              id: r.activity.id,
              name: r.riderName,
              streams: r.activity.streams as Streams,
            }))}
          />
          <p className="text-meta text-xs leading-relaxed">{t("note")}</p>
        </>
      )}
    </div>
  );
}

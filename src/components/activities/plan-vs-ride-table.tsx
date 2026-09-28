import { ArrowDown, ArrowUp, Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { clockText } from "@/components/training/duration";
import type { PlanVsRide, StepResult, Verdict } from "@/modules/load";
import { cn } from "@/lib/utils";

const MARK: Record<Verdict, { icon: typeof Check; className: string }> = {
  hit: { icon: Check, className: "text-primary" },
  under: { icon: ArrowDown, className: "text-chart-4" },
  over: { icon: ArrowUp, className: "text-chart-4" },
  none: { icon: Minus, className: "text-meta" },
};

/**
 * The plan against the ride, step by step: what the step asked for, what
 * the ride gave over its seconds, and a mark — hit, under, over, or no
 * number to hit. Repetitions are rows of their own. A judgement of the
 * plan, never of the rider: the words say "under" and "over", not "bad".
 */
export function PlanVsRideTable({ result }: { result: PlanVsRide }) {
  const t = useTranslations("activities.plan");
  const intents = useTranslations("workouts.intent");
  const target = (s: StepResult) => {
    const tg = s.target;
    const zone = tg.kind === "zone" ? t("zone", { zone: tg.zone }) : null;
    const watts = s.watts ? t("wattRange", { low: s.watts.low, high: s.watts.high }) : null;
    const bpm = s.bpm ? t("bpmRange", { low: s.bpm.low, high: s.bpm.high }) : null;
    const rpe = tg.kind === "rpe" ? t("rpe", { rpe: tg.value }) : null;
    return [zone, watts ?? bpm, rpe].filter(Boolean).join(" · ") || t("open");
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-2sm leading-relaxed">
        {result.judged > 0
          ? t("summary", { hit: result.hit, judged: result.judged })
          : t("nothingJudged")}{" "}
        <span className="text-meta">
          {t(`aligned.${result.alignedBy}`, { time: clockText(result.offset) })}
        </span>
      </p>
      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-2sm tabular-nums">
          <thead className="bg-secondary text-label text-xs">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t("step")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("time")}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t("target")}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t("ridden")}
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t("verdict")}
              </th>
            </tr>
          </thead>
          <tbody>
            {result.steps.map((s, i) => {
              const mark = MARK[s.verdict];
              const Icon = mark.icon;
              return (
                <tr key={i} className="border-border border-t">
                  <th scope="row" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                    {s.label ?? intents(s.intent)}
                    {s.of > 0 && (
                      <span className="text-meta"> {t("rep", { n: s.repetition, of: s.of })}</span>
                    )}
                  </th>
                  <td className="px-3 py-2 text-right">{clockText(s.seconds)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{target(s)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {[
                      s.avgWatts !== null ? t("watt", { w: s.avgWatts }) : null,
                      s.avgBpm !== null ? t("bpm", { bpm: s.avgBpm }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "–"}
                  </td>
                  <td className={cn("px-3 py-2 whitespace-nowrap", mark.className)}>
                    <Icon aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
                    {t(`mark.${s.verdict}`)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-meta text-xs leading-relaxed">{t("note")}</p>
    </div>
  );
}

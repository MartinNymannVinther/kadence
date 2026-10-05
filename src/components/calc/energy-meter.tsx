import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { Range } from "@/modules/calc/energy";
import { cn } from "@/lib/utils";

export type MeterState = "ok" | "under" | "over";

const STATE: Record<MeterState, { fill: string; text: string; Icon: typeof CircleCheck }> = {
  ok: { fill: "bg-primary", text: "text-success", Icon: CircleCheck },
  under: { fill: "bg-destructive", text: "text-destructive font-semibold", Icon: CircleAlert },
  over: {
    fill: "bg-[#e8a020]",
    text: "text-sticky-ink bg-sticky rounded-sm px-1",
    Icon: TriangleAlert,
  },
};

const pct = (n: number, max: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%`;

/**
 * One goal as a bar: the goal as a pale band, what the plan holds filled
 * in on top — moss when it lands in the band, brown when short, amber when
 * over — and, where there is one, a dashed line for what the body can
 * take. The numbers and a word stand beside it, so the colour is never
 * the only way to read it.
 */
export function EnergyMeter({
  label,
  value,
  shown,
  target,
  goal,
  state,
  stateLabel,
  limit,
  limitLabel,
}: {
  label: string;
  value: number;
  /** The value as written: "150 g". */
  shown: string;
  target: Range;
  /** The goal as written: "Målet er 155–216 g". */
  goal: string;
  state: MeterState | null;
  stateLabel: string | null;
  limit?: number;
  limitLabel?: string;
}) {
  const max = Math.max(value, target.high, limit ?? 0, 1) * 1.15;
  const s = state ? STATE[state] : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-2sm font-semibold">
          {label} <span className="tabular-nums">{shown}</span>
        </span>
        {s && stateLabel && (
          <span className={cn("flex items-center gap-1 text-xs", s.text)}>
            <s.Icon aria-hidden className="size-3.5 shrink-0" />
            {stateLabel}
          </span>
        )}
      </div>
      <div aria-hidden className="bg-secondary relative h-3.5 overflow-visible rounded-full">
        <div
          className="bg-success-tint border-success/50 absolute inset-y-0 rounded-full border border-dashed"
          style={{ left: pct(target.low, max), width: pct(target.high - target.low, max) }}
        />
        <div
          className={cn("absolute inset-y-[3px] left-0 rounded-full", s?.fill ?? "bg-meta")}
          style={{ width: pct(value, max) }}
        />
        {limit !== undefined && (
          <div
            className="border-foreground absolute -inset-y-1 border-l-2 border-dashed"
            style={{ left: pct(limit, max) }}
          />
        )}
      </div>
      <span className="text-meta text-2xs leading-snug">
        {goal}
        {limitLabel && <> · {limitLabel}</>}
      </span>
    </div>
  );
}

import { cn } from "@/lib/utils";

export type LegendItem = {
  key: string;
  label: string;
  /** How the series is drawn, so the key looks like the mark. */
  mark: "line" | "bar" | "band" | "tick" | "dash";
  color: string;
};

/**
 * A chart's legend: always there for two or more series, so no series is
 * told by its colour alone. The key is drawn like the mark it names; the
 * words are in text ink, never in the series colour.
 */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn("text-meta flex flex-wrap gap-x-4 gap-y-1.5 text-xs", className)}>
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <LegendKey mark={item.mark} color={item.color} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function LegendKey({ mark, color }: { mark: LegendItem["mark"]; color: string }) {
  return (
    <svg aria-hidden width="18" height="10" viewBox="0 0 18 10" className="shrink-0">
      {mark === "line" && (
        <line x1="1" x2="17" y1="5" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      )}
      {mark === "dash" && (
        <line x1="1" x2="17" y1="5" y2="5" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
      )}
      {mark === "bar" && <rect x="4" y="1" width="10" height="8" rx="2" fill={color} />}
      {mark === "band" && <rect x="1" y="1" width="16" height="8" rx="2" fill={color} />}
      {mark === "tick" && (
        <line x1="2" x2="16" y1="5" y2="5" stroke={color} strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  );
}

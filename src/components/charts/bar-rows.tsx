import { cn } from "@/lib/utils";

/**
 * Numbers as labelled rows on one scale: on each line a name, its bar
 * and its value, so a bar says what it is where it stands (docs/adr/0104).
 * A bar fills from `from` to `to`, or draws the same span as an outline;
 * a row without a bar writes its words across the bar's place. The words
 * carry the meaning, and the colour only repeats it. The bars are a
 * picture of the values beside them, so they are hidden from a screen
 * reader.
 */

export type BarRow = {
  key: string;
  label: string;
  value: string;
  /** The span the bar covers, in the rows' unit; null writes the value in its place. */
  bar: { from: number; to: number } | null;
  mark: "fill" | "outline";
  color: string;
};

export function BarRows({ rows, className }: { rows: BarRow[]; className?: string }) {
  const top = Math.max(1, ...rows.map((r) => r.bar?.to ?? 0)) * 1.05;
  const pct = (v: number) => `${Math.min(100, (Math.max(0, v) / top) * 100)}%`;
  return (
    <dl
      className={cn(
        "grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5",
        className,
      )}
    >
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <dt className="text-meta">{row.label}</dt>
          {row.bar ? (
            <>
              <dd aria-hidden className="bg-secondary relative h-2.5 rounded-full">
                {row.bar.to > row.bar.from && (
                  <span
                    className={cn(
                      "absolute inset-y-0 rounded-full",
                      row.mark === "outline" && "border-2",
                    )}
                    style={{
                      left: pct(row.bar.from),
                      width: `calc(${pct(row.bar.to)} - ${pct(row.bar.from)})`,
                      ...(row.mark === "outline"
                        ? { borderColor: row.color }
                        : { background: row.color }),
                    }}
                  />
                )}
              </dd>
              <dd className="min-w-14 text-right font-medium tabular-nums">{row.value}</dd>
            </>
          ) : (
            <dd className="col-span-2">{row.value}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}

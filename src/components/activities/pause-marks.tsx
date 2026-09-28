import { Coffee, CupSoda, UtensilsCrossed } from "lucide-react";
import type { PauseKind } from "./pauses";

export type PauseMark = { from: number; to: number; kind: PauseKind; label: string };

const ICON = { soda: CupSoda, coffee: Coffee, lunch: UtensilsCrossed } as const;
const SIZE = 16;

/**
 * Where the rider stopped, on the curves: a pale band over the pause with
 * its symbol — a soda, a coffee, lunch — or, with pauses hidden, a dashed
 * seam where the curves were joined. The symbol's title says how long.
 */
export function PauseMarks({
  marks,
  x,
  top,
  bottom,
}: {
  marks: PauseMark[];
  x: (seconds: number) => number;
  top: number;
  bottom: number;
}) {
  return (
    <g>
      {marks.map((mark) => {
        const Icon = ICON[mark.kind];
        const left = x(mark.from);
        const right = x(mark.to);
        const centre = (left + right) / 2;
        return (
          <g key={`${mark.from}-${mark.kind}`}>
            <title>{mark.label}</title>
            {right - left > 1 ? (
              <rect
                x={left}
                y={top}
                width={right - left}
                height={bottom - top}
                fill="var(--chart-5)"
                opacity={0.6}
              />
            ) : (
              <line
                x1={left}
                x2={left}
                y1={top}
                y2={bottom}
                stroke="var(--meta)"
                strokeDasharray="3 3"
              />
            )}
            <circle
              cx={centre}
              cy={top + SIZE / 2 + 1}
              r={SIZE / 2 + 3}
              fill="var(--card)"
              stroke="var(--border)"
            />
            <Icon
              x={centre - SIZE / 2 + 2}
              y={top + 3}
              width={SIZE - 4}
              height={SIZE - 4}
              color="var(--chart-4)"
              strokeWidth={2.25}
              aria-hidden
            />
          </g>
        );
      })}
    </g>
  );
}

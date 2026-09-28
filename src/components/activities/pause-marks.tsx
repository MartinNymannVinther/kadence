import { Coffee, CupSoda, UtensilsCrossed } from "lucide-react";
import { visibleCentre } from "@/components/charts/scale";
import { hasSymbol, type PauseKind } from "./pauses";

export type PauseMark = { from: number; to: number; kind: PauseKind; label: string };

const ICON = { stop: null, soda: CupSoda, coffee: Coffee, lunch: UtensilsCrossed } as const;
const SIZE = 16;
/** The symbol's disc: the icon with a little air around it. */
const RADIUS = SIZE / 2 + 3;

/**
 * Where the rider stopped, on the curves: a pale band over the pause — or,
 * with pauses hidden, a dashed seam where the curves were joined — and,
 * for a longer stop, its symbol: a soda, a coffee, lunch. A traffic light
 * is a band or a seam without one. The title says how long. A window
 * that cuts a pause keeps the symbol on the part still shown, so a grey
 * block at the plot's edge is never without its cup.
 */
export function PauseMarks({
  marks,
  x,
  top,
  bottom,
  span,
}: {
  marks: PauseMark[];
  x: (seconds: number) => number;
  top: number;
  bottom: number;
  /** Seconds shown on the chart's clock; a mark wholly outside is skipped, one astride is clipped by the chart. */
  span: readonly [number, number];
}) {
  const plot: [number, number] = [x(span[0]), x(span[1])];
  const shown = marks.filter((m) => m.to >= span[0] && m.from <= span[1]);
  return (
    <g>
      {shown.map((mark) => {
        const Icon = ICON[mark.kind];
        const left = x(mark.from);
        const right = x(mark.to);
        const centre = visibleCentre([left, right], plot, RADIUS);
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
            {Icon && hasSymbol(mark.kind) && (
              <>
                <circle
                  cx={centre}
                  cy={top + SIZE / 2 + 1}
                  r={RADIUS}
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
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

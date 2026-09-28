/**
 * The stretch being dragged across a chart: a pale band between two
 * pixel columns with a dashed line at each edge, over every strip at
 * once. The edges come in the order they were dragged — right to left
 * as often as not — and are put in order here, since an SVG rect with a
 * negative width paints nothing. Decoration only; the readout says what
 * is being selected.
 */
export function SelectionBand({
  left,
  right,
  top,
  bottom,
}: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}) {
  const from = Math.min(left, right);
  const to = Math.max(left, right);
  return (
    <g aria-hidden>
      <rect
        x={from}
        y={top}
        width={to - from}
        height={bottom - top}
        fill="var(--primary)"
        opacity={0.12}
      />
      {[from, to].map((px, i) => (
        <line
          key={i}
          x1={px}
          x2={px}
          y1={top}
          y2={bottom}
          stroke="var(--primary)"
          strokeDasharray="3 3"
        />
      ))}
    </g>
  );
}

/**
 * A start set by a tap, waiting for its end: a dashed line down the
 * strips with a small triangle at the top — a shape, not a colour, marks
 * it, and the readout carries the words.
 */
export function EdgeMark({ x, top, bottom }: { x: number; top: number; bottom: number }) {
  return (
    <g aria-hidden>
      <line x1={x} x2={x} y1={top} y2={bottom} stroke="var(--primary)" strokeDasharray="3 3" />
      <path d={`M${x - 4},${top}L${x + 4},${top}L${x},${top + 6}Z`} fill="var(--primary)" />
    </g>
  );
}

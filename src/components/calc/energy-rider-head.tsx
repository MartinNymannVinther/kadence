import type { Mood } from "@/modules/calc/fuel-check";

/** How the rider looks: one of the plan's moods, waiting at the start, or over the line on target. */
export type RiderLook = Mood | "ready" | "podium";

export const SKIN = "#e2b08a";
const INK = "#2b2b33";
const HELMET = "#f2b705";

/**
 * The rider's head in profile, facing the way they ride, with a face for
 * each look: a smile, a flat mouth when hungry, a frown and heavy eyes
 * when the energy is gone, an open mouth and red cheeks when thirsty, a
 * green tinge and a wavy mouth for the stomach, a round "o" when it
 * sloshes, and a wide grin over the line. Drawn about (cx, cy) in the
 * rider's own units.
 */
export function RiderHead({
  cx,
  cy,
  look,
  hot,
}: {
  cx: number;
  cy: number;
  look: RiderLook;
  hot: boolean;
}) {
  const r = 7.5;
  const eye = { x: cx + 3.4, y: cy - 0.6 };
  const m = { x: cx + 2.2, y: cy + 3 };
  const tint = look === "stomach" ? "#7fcf7f77" : look === "empty" ? "#9aa0a666" : null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={SKIN} />
      {tint && <circle cx={cx} cy={cy} r={r} fill={tint} />}
      <ellipse cx={cx - 1.6} cy={cy + 0.6} rx={1.4} ry={1.9} fill="#c9946f" />
      {/* The helmet, with its vents and a short peak over the eyes. */}
      <path
        d={`M${cx - 8.6} ${cy + 0.4} Q${cx - 8.4} ${cy - 9.6} ${cx + 1} ${cy - 9.4} Q${cx + 9} ${cy - 8.6} ${cx + 9.2} ${cy - 2.2} L${cx + 5} ${cy - 2.6} Q${cx - 1} ${cy - 3.2} ${cx - 8.6} ${cy + 0.4} Z`}
        fill={HELMET}
        stroke="#00000033"
        strokeWidth={0.6}
      />
      <path
        d={`M${cx - 4} ${cy - 7.6} L${cx - 1.5} ${cy - 4.2} M${cx + 1} ${cy - 8.4} L${cx + 2.6} ${cy - 4.4} M${cx + 5} ${cy - 7.4} L${cx + 5.6} ${cy - 3.6}`}
        stroke="#00000055"
        strokeWidth={1}
        strokeLinecap="round"
      />
      <Eyes look={look} x={eye.x} y={eye.y} />
      <Mouth look={look} x={m.x} y={m.y} />
      {(look === "thirsty" || (hot && look === "podium")) && (
        <circle cx={cx + 2} cy={cy + 2.4} r={1.8} fill="#ff5a5a77" />
      )}
      {(look === "thirsty" || (hot && look !== "ready")) && <Sweat cx={cx} cy={cy} />}
    </g>
  );
}

function Eyes({ look, x, y }: { look: RiderLook; x: number; y: number }) {
  if (look === "podium")
    return (
      <path
        d={`M${x - 1.4} ${y + 0.6} Q${x} ${y - 1.4} ${x + 1.4} ${y + 0.6}`}
        fill="none"
        stroke={INK}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    );
  if (look === "empty")
    return (
      <path
        d={`M${x - 1.3} ${y + 0.4} L${x + 1.3} ${y + 0.8}`}
        stroke={INK}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    );
  return (
    <>
      <circle cx={x} cy={y} r={1} fill={INK} />
      {look === "stomach" && (
        <path d={`M${x - 1.5} ${y - 2.6} L${x + 1.2} ${y - 1.8}`} stroke={INK} strokeWidth={0.7} />
      )}
    </>
  );
}

function Mouth({ look, x, y }: { look: RiderLook; x: number; y: number }) {
  const line = { fill: "none", stroke: INK, strokeWidth: 0.9, strokeLinecap: "round" as const };
  switch (look) {
    case "podium":
      return (
        <path d={`M${x} ${y - 0.4} Q${x + 2.6} ${y + 4.6} ${x + 5} ${y - 0.8} Z`} fill={INK} />
      );
    case "good":
    case "ready":
      return <path d={`M${x} ${y} Q${x + 2.4} ${y + 2.4} ${x + 4.6} ${y - 0.4}`} {...line} />;
    case "hungry":
      return <path d={`M${x + 0.4} ${y + 0.8} L${x + 4.4} ${y + 0.4}`} {...line} />;
    case "empty":
      return (
        <path d={`M${x + 0.2} ${y + 1.8} Q${x + 2.4} ${y - 0.2} ${x + 4.4} ${y + 1.6}`} {...line} />
      );
    case "thirsty":
      return (
        <>
          <ellipse cx={x + 2.6} cy={y + 0.8} rx={1.5} ry={1.9} fill={INK} />
          <ellipse cx={x + 3} cy={y + 2.2} rx={1.1} ry={0.9} fill="#e0533d" />
        </>
      );
    case "stomach":
      return (
        <path
          d={`M${x} ${y + 0.8} q1 -1 2 0 q1 1 2 0 q0.6 -0.6 1 -0.2`}
          {...line}
          stroke="#2f6b2f"
        />
      );
    case "slosh":
      return <circle cx={x + 2.6} cy={y + 0.8} r={1.2} {...line} />;
  }
}

function Sweat({ cx, cy }: { cx: number; cy: number }) {
  const drop = (x: number, y: number, s: number) =>
    `M${x} ${y} q${-1.4 * s} ${2.4 * s} 0 ${3.2 * s} q${1.4 * s} ${-0.8 * s} 0 ${-3.2 * s} Z`;
  return (
    <g fill="#5fb3e0">
      <path d={drop(cx - 10.5, cy - 3, 1)} />
      <path d={drop(cx - 12.5, cy + 3, 0.8)} />
      <path d={drop(cx + 9.6, cy - 6, 0.7)} />
    </g>
  );
}

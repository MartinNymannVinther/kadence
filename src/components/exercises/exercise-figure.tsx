import { figureGeometry, type FigurePrimitive } from "@/modules/exercises/figure";
import { FIGURE_CSS_VARS } from "@/modules/exercises/figure-colours";
import { BOX, type Pose } from "@/modules/exercises/types";
import { cn } from "@/lib/utils";

/**
 * An exercise's figure on the page and in the app: the same geometry as
 * the downloaded file (`figureSvg`), painted with Kadence's tokens so it
 * follows light and dark mode (src/modules/exercises/figure-colours.ts).
 * The caller names the exercise in `label`; the drawing is one image to a
 * screen reader. It fills its width; the panel behind it is the caller's.
 */
export function ExerciseFigure({
  pose,
  label,
  className,
}: {
  pose: Pose;
  label: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      role="img"
      aria-label={label}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("block h-auto w-full", className)}
    >
      {figureGeometry(pose).map((p, i) => (
        <Primitive key={i} p={p} />
      ))}
    </svg>
  );
}

function Primitive({ p }: { p: FigurePrimitive }) {
  const colour = FIGURE_CSS_VARS[p.tone];
  const opacity = p.opacity < 1 ? p.opacity : undefined;
  const stroke = { stroke: colour, strokeWidth: p.width, opacity };
  switch (p.shape) {
    case "polyline":
      return <polyline points={p.points.map(([x, y]) => `${x},${y}`).join(" ")} style={stroke} />;
    case "curve":
      return (
        <path
          d={`M${p.from[0]} ${p.from[1]}Q${p.control[0]} ${p.control[1]} ${p.to[0]} ${p.to[1]}`}
          style={stroke}
        />
      );
    case "circle":
      return (
        <circle
          cx={p.center[0]}
          cy={p.center[1]}
          r={p.r}
          style={p.fill ? { fill: colour, opacity } : stroke}
        />
      );
    case "rect":
      return (
        <rect
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          rx={p.radius}
          style={p.fill ? { fill: colour, opacity } : stroke}
        />
      );
  }
}

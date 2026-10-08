"use client";

import { useTranslations } from "next-intl";
import { useWidth } from "@/components/charts/use-width";
import { sprocketLadder } from "@/modules/calc/gear-build";
import { pitchRadiusMm } from "@/modules/calc/gearing";

const PAD = 10;
const LABELS = 38;
/** Chainstay length: the rear hub to the bottom bracket, in millimetres, as in the bike drawing. */
const CHAINSTAY_MM = 405;

/** A hundredth of a pixel: trigonometry may differ in its last digit between server and browser. */
const q = (n: number) => Math.round(n * 100) / 100;

/**
 * A build's drivetrain seen from the chain's side, to scale: the
 * cassette's sprockets as rings round the rear hub with the smallest —
 * the one that counts — in moss, the chainring (and a double's small
 * ring, dashed, which does not count) at the bottom bracket, and the
 * chain on the biggest gear. Only the cassette's smallest and largest
 * sprockets are its real ones; those between are drawn evenly, and the
 * crank is drawn short so it stays inside the ring.
 */
export function DrivetrainDrawing({
  ring,
  small,
  smallest,
  largest,
  speeds,
}: {
  ring: number;
  /** A double's small ring, or null for one ring in front. */
  small: number | null;
  smallest: number;
  largest: number;
  speeds: number;
}) {
  const t = useTranslations("calculators.gearing.products.drawing");
  const { ref, width } = useWidth<HTMLDivElement>(320);

  const ringR = pitchRadiusMm(ring);
  const bigCog = pitchRadiusMm(largest);
  const span = bigCog + CHAINSTAY_MM + ringR + 8;
  const k = Math.min((width - 2 * PAD) / span, 0.62);
  const tall = Math.max(ringR, bigCog) * k;
  const cy = PAD + tall + 4;
  const height = cy + tall + LABELS;
  const hub = PAD + (bigCog + 4) * k;
  const bb = hub + CHAINSTAY_MM * k;
  const R = ringR * k;
  const c = pitchRadiusMm(smallest) * k;

  // The chain's two straight runs: tangents to the ring and the smallest sprocket.
  const sin = (R - c) / (bb - hub);
  const cos = Math.sqrt(1 - sin * sin);
  const run = (dir: 1 | -1) =>
    `M${q(hub - c * sin)},${q(cy - dir * c * cos)} L${q(bb - R * sin)},${q(cy - dir * R * cos)}`;

  const ladder = sprocketLadder(smallest, largest, speeds).reverse();
  const labelY = cy + tall + 18;

  return (
    <div ref={ref} className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          small === null
            ? t("labelSingle", { ring, smallest, largest })
            : t("labelDouble", { ring, small, smallest, largest })
        }
        className="block"
      >
        {ladder.map((teeth, i) => (
          <circle
            key={i}
            cx={hub}
            cy={cy}
            r={q(pitchRadiusMm(teeth) * k)}
            fill="var(--card)"
            stroke="var(--meta)"
            strokeWidth={0.8}
          />
        ))}
        <circle
          cx={hub}
          cy={cy}
          r={q(c)}
          fill="color-mix(in oklch, var(--primary) 18%, var(--card))"
          stroke="var(--primary)"
          strokeWidth={2.5}
        />

        {small !== null && (
          <circle
            cx={bb}
            cy={cy}
            r={q(pitchRadiusMm(small) * k)}
            fill="none"
            stroke="var(--meta)"
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
        )}
        <circle
          cx={bb}
          cy={cy}
          r={q(R + 2)}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          strokeDasharray="1.5 1.5"
        />
        <circle cx={bb} cy={cy} r={q(R)} fill="none" stroke="var(--foreground)" strokeWidth={2.5} />
        <line
          x1={bb}
          y1={cy}
          x2={q(bb + R * 0.45)}
          y2={q(cy + R * 0.78)}
          stroke="var(--foreground)"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={bb} cy={cy} r={3} fill="var(--foreground)" />

        <path
          d={`${run(1)} ${run(-1)}`}
          stroke="var(--label)"
          strokeWidth={2.5}
          strokeDasharray="4 2"
          fill="none"
        />
        <circle cx={hub} cy={cy} r={2.5} fill="var(--foreground)" />

        <text x={PAD} y={labelY} className="fill-primary text-2xs font-semibold">
          {t("smallest", { n: smallest })}
        </text>
        <text x={PAD} y={labelY + 14} className="fill-meta text-2xs">
          {t("cassette", { smallest, largest })}
        </text>
        <text
          x={width - PAD}
          y={labelY}
          textAnchor="end"
          className="fill-foreground text-2xs font-semibold"
        >
          {t("ring", { n: ring })}
        </text>
        {small !== null && (
          <text x={width - PAD} y={labelY + 14} textAnchor="end" className="fill-meta text-2xs">
            {t("small", { n: small })}
          </text>
        )}
      </svg>
    </div>
  );
}

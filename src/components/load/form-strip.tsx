import { useLocale, useTranslations } from "next-intl";
import { signed } from "@/components/charts/format";
import { areaPath, linePath, type Scale } from "@/components/charts/scale";
import { FATIGUE_COLOUR, FITNESS_COLOUR, FORM_COLOUR } from "./form-state";

type Point = readonly [number, number];

/**
 * The friskhed strip under the load chart: zero in the middle, the line
 * in friskhed's own colour, the area above zero tinted moss with the word
 * "udhvilet" and below zero clay with "træt" at its left, and a number at each edge
 * so the strip has a scale like the chart above it. The dashed part past
 * today is the plan's (ADR 0108). Drawn inside the chart's SVG.
 */
export function FormStrip({
  clip,
  left,
  right,
  top,
  height,
  limit,
  yForm,
  past,
  ahead,
  wordsFit,
}: {
  clip: string;
  left: number;
  right: number;
  top: number;
  height: number;
  /** The strip's edge value: +limit at the top, −limit at the bottom. */
  limit: number;
  yForm: Scale;
  past: Point[];
  /** From today on, today's point first; empty without a forecast. */
  ahead: Point[];
  /** Room for the words inside the strip; on a phone the tiles say them. */
  wordsFit: boolean;
}) {
  const t = useTranslations("load");
  const locale = useLocale();
  const zero = yForm(0);
  const bottom = top + height;
  const half = height / 2;
  return (
    <g>
      <defs>
        <clipPath id={`${clip}-above`}>
          <rect x={0} y={top - 2} width={right + 2} height={half + 2} />
        </clipPath>
        <clipPath id={`${clip}-below`}>
          <rect x={0} y={zero} width={right + 2} height={half + 2} />
        </clipPath>
      </defs>
      <text x={left} y={top - 8} className="fill-foreground text-2xs font-medium">
        {t("form")}
      </text>
      {[top, bottom].map((y) => (
        <line key={y} x1={left} x2={right} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
      ))}
      <line x1={left} x2={right} y1={zero} y2={zero} stroke="var(--input)" strokeWidth={1} />
      <path
        d={areaPath(past, zero)}
        fill={FITNESS_COLOUR}
        opacity={0.16}
        clipPath={`url(#${clip}-above)`}
      />
      <path
        d={areaPath(past, zero)}
        fill={FATIGUE_COLOUR}
        opacity={0.22}
        clipPath={`url(#${clip}-below)`}
      />
      <path
        d={linePath(past)}
        fill="none"
        stroke={FORM_COLOUR}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {ahead.length > 1 && (
        <path
          d={linePath(ahead)}
          fill="none"
          stroke={FORM_COLOUR}
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      )}
      {[limit, 0, -limit].map((value) => (
        <text
          key={value}
          x={left - 6}
          y={yForm(value) + 4}
          textAnchor="end"
          className="fill-meta text-2xs"
        >
          {signed(value, locale)}
        </text>
      ))}
      {wordsFit && (
        <>
          <text x={left + 6} y={top + 11} className="fill-meta text-2xs">
            {t("state.rested")}
          </text>
          <text x={left + 6} y={bottom - 4} className="fill-meta text-2xs">
            {t("state.veryTired")}
          </text>
        </>
      )}
    </g>
  );
}

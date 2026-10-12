import type { Volume } from "@/modules/season/volume";

const GOAL = "var(--series-1)";
const RIDDEN = "var(--series-2)";
const TICK = "var(--foreground)";

/**
 * A month of the season as a small bar (docs/adr/0093), drawn as the
 * season chart draws it (season-chart.tsx): the season plan's hours as a
 * thin bar above, below it the hours put in the calendar as an outline
 * with the hours ridden filling it, and the paradigm's month as a dark
 * tick across both where the team plans by one. Every month is drawn to
 * the season's one scale, `top`. A picture of the numbers written beside
 * it, so it is hidden from a screen reader.
 */
export function MonthBar({ volume, top }: { volume: Volume; top: number }) {
  const pct = (v: number) => `${Math.min(100, (Math.max(0, v) / Math.max(1, top)) * 100)}%`;
  const dcu = volume.dcu && volume.dcu.target > 0 ? volume.dcu.target : null;
  return (
    <svg aria-hidden width="100%" height="22" className="block overflow-visible">
      <rect x="0" y="1" width="100%" height="5" rx="2.5" fill="var(--secondary)" />
      {volume.goal !== null && volume.goal > 0 && (
        <rect x="0" y="1" width={pct(volume.goal)} height="5" rx="2.5" fill={GOAL} />
      )}
      <rect x="0" y="10" width="100%" height="10" rx="3" fill="var(--secondary)" />
      {volume.planned > 0 && (
        <rect
          x="0"
          y="11"
          width={pct(volume.planned)}
          height="8"
          rx="2.5"
          fill="none"
          stroke={RIDDEN}
          strokeWidth="2"
        />
      )}
      {volume.done > 0 && (
        <rect x="0" y="10" width={pct(volume.done)} height="10" rx="3" fill={RIDDEN} />
      )}
      {dcu !== null && <rect x={pct(dcu)} y="0" width="3" height="22" rx="1.5" fill={TICK} />}
    </svg>
  );
}

/** The season's scale: the largest number any month draws. */
export function seasonTop(volumes: readonly Volume[]): number {
  return (
    Math.max(
      1,
      ...volumes.map((v) => Math.max(v.goal ?? 0, v.planned, v.done, v.dcu?.target ?? 0)),
    ) * 1.05
  );
}

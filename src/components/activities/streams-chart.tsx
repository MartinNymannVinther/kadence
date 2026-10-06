"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { invertScale, linearScale } from "@/components/charts/scale";
import { EdgeMark, SelectionBand } from "@/components/charts/selection-band";
import { useHoverIndex } from "@/components/charts/use-hover-index";
import { useRangeSelect } from "@/components/charts/use-range-select";
import { useWidth } from "@/components/charts/use-width";
import { spanFromSeconds, type Span } from "@/components/charts/zoom";
import { usePointerCoarse } from "@/components/common/use-pointer-coarse";
import { clockStamp, momentText } from "./axis-ticks";
import { ChannelToggles } from "./channel-toggles";
import { PauseMarks, type PauseMark } from "./pause-marks";
import { CHANNELS, hoursMinutes, present, type Channel, type Streams } from "./streams-data";
import { StreamsHint } from "./streams-hint";
import { readoutText } from "./streams-readout";
import { AXIS, LEFT, RIGHT, ROW, StreamsStrip, StripLabel } from "./streams-strip";
import { TimeAxis } from "./time-axis";
import { useStreamsZoom } from "./use-streams-zoom";
import { ZoomToolbar } from "./zoom-toolbar";

export type { Streams } from "./streams-data";

/**
 * The ride over time: watt, pulse, speed, cadence and height, each in its
 * own strip on its own scale over one shared time axis — never two scales
 * on one plot. Each channel can be turned off; a pointer, a tap or the
 * arrow keys read every visible channel at the same moment, and `onIndex`
 * hears which sample of `streams` that is, so the route can show where it
 * was. A stretch dragged across the curves, two taps in the select mode,
 * or the buttons below zoom the time axis; every number read is the same
 * stored sample either way.
 */
export function StreamsChart({
  streams,
  onIndex,
  pauses = [],
}: {
  streams: Streams;
  onIndex?: (index: number | null) => void;
  /** Pauses on this chart's clock: a band while shown, a seam once hidden. */
  pauses?: PauseMark[];
}) {
  const t = useTranslations("activities.streams");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const available = useMemo(() => CHANNELS.filter((c) => present(streams[c] ?? [])), [streams]);
  const [on, setOn] = useState<Set<Channel>>(() => new Set(available));
  const [armed, setArmed] = useState(false);
  const coarse = usePointerCoarse();
  const zoom = useStreamsZoom(streams);
  const { span, data, clock } = zoom;
  const visible = available.filter((c) => on.has(c));
  // One x-scale for everything drawn, over the window's own ends: the last
  // drawn point may sit a few samples short of the edge when thinned, but
  // the printed end and a drag to the edge both mean the window's last sample.
  const lo = span?.lo ?? 0;
  const hi = span?.hi ?? streams.t.length - 1;
  const domain: [number, number] = [
    streams.t[lo] ?? 0,
    Math.max((streams.t[lo] ?? 0) + 1, streams.t[hi] ?? 1),
  ];
  const plot: [number, number] = [LEFT, width - RIGHT];
  const x = linearScale(domain, plot);
  const invert = invertScale(domain, plot);
  const clampX = (px: number) => Math.min(Math.max(px, plot[0]), plot[1]);
  // The hover works in drawn positions; `reading` is the sample of `streams` behind one.
  const hover = useHoverIndex(data.t.length, (k) => x(data.t[k] ?? 0), { pinTouch: true });
  // A new clock — pauses hidden or shown — reads nothing until asked again: a
  // drawn-point index on the old clock names another moment on this one, and
  // across a pause there is no moment to carry it to (ADR 0028). The zoom's
  // token is one object per clock, so a server round trip — a comment posted
  // under the ride — keeps the reading. Cleared before this render is shown,
  // so the route never hears a moment nobody chose.
  const [readClock, setReadClock] = useState(clock);
  if (readClock !== clock) {
    setReadClock(clock);
    hover.set(null);
  }
  const at =
    hover.index === null || data.t.length === 0 ? null : Math.min(hover.index, data.t.length - 1);
  const reading = at === null ? null : (data.index[at] ?? null);
  useEffect(() => onIndex?.(reading), [onIndex, reading]);
  const clipId = `clip-${useId().replace(/\W/g, "")}`;

  /** The one place a window changes; the reading follows to the drawn point nearest its moment. */
  function changeSpan(next: Span | null) {
    zoom.setSpan(next);
    if (at !== null) hover.set(zoom.nearest(next, data.t[at] ?? 0));
  }
  const select = useRangeSelect({
    armed,
    onSelect: (x0, x1) => {
      changeSpan(spanFromSeconds(streams.t, invert(clampX(x0)), invert(clampX(x1))));
      setArmed(false);
    },
    onReset: () => changeSpan(null),
  });
  // A start stored in px never outlives a rotation, a zoom or a new clock.
  const { clear } = select;
  useEffect(() => clear(), [clear, width, span, clock]);

  function onArm(next: boolean) {
    setArmed(next);
    if (!next) select.clear();
  }
  const anchor = reading ?? undefined;
  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (e.key === "Escape" && (select.band || select.edge !== null)) select.clear();
    else if (e.key === "Escape" && armed) onArm(false);
    else if (e.key === "Enter" && at !== null) select.tap(x(data.t[at] ?? 0));
    else {
      const next = zoom.keyMove(e, anchor);
      if (next === undefined) {
        hover.handlers.onKeyDown(e);
        return;
      }
      changeSpan(next);
    }
    e.preventDefault();
  }

  if (available.length === 0) return <p className="text-meta text-2sm">{t("none")}</p>;

  const unit: Record<Channel, (v: number) => string> = {
    power: (v) => t("watt", { w: Math.round(v) }),
    hr: (v) => t("bpm", { bpm: Math.round(v) }),
    speed: (v) => t("kmh", { kmh: num(v, locale, 1) }),
    cadence: (v) => t("rpm", { rpm: Math.round(v) }),
    alt: (v) => t("m", { m: num(v, locale) }),
  };
  // One clock for the window: the ticks, the printed ends, the status and the
  // selection's readout all go through `stamp`, so none of them mixes shapes.
  const totalSeconds = streams.t.at(-1) ?? 0;
  const stamp = clockStamp(domain, totalSeconds);
  const total = hoursMinutes(totalSeconds);
  const shown = span
    ? { from: stamp(streams.t[span.lo] ?? 0), to: stamp(streams.t[span.hi] ?? 0), total }
    : null;
  const status = shown ? t("showing", shown) : t("wholeStatus", { total });
  const band = select.band ? ([clampX(select.band[0]), clampX(select.band[1])] as const) : null;
  const readout = readoutText({
    t,
    band,
    edge: select.edge === null ? null : clampX(select.edge),
    armed,
    coarse,
    select: t("select"),
    at,
    clock: at === null ? "" : momentText(data.t[at] ?? 0, totalSeconds),
    values:
      at === null
        ? []
        : visible.map((c) => {
            const v = data.values[c][at];
            return { label: t(c), text: typeof v === "number" ? unit[c](v) : "–" };
          }),
    stamp: (px) => stamp(invert(px)),
  });
  const height = visible.length * ROW + AXIS;
  const channels = visible.map((c) => t(c)).join(", ");

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ChannelToggles
        available={available}
        on={on}
        label={t("show")}
        name={(c) => t(c)}
        onChange={(c, checked) =>
          setOn((current) => {
            const next = new Set(current);
            if (checked) next.add(c);
            else next.delete(c);
            return next;
          })
        }
      />
      {/* On a phone the hint runs to three lines and a reading to two; the
          line keeps the hint's height, so the curves and the buttons under
          them never move under the finger that changed the words. */}
      <p
        className="text-2sm pointer-coarse:min-h-[3lh] min-h-5 font-medium tabular-nums"
        aria-live="polite"
      >
        {readout ?? <StreamsHint zoomable={zoom.zoomable} />}
      </p>
      <div
        ref={ref}
        className={`w-full rounded-md ${armed ? "outline-primary outline-2 outline-dashed outline-offset-2" : ""}`}
      >
        {visible.length > 0 && (
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={shown ? t("labelZoomed", { channels, ...shown }) : t("label", { channels })}
            className="focus-visible:outline-ring block cursor-crosshair touch-pan-y touch-pinch-zoom rounded-md outline-none select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-solid"
            {...hover.handlers}
            {...select.handlers}
            onPointerDown={(e) => {
              hover.handlers.onPointerDown(e);
              select.handlers.onPointerDown(e);
            }}
            onPointerMove={(e) => {
              // While a press is held only the band moves; the reading stays where it was pressed.
              if (!select.active) hover.handlers.onPointerMove(e);
              select.handlers.onPointerMove(e);
            }}
            onPointerUp={(e) => {
              hover.handlers.onPointerUp(e);
              select.handlers.onPointerUp(e);
            }}
            onPointerCancel={(e) => {
              hover.handlers.onPointerCancel(e);
              select.handlers.onPointerCancel(e);
            }}
            onKeyDown={onKeyDown}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={LEFT} y={0} width={plot[1] - plot[0]} height={height - AXIS} />
              </clipPath>
            </defs>
            {visible.map((c, row) => (
              <StreamsStrip
                key={c}
                channel={c}
                values={data.values[c]}
                t={data.t}
                x={x}
                width={width}
                head={row * ROW}
                at={at}
                locale={locale}
              />
            ))}
            <g clipPath={`url(#${clipId})`}>
              <PauseMarks marks={pauses} x={x} top={0} bottom={height - AXIS} span={domain} />
              {band && (
                <SelectionBand left={band[0]} right={band[1]} top={0} bottom={height - AXIS} />
              )}
              {select.edge !== null && (
                <EdgeMark x={clampX(select.edge)} top={0} bottom={height - AXIS} />
              )}
              {at !== null && (
                <line
                  x1={x(data.t[at] ?? 0)}
                  x2={x(data.t[at] ?? 0)}
                  y1={0}
                  y2={height - AXIS}
                  stroke="var(--meta)"
                  strokeWidth={1}
                  aria-hidden
                />
              )}
            </g>
            {/* The names last, so a pause band at the plot's edge never greys them. */}
            {visible.map((c, row) => (
              <StripLabel key={c} row={row} text={t(c)} />
            ))}
            <TimeAxis
              domain={domain}
              plot={plot}
              x={x}
              y={height - 4}
              stamp={stamp}
              ends={shown ? [shown.from, shown.to] : null}
            />
          </svg>
        )}
      </div>
      {zoom.zoomable && (
        <>
          <ZoomToolbar
            status={status}
            armed={armed}
            onArm={onArm}
            canIn={zoom.canIn}
            canOut={zoom.canOut}
            canEarlier={zoom.canEarlier}
            canLater={zoom.canLater}
            onIn={() => changeSpan(zoom.zoomedIn(anchor))}
            onOut={() => changeSpan(zoom.zoomedOut(anchor))}
            onEarlier={() => changeSpan(zoom.shifted(-1))}
            onLater={() => changeSpan(zoom.shifted(1))}
            onWhole={() => changeSpan(null)}
          />
          <p className="text-meta text-xs leading-relaxed">{t("zoomHint")}</p>
        </>
      )}
    </div>
  );
}

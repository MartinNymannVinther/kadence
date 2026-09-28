import { thinIndices, type Span } from "@/components/charts/zoom";

/**
 * What the ride's curves are drawn from: the streams as stored, the
 * channels they can show, and the thinning that picks which samples are
 * drawn — a pick, never an average, so no readout number can change with
 * the zoom. Pure, so the round trip from drawn point to sample is tested
 * on its own.
 */

export type Streams = {
  t: number[];
  power?: (number | null)[];
  hr?: (number | null)[];
  cadence?: (number | null)[];
  /** m/s; drawn as km/h. */
  speed?: (number | null)[];
  alt?: (number | null)[];
  lat?: (number | null)[];
  lon?: (number | null)[];
};

export const CHANNELS = ["power", "hr", "speed", "cadence", "alt"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Points drawn per line at most; the stored streams are already 5-second averages. */
export const MAX_POINTS = 480;

export const STROKE: Record<Channel, string> = {
  power: "var(--series-1)",
  hr: "var(--series-2)",
  speed: "var(--series-1)",
  cadence: "var(--series-1)",
  alt: "var(--meta)",
};

export const present = (values: (number | null)[]) =>
  values.some((v) => typeof v === "number" && v > 0);

/** Time into the ride as h:mm, the axis' own short form. */
export const hoursMinutes = (seconds: number) =>
  `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}`;

/**
 * Whether two streams run on the same clock: the same moments, sample for
 * sample. A server round trip — a comment posted under the ride — hands
 * the chart a new object with the very same samples; hiding or showing
 * pauses hands it a clock with fewer or more of them (ADR 0028).
 */
export function sameClock(a: Streams, b: Streams): boolean {
  return a === b || (a.t.length === b.t.length && a.t.every((s, i) => s === b.t[i]));
}

/** A window and the streams it was set on: the first object seen on that clock. */
export type SpanOn = { streams: Streams; span: Span | null };

/**
 * The window against the streams now shown: `stored` itself while they
 * run on the clock it was set on, whatever the object, and the whole ride
 * on a new clock — pauses hidden or shown — with the new streams as its
 * owner, so a window set before never comes back when the old clock does.
 */
export function spanOn(stored: SpanOn, streams: Streams): SpanOn {
  return sameClock(stored.streams, streams) ? stored : { streams, span: null };
}

/**
 * The drawn points of `span` (the whole ride when null): `index[k]` is
 * the sample drawn point k is, `t[k]` and `values[c][k]` are that
 * sample's own numbers. An absent channel yields `[]`.
 */
export function thin(
  streams: Streams,
  span: Span | null,
): {
  index: number[];
  step: number;
  t: number[];
  values: Record<Channel, (number | null)[]>;
} {
  const { index, step } = thinIndices(streams.t.length, span, MAX_POINTS);
  const pick = (channel: (number | null)[] | undefined) =>
    channel ? index.map((i) => channel[i] ?? null) : [];
  return {
    index,
    step,
    t: index.map((i) => streams.t[i]!),
    values: {
      power: pick(streams.power),
      hr: pick(streams.hr),
      speed: pick(streams.speed).map((v) => (typeof v === "number" ? v * 3.6 : null)),
      cadence: pick(streams.cadence),
      alt: pick(streams.alt),
    },
  };
}

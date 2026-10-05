import { PALETTE as P } from "./palette";

/**
 * Where a bike's bars sit against the rider's own, metres: `low` lower —
 * a short head tube and a stem angled down — and `reach` further forward,
 * on a longer stem; and `tilt`, radians the bar is turned up about where
 * the stem holds it, the hoods and the drops with it. The rider's hands
 * go with them (`poseOf`).
 */
export type Bars = { low: number; reach: number; tilt: number };
export const OWN_BARS: Bars = { low: 0, reach: 0, tilt: 0 };

/** A rider's colours, head to toe, and their bike's (`RiderFigure`, `RoadBike`). */
export type Kit = {
  jersey: string;
  sleeve: string;
  /** The band across the jersey's back. */
  band: string;
  /** How wide the band is, as a share of the torso's length: a tenth, if not given. */
  bandWidth?: number;
  shorts: string;
  skin: string;
  helmet: string;
  sock: string;
  shoe: string;
  glove: string;
  lens: string;
  frame: string;
  /** The fork and the head tube. */
  fork: string;
  /** The band on the down tube. */
  accent: string;
  tape: string;
  /** A road helmet with vents along its top, or a smooth aero one with its straps. */
  helmetStyle: "vented" | "aero";
  /** Two bands round each sleeve, if the jersey has them. */
  sleeveStripe?: string;
  /** The shorts' leg ends, the band nearer the knee last, if they have them. */
  hem?: readonly [string, string];
  /** A race number on the seat post. */
  plate?: boolean;
  /** Bars lower and further forward than the rider's own, for a flat back. */
  bars?: Bars;
};

/** The rider's own: Kadence's moss, on a dark bike. */
export const RIDER_KIT: Kit = {
  jersey: P.jersey,
  sleeve: P.jerseyLight,
  band: P.jerseyLight,
  shorts: P.shorts,
  skin: P.skin,
  helmet: P.helmet,
  sock: P.sock,
  shoe: P.shoe,
  glove: P.glove,
  lens: P.lens,
  frame: P.bikeFrame,
  fork: P.bikeFrame,
  accent: P.jersey,
  tape: P.barTape,
  helmetStyle: "vented",
};

/**
 * The challenger's (ADR 0049): a red jersey with a broad white band and white
 * bands round the sleeves, black shorts with red and white at the leg
 * ends, a smooth white aero helmet, white socks and shoes, on a black aero
 * bike with a yellow fork and head tube, a number on its post and the
 * bars slammed low and far forward on a long stem. Muted, like the rest
 * of the landscape.
 */
export const CHALLENGER_KIT: Kit = {
  jersey: "#b8352f",
  sleeve: "#b8352f",
  band: "#f3f0ea",
  bandWidth: 0.15,
  shorts: "#262422",
  skin: "#e3c2a6",
  helmet: "#f3f0ea",
  sock: "#f3f0ea",
  shoe: "#f1ece3",
  glove: "#262422",
  lens: "#b9c4ca",
  frame: "#1f2124",
  fork: "#d9b836",
  accent: "#f3f0ea",
  tape: "#2a2622",
  helmetStyle: "aero",
  sleeveStripe: "#f3f0ea",
  hem: ["#f3f0ea", "#b8352f"],
  plate: true,
  bars: { low: 0.21, reach: 0.22, tilt: 0.35 },
};

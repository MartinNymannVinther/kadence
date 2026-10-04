import { PALETTE as P } from "./palette";

/** A rider's colours, head to toe, and their bike's (`RiderFigure`, `RoadBike`). */
export type Kit = {
  jersey: string;
  sleeve: string;
  /** The band across the jersey's back. */
  band: string;
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
 * The challenger's (ADR 0049): a red jersey with a white band and white
 * bands round the sleeves, black shorts with red and white at the leg
 * ends, a smooth white aero helmet, white socks and shoes, on a black aero
 * bike with a yellow fork and head tube and a number on its post. Muted,
 * like the rest of the landscape.
 */
export const CHALLENGER_KIT: Kit = {
  jersey: "#b8352f",
  sleeve: "#b8352f",
  band: "#f3f0ea",
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
};

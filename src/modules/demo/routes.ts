/**
 * Eight loops through Østjylland for the demo's rides: each a closed
 * curve around a real place (the roads are invented, the map is real),
 * with a few hills at set points along the way. Long enough to be
 * different on the map, short enough to be ridden in an hour and a
 * half; a longer ride goes round again.
 */

export type Hill = { at: number; length: number; gain: number };
export type Route = {
  key: string;
  name: { da: string; en: string };
  centre: { lat: number; lon: number };
  /** The loop's size in degrees, north–south and east–west. */
  size: { lat: number; lon: number };
  /** Harmonics that bend the loop: [order, amplitude] pairs for latitude and longitude. */
  bend: { lat: [number, number]; lon: [number, number] };
  loopM: number;
  hills: Hill[];
};

export const ROUTES: Route[] = [
  {
    key: "vejle",
    name: { da: "Vejle Ådal rundt", en: "Vejle valley loop" },
    centre: { lat: 55.72, lon: 9.45 },
    size: { lat: 0.1, lon: 0.17 },
    bend: { lat: [5, 0.012], lon: [3, 0.02] },
    loopM: 72_000,
    hills: [
      { at: 8_000, length: 1_500, gain: 85 },
      { at: 23_000, length: 700, gain: 40 },
      { at: 37_000, length: 1_200, gain: 70 },
      { at: 52_000, length: 900, gain: 45 },
      { at: 63_000, length: 500, gain: 22 },
    ],
  },
  {
    key: "ejer",
    name: { da: "Ejer Bavnehøj", en: "Ejer Bavnehøj" },
    centre: { lat: 55.98, lon: 9.83 },
    size: { lat: 0.06, lon: 0.09 },
    bend: { lat: [3, 0.01], lon: [2, 0.015] },
    loopM: 38_000,
    hills: [
      { at: 6_000, length: 1_800, gain: 95 },
      { at: 21_000, length: 900, gain: 50 },
      { at: 30_000, length: 600, gain: 30 },
    ],
  },
  {
    key: "silkeborg",
    name: { da: "Silkeborgsøerne", en: "Silkeborg lakes" },
    centre: { lat: 56.15, lon: 9.6 },
    size: { lat: 0.07, lon: 0.13 },
    bend: { lat: [4, 0.015], lon: [3, 0.018] },
    loopM: 48_000,
    hills: [
      { at: 9_000, length: 1_100, gain: 60 },
      { at: 27_000, length: 1_400, gain: 75 },
      { at: 40_000, length: 700, gain: 35 },
    ],
  },
  {
    key: "mols",
    name: { da: "Mols Bjerge", en: "Mols Bjerge" },
    centre: { lat: 56.23, lon: 10.52 },
    size: { lat: 0.05, lon: 0.09 },
    bend: { lat: [5, 0.008], lon: [4, 0.012] },
    loopM: 34_000,
    hills: [
      { at: 4_000, length: 1_000, gain: 70 },
      { at: 12_000, length: 800, gain: 55 },
      { at: 22_000, length: 1_300, gain: 80 },
      { at: 29_000, length: 500, gain: 25 },
    ],
  },
  {
    key: "horsens",
    name: { da: "Horsens Fjord", en: "Horsens fjord" },
    centre: { lat: 55.88, lon: 9.95 },
    size: { lat: 0.05, lon: 0.14 },
    bend: { lat: [2, 0.012], lon: [3, 0.01] },
    loopM: 42_000,
    hills: [
      { at: 14_000, length: 900, gain: 40 },
      { at: 33_000, length: 600, gain: 28 },
    ],
  },
  {
    key: "fredericia",
    name: { da: "Fladt mod Fredericia", en: "Flat to Fredericia" },
    centre: { lat: 55.6, lon: 9.65 },
    size: { lat: 0.06, lon: 0.12 },
    bend: { lat: [3, 0.006], lon: [2, 0.01] },
    loopM: 40_000,
    hills: [{ at: 22_000, length: 500, gain: 20 }],
  },
  {
    key: "aarhus",
    name: { da: "Marselisborg-skovene", en: "Marselisborg woods" },
    centre: { lat: 56.1, lon: 10.2 },
    size: { lat: 0.05, lon: 0.06 },
    bend: { lat: [4, 0.01], lon: [5, 0.008] },
    loopM: 26_000,
    hills: [
      { at: 5_000, length: 700, gain: 45 },
      { at: 15_000, length: 900, gain: 50 },
      { at: 21_000, length: 400, gain: 20 },
    ],
  },
  {
    key: "skanderborg",
    name: { da: "Skanderborg Sø", en: "Skanderborg lake" },
    centre: { lat: 56.04, lon: 9.92 },
    size: { lat: 0.04, lon: 0.07 },
    bend: { lat: [3, 0.008], lon: [4, 0.006] },
    loopM: 24_000,
    hills: [
      { at: 7_000, length: 800, gain: 40 },
      { at: 17_000, length: 600, gain: 30 },
    ],
  },
];

export function altitudeOn(route: Route, m: number): number {
  const along = m % route.loopM;
  let alt = 25;
  for (const h of route.hills) {
    const down = h.length * 0.8;
    if (along >= h.at && along < h.at + h.length) alt += ((along - h.at) / h.length) * h.gain;
    else if (along >= h.at + h.length && along < h.at + h.length + down)
      alt += h.gain * (1 - (along - h.at - h.length) / down);
  }
  return alt;
}

export function positionOn(route: Route, m: number): { lat: number; lon: number } {
  const u = ((m % route.loopM) / route.loopM) * 2 * Math.PI;
  return {
    lat:
      route.centre.lat +
      route.size.lat * Math.sin(u) +
      route.bend.lat[1] * Math.sin(route.bend.lat[0] * u),
    lon:
      route.centre.lon +
      route.size.lon * Math.cos(u) +
      route.bend.lon[1] * Math.cos(route.bend.lon[0] * u),
  };
}

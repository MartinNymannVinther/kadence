import { largestRing } from "./gearing";

/**
 * The parts the gearing calculator suggests for the gear chosen (ADR
 * 0055). A smallest sprocket of 10 or 11 teeth is an ordinary cassette
 * and names no product. From 12 teeth the calculator names one concrete
 * cassette for 12-speed and one for 11-speed — Miche's first, another
 * maker's only where Miche sells none for that sprocket — and then the
 * chainrings that keep the sprocket within the class. No affiliate
 * links; a price is where it was seen in October 2026, with the shop.
 * Research and every source: docs/research/klasser-og-gearing.md,
 * sections 3.5 and 3.6.
 *
 * What fits which freehub or crank is a sentence in messages
 * (`calculators.gearing.products.items.<id>` and `.ringNotes.<id>`), because
 * it is said in words.
 *
 * Pure: imports nothing from the database.
 */

export type Price = { amount: number; currency: "DKK" | "EUR" | "GBP" | "USD"; seenAt: string };

export type Cassette = {
  id: "micheK12" | "dubied" | "micheLight";
  name: string;
  speeds: 11 | 12;
  /**
   * The version suggested for each smallest sprocket it is sold with,
   * picked from the maker's list (a stocked range where a shop showed one).
   */
  versions: readonly (readonly [number, number])[];
  price: Price | null;
  url: string;
};

/** The sprockets ordinary cassettes start on: SRAM's 12-speed and Campagnolo's 13-speed on 10, Shimano's and Campagnolo's 12-speed on 11. */
export const ORDINARY_COGS: readonly number[] = [10, 11];

/** In the order they are suggested: Miche first, as Martin asked (5 October 2026). */
export const CASSETTES: readonly Cassette[] = [
  {
    // Miche's sheet: 14-30, 14-32, 14-34, 16-30, 16-32; none on 12, 13 or 15.
    id: "micheK12",
    name: "Miche Primato K12 SH",
    speeds: 12,
    versions: [
      [14, 30],
      [16, 30],
    ],
    price: { amount: 999, currency: "DKK", seenAt: "allbike.dk" },
    url: "https://www.miche.it/en/products/cassettes-sprockets/road/prima-k-12-sh-hg",
  },
  {
    // edubied.com: 13-34, 14-28, 14-32, 14-34, 15-28, 15-32, 16-28.
    id: "dubied",
    name: "E.Dubied monoblock 12s",
    speeds: 12,
    versions: [
      [13, 34],
      [14, 28],
      [15, 28],
      [16, 28],
    ],
    price: { amount: 229, currency: "EUR", seenAt: "edubied.com" },
    url: "https://edubied.com/products/dubied_monoblock_cassette_shimano_12_spd",
  },
  {
    // Miche's sheet: 12-25…12-34, 13-25…13-34, 14-25…14-34, 15-25…15-32,
    // 16-27…16-34; bike-components.de stocked 13-30, 14-30 and 16-29.
    id: "micheLight",
    name: "Miche Light Primato 11 SH",
    speeds: 11,
    versions: [
      [12, 25],
      [13, 30],
      [14, 30],
      [15, 28],
      [16, 29],
    ],
    price: { amount: 63.99, currency: "EUR", seenAt: "bike-components.de" },
    url: "https://www.bike-components.de/en/Miche/Light-Primato-Shimano-11-Speed-Cassette-p56168/",
  },
];

export type CassettePick = { cassette: Cassette; version: readonly [number, number] };

/** The first cassette in the list for these speeds that starts on `cog`, or null. */
export function cassetteFor(cog: number, speeds: 11 | 12): CassettePick | null {
  for (const cassette of CASSETTES) {
    if (cassette.speeds !== speeds) continue;
    const version = cassette.versions.find(([smallest]) => smallest === cog);
    if (version) return { cassette, version };
  }
  return null;
}

export type ChainringFamily = {
  id: "shimano" | "grx" | "sram" | "stradaLab" | "sram1x";
  name: string;
  /** Two rings in front, or one. */
  kind: "double" | "single";
  /** Each set's rings, biggest first; one ring for a single. */
  sets: readonly (readonly number[])[];
  /** The cheapest size's price, where one was seen. */
  price: Price | null;
  url: string;
};

/**
 * Ordinary double sets, then single rings; each list biggest first.
 * Strada Lab's are the single rings Martin pointed to (5 October 2026),
 * and they fit Shimano's and Magene's cranks alike.
 */
export const CHAINRINGS: readonly ChainringFamily[] = [
  {
    // 54-40 Dura-Ace only (bike-components.de, FC-R9200 and FC-R8100 rings).
    id: "shimano",
    name: "Shimano Dura-Ace/Ultegra/105",
    kind: "double",
    sets: [
      [54, 40],
      [52, 36],
      [50, 34],
    ],
    price: null,
    url: "https://www.bike-components.de/en/Shimano/Ultegra-FC-R8100-12-speed-Chainring-p90394/",
  },
  {
    // FC-RX820-2 48-31 and FC-RX610-2 46-30 (incycle.com, excelsports.com).
    id: "grx",
    name: "Shimano GRX",
    kind: "double",
    sets: [
      [48, 31],
      [46, 30],
    ],
    price: null,
    url: "https://www.incycle.com/products/shimano-fc-rx820-2-grx-crankset-12spd-48-31t",
  },
  {
    // sram.com FC-RED-E1; SRAM support: Force 46/33–50/37 and Wide 43/30, Rival to 48/35.
    id: "sram",
    name: "SRAM Red/Force/Rival",
    kind: "double",
    sets: [
      [50, 37],
      [48, 35],
      [46, 33],
      [43, 30],
    ],
    price: null,
    url: "https://www.sram.com/en/sram/models/fc-red-e1",
  },
  {
    // Strada Lab 1× aluminium, 110 BCD 4-bolt, narrow-wide: 34, 38, 40 … 54 T
    // at 599 kr. (52 and 54 T 699 kr.) on cykler.dk; for Shimano R7000,
    // R8000, R9100, R7100, R8100 and R9200 cranks and Magene's P505 and
    // P515 spiders, not a Shimano 9270 power meter.
    id: "stradaLab",
    name: "Strada Lab",
    kind: "single",
    sets: [[54], [52], [50], [48], [46], [44], [42], [40], [38], [34]],
    price: { amount: 599, currency: "DKK", seenAt: "cykler.dk" },
    url: "https://cykler.dk/products/strada-lab-1x-single-aluminium-chainring",
  },
  {
    // X-Sync direct mount for Red, Force and Rival, 38–46 T (starbike.com, powermetercity.com).
    id: "sram1x",
    name: "SRAM X-Sync",
    kind: "single",
    sets: [[46], [44], [42], [40], [38]],
    price: null,
    url: "https://www.starbike.com/en/sram-red-force-xplr-x-sync-directmount-chainring/",
  },
];

export type RingsFit = { family: ChainringFamily; sets: readonly (readonly number[])[] };

/**
 * Each family's sets whose big ring keeps `cog` within the limit, with
 * the class and tyre chosen; every set with free gearing. A family with
 * none comes back with an empty list, so it can be named as too big.
 */
export function ringsFor(cog: number, limitM: number | null, circumferenceMm: number): RingsFit[] {
  const biggest = limitM === null ? Infinity : largestRing(cog, limitM, circumferenceMm);
  return CHAINRINGS.map((family) => ({
    family,
    sets: family.sets.filter(([big]) => big! <= biggest),
  }));
}

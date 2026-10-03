/**
 * Parts that can bring a bike within a young class's limit, as a neutral
 * list: no affiliate links, no ranking, the price where one was seen in
 * October 2026 and the shop it was seen at. Junior cassettes start on a
 * bigger sprocket; a chainring set is listed so its smallest legal
 * sprocket can be worked out. Research and every source:
 * docs/research/klasser-og-gearing.md, section 3.5.
 *
 * What fits which freehub or crank is a sentence in messages
 * (`calculators.gearing.products.<id>`), because it is said in words.
 *
 * Pure: imports nothing from the database.
 */

export type Price = { amount: number; currency: "DKK" | "EUR" | "GBP" | "USD"; seenAt: string };

export type CassetteProduct = {
  kind: "cassette";
  id: string;
  name: string;
  speeds: 10 | 11 | 12;
  /** Smallest and largest sprocket of each version sold as a junior cassette. */
  ranges: readonly (readonly [number, number])[];
  price: Price | null;
  url: string;
};

export type ChainringProduct = {
  kind: "chainring";
  id: string;
  name: string;
  speeds: 11 | 12;
  /** Big and small ring of each set. */
  sets: readonly (readonly [number, number])[];
  price: Price | null;
  url: string;
};

export type GearProduct = CassetteProduct | ChainringProduct;

/** When the prices below were read. Shown beside them. */
export const PRICES_SEEN = "2026-10";

export const GEAR_PRODUCTS: readonly GearProduct[] = [
  {
    kind: "cassette",
    id: "micheK12",
    name: "Miche Primato K12 SH",
    speeds: 12,
    ranges: [
      [14, 30],
      [16, 30],
    ],
    price: { amount: 999, currency: "DKK", seenAt: "allbike.dk" },
    url: "https://www.miche.it/en/products/cassettes-sprockets/road/prima-k-12-sh-hg",
  },
  {
    kind: "cassette",
    id: "reconJunior",
    name: "Recon Cr-Mo 12s junior",
    speeds: 12,
    ranges: [
      [14, 28],
      [15, 28],
      [16, 28],
    ],
    price: { amount: 209.99, currency: "GBP", seenAt: "kidsracing.co.uk" },
    url: "https://kidsracing.co.uk/products/recon-12-speed-youth-junior-cassette-shimano-hg-sram-xdr",
  },
  {
    kind: "cassette",
    id: "dubied",
    name: "E.Dubied monoblock 12s",
    speeds: 12,
    ranges: [
      [14, 28],
      [14, 32],
      [15, 28],
      [16, 28],
    ],
    price: { amount: 229, currency: "EUR", seenAt: "edubied.com" },
    url: "https://edubied.com/products/dubied_monoblock_cassette_shimano_12_spd",
  },
  {
    kind: "cassette",
    id: "micheLight",
    name: "Miche Primato Light",
    speeds: 11,
    ranges: [
      [14, 25],
      [16, 27],
    ],
    price: { amount: 71.99, currency: "GBP", seenAt: "kidsracing.co.uk" },
    url: "https://kidsracing.co.uk/collections/miche",
  },
  {
    kind: "cassette",
    id: "shimanoR8000",
    name: "Shimano Ultegra CS-R8000",
    speeds: 11,
    ranges: [[14, 28]],
    price: null,
    url: "https://aroundthecycle.com/products/new-shimano-ultegra-cs-r8000-11-speed-cassette-14-28t",
  },
  {
    kind: "cassette",
    id: "michePrimato",
    name: "Miche Primato",
    speeds: 10,
    ranges: [
      [14, 25],
      [16, 27],
    ],
    price: { amount: 49.99, currency: "GBP", seenAt: "kidsracing.co.uk" },
    url: "https://kidsracing.co.uk/collections/miche",
  },
  {
    kind: "chainring",
    id: "mageneQed",
    name: "Magene QED",
    speeds: 12,
    sets: [
      [50, 34],
      [52, 36],
      [53, 39],
    ],
    price: { amount: 75, currency: "USD", seenAt: "magene.com" },
    url: "https://www.magene.com/en/accessories/74-qed-lightweight-split-chainring.html",
  },
];

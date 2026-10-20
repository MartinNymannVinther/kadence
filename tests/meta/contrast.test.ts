import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

/**
 * WCAG contrast, read from the tokens themselves rather than trusted by
 * eye: the design review on 5 October found `--input` at 1.45:1 against
 * `--card`, short of 1.4.11's 3:1 for a non-text boundary. A tiny
 * oklch -> sRGB conversion (the matrices from the CSS Color 4 spec) turns
 * each token into the pair WCAG's own formula wants, so a future edit to
 * `theme.css` that quietly drops the contrast again fails here instead of
 * in front of a rider.
 *
 * Alpha matters only for the dark `--input`, which is white over the card
 * rather than a solid colour: a browser blends a translucent colour on
 * its own gamma-encoded channel values (the bytes a screen shows), not on
 * linear light, so the blend below works in that same gamma space before
 * WCAG's formula linearises it again.
 */

const read = () => readFile(new URL("../../src/app/theme.css", import.meta.url), "utf8");

type Rgb = readonly [number, number, number];

/** oklch(L C H) to linear-light sRGB (CSS Color 4, the OKLab matrices). */
function oklchToLinearSrgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Linear light to the gamma-encoded channel a screen actually shows. */
function toGamma(v: number): number {
  const c = clamp01(v);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** WCAG's own de-gamma step: the inverse of `toGamma`, by its spec, not derived from it. */
function fromGamma(v: number): number {
  const c = clamp01(v);
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

type Token = { l: number; c: number; h: number; alpha: number };

function parseOklch(raw: string): Token {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%)?)?\)/.exec(raw);
  if (!m) throw new Error(`not an oklch() colour: ${raw}`);
  const [, l, c, h, alphaRaw, pct] = m;
  const alpha = alphaRaw === undefined ? 1 : pct ? Number(alphaRaw) / 100 : Number(alphaRaw);
  return { l: Number(l), c: Number(c), h: Number(h), alpha };
}

/** One token's colour, blended onto `onto` when it carries alpha (the dark `--input`). */
function resolve(token: Token, onto: Rgb): Rgb {
  const linear = oklchToLinearSrgb(token.l, token.c, token.h);
  if (token.alpha >= 1) return linear;
  const [lr, lg, lb] = linear;
  const [or_, og, ob] = onto;
  const mixed: Rgb = [
    toGamma(or_) * (1 - token.alpha) + toGamma(lr) * token.alpha,
    toGamma(og) * (1 - token.alpha) + toGamma(lg) * token.alpha,
    toGamma(ob) * (1 - token.alpha) + toGamma(lb) * token.alpha,
  ];
  return [fromGamma(mixed[0]), fromGamma(mixed[1]), fromGamma(mixed[2])];
}

function extractBlock(css: string, selector: string): string {
  const m = new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(css);
  if (!m) throw new Error(`no ${selector} block in theme.css`);
  return m[1]!;
}

function readToken(block: string, name: string): Token {
  const m = new RegExp(`${name}:\\s*([^;]+);`).exec(block);
  if (!m) throw new Error(`no ${name} in block`);
  return parseOklch(m[1]!.trim());
}

/** `name`, resolved to its linear-light sRGB for this palette's block. */
function colourOf(block: string, name: string, onto: Rgb = [0, 0, 0]): Rgb {
  return resolve(readToken(block, name), onto);
}

const PALETTES = [
  ["light", ":root"],
  ["dark", "\\.dark"],
] as const;

describe("token contrast (WCAG 1.4.3, 1.4.11)", () => {
  it.each(PALETTES)(
    "%s: --input reaches 3:1 against --card (non-text, 1.4.11)",
    async (_label, selector) => {
      const block = extractBlock(await read(), selector);
      const card = colourOf(block, "--card");
      const input = colourOf(block, "--input", card);
      expect(contrast(input, card)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(PALETTES)(
    "%s: --foreground reaches 4.5:1 against --background (text, 1.4.3)",
    async (_label, selector) => {
      const block = extractBlock(await read(), selector);
      const background = colourOf(block, "--background");
      const foreground = colourOf(block, "--foreground", background);
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(PALETTES)(
    "%s: --primary-foreground reaches 4.5:1 against --primary (text, 1.4.3)",
    async (_label, selector) => {
      const block = extractBlock(await read(), selector);
      const primary = colourOf(block, "--primary");
      const primaryForeground = colourOf(block, "--primary-foreground", primary);
      expect(contrast(primaryForeground, primary)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(PALETTES)(
    "%s: --warning reaches 4.5:1 against --card (text, 1.4.3)",
    async (_label, selector) => {
      const block = extractBlock(await read(), selector);
      const card = colourOf(block, "--card");
      const warning = colourOf(block, "--warning", card);
      expect(contrast(warning, card)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

const RAILS = [
  ["light moss", "\\.sidebar-moss"],
  ["dark moss", "\\.dark \\.sidebar-moss"],
] as const;

/** The rail in moss (docs/adr/0077) re-points the tokens it reads; every pair it shows is text on a ground. */
describe("the moss rail's contrast (WCAG 1.4.3)", () => {
  const PAIRS = [
    ["--sidebar-foreground", "--sidebar"],
    ["--meta", "--sidebar"],
    ["--label", "--sidebar"],
    ["--sidebar-accent-foreground", "--sidebar-accent"],
    ["--sidebar-foreground", "--sidebar-hover"],
    ["--accent-foreground", "--accent"],
    ["--secondary-foreground", "--sidebar-hover"],
    ["--muted-foreground", "--muted"],
    ["--primary-foreground", "--primary"],
    ["--meta", "--card"],
  ] as const;

  it.each(RAILS)("%s: every text token reaches 4.5:1 on its ground", async (_label, selector) => {
    const block = extractBlock(await read(), selector);
    for (const [text, ground] of PAIRS) {
      const onto = colourOf(block, ground);
      expect(
        contrast(colourOf(block, text, onto), onto),
        `${text} on ${ground}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

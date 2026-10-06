import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUILTIN_EXERCISES } from "@/modules/exercises/builtin";
import {
  arrowControl,
  FIGURE,
  figureGeometry,
  geometryBounds,
  type FigurePrimitive,
} from "@/modules/exercises/figure";
import {
  FIGURE_CSS_VARS,
  FIGURE_PALETTE,
  FIGURE_TOKENS,
  type FigureColours,
} from "@/modules/exercises/figure-colours";
import { figureSvg } from "@/modules/exercises/figure-svg";
import { poseSchema, type Pose } from "@/modules/exercises/types";

/**
 * One drawing for every exercise: the geometry keeps the fixed style and
 * the order of painting, and the SVG string for the download carries
 * nothing but numbers, fixed words and the colours it was handed.
 */

const pose = (raw: unknown): Pose => poseSchema.parse(raw);
const hipFlexor = pose(BUILTIN_EXERCISES.find((e) => e.id === "hipFlexor")!.pose);

describe("the figure's geometry", () => {
  it("paints ground, props, far limbs, torso, near limbs, head, arrows — in that order", () => {
    const tones = figureGeometry(hipFlexor).map((p) => `${p.shape}:${p.tone}`);
    expect(tones[0]).toBe("polyline:ground");
    const head = tones.indexOf("circle:ink");
    expect(head).toBeGreaterThan(0);
    expect(tones.slice(head + 1).every((t) => t.endsWith(":accent"))).toBe(true);
  });

  it("draws the far limbs fainter and leaves hidden ones out", () => {
    const limbs = figureGeometry(hipFlexor).filter(
      (p): p is Extract<FigurePrimitive, { shape: "polyline" }> =>
        p.shape === "polyline" && p.tone === "ink" && p.points.length === 3,
    );
    // Torso, both legs and the near arm; the far arm is hidden.
    expect(limbs).toHaveLength(4);
    expect(limbs.filter((l) => l.opacity === FIGURE.farOpacity)).toHaveLength(1);
    expect(limbs.every((l) => l.width === FIGURE.stroke)).toBe(true);
  });

  it("points an arrow's head back along its shaft", () => {
    const right = pose({
      ...hipFlexor,
      arrows: [{ from: [100, 60], to: [140, 60], bend: 0 }],
    });
    const head = figureGeometry(right).at(-1);
    expect(head?.shape).toBe("polyline");
    if (head?.shape !== "polyline") return;
    const [a, tip, b] = head.points;
    expect(tip).toEqual([140, 60]);
    expect(a![0]).toBeLessThan(140);
    expect(b![0]).toBeLessThan(140);
    expect(a![1] + b![1]).toBeCloseTo(120);
  });

  it("bends an arrow to its left, seen along it, for a positive bend", () => {
    // Travelling right in a box whose y runs down, left is up.
    const [, cy] = arrowControl({ from: [100, 60], to: [140, 60], bend: 0.5 });
    expect(cy).toBeLessThan(60);
  });

  it("measures where the paint reaches", () => {
    const b = geometryBounds(figureGeometry(hipFlexor));
    expect(b.minY).toBeCloseTo(26 - FIGURE.headRadius);
    expect(b.maxY).toBeCloseTo(122 + FIGURE.groundStroke / 2);
  });
});

describe("the figure as an SVG string", () => {
  const allowed = new Set([
    "xmlns",
    "viewBox",
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "opacity",
    "points",
    "d",
    "cx",
    "cy",
    "r",
    "x",
    "y",
    "width",
    "height",
    "rx",
    "aria-hidden",
    "focusable",
  ]);
  const fixed = new Set([
    "http://www.w3.org/2000/svg",
    "none",
    "round",
    "true",
    "false",
    "0 0 240 140",
  ]);
  const number = /^-?\d+(\.\d+)?$/;
  const numbers = /^[-\d., MQ]+$/;

  for (const colours of [FIGURE_PALETTE.light, FIGURE_PALETTE.dark, FIGURE_CSS_VARS]) {
    it(`holds only numbers, fixed words and the colours (${colours.ink})`, () => {
      const given = new Set(Object.values(colours));
      for (const e of BUILTIN_EXERCISES) {
        const svg = figureSvg(pose(e.pose), colours);
        expect(svg, e.id).not.toMatch(/NaN|undefined|Infinity|null|<script|href|style/);
        const tags = [...svg.matchAll(/<\/?([a-z]+)/g)].map((m) => m[1]);
        expect(new Set(tags), e.id).toEqual(
          new Set(
            tags.filter((tag) => ["svg", "polyline", "path", "circle", "rect"].includes(tag!)),
          ),
        );
        for (const [, name, value] of svg.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
          expect(allowed.has(name!), `${e.id}: ${name}`).toBe(true);
          const ok =
            fixed.has(value!) ||
            given.has(value!) ||
            number.test(value!) ||
            ((name === "points" || name === "d") && numbers.test(value!));
          expect(ok, `${e.id}: ${name}="${value}"`).toBe(true);
        }
      }
    });
  }

  it("refuses a colour that is anything but a plain colour value", () => {
    const bad: FigureColours = {
      ...FIGURE_PALETTE.light,
      ink: '#000" onload="alert(1)',
    };
    expect(() => figureSvg(hipFlexor, bad)).toThrow();
    expect(() => figureSvg(hipFlexor, { ...FIGURE_PALETTE.light, accent: "red" })).toThrow();
  });

  it("refuses a pose with a number that is not finite", () => {
    const broken = structuredClone(hipFlexor);
    broken.joints.head = [Number.NaN, 20];
    expect(() => figureSvg(broken, FIGURE_PALETTE.light)).toThrow();
  });
});

describe("the figure's colours", () => {
  const theme = readFileSync("src/app/theme.css", "utf8");
  const block = (selector: string) => {
    const start = theme.indexOf(`${selector} {`);
    return theme.slice(start, theme.indexOf("}", start));
  };
  const value = (css: string, token: string) =>
    new RegExp(`\\s${token}:\\s*([^;]+);`).exec(css)?.[1]?.trim();

  it("are Kadence's tokens, in light and dark mode alike", () => {
    for (const [mode, selector] of [
      ["light", ":root"],
      ["dark", ".dark"],
    ] as const) {
      const css = block(selector);
      for (const [tone, token] of Object.entries(FIGURE_TOKENS))
        expect(FIGURE_PALETTE[mode][tone as keyof typeof FIGURE_TOKENS], `${mode} ${tone}`).toBe(
          value(css, token),
        );
    }
  });

  it("name the same tokens for the page", () => {
    for (const [tone, css] of Object.entries(FIGURE_CSS_VARS))
      expect(css).toBe(`var(${FIGURE_TOKENS[tone as keyof typeof FIGURE_CSS_VARS]})`);
  });
});

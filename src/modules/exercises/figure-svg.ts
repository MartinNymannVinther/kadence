import { figureGeometry, type FigurePrimitive, type XY } from "./figure";
import type { FigureColours } from "./figure-colours";
import { BOX, type Pose } from "./types";

/**
 * The figure as a self-contained SVG string, for the downloaded programme
 * (docs/plan-ovelser-og-programmer.md): no external references, no script,
 * no styles, and nothing in it but numbers from the geometry and the
 * colours it is handed. Free text never reaches it — the exercise's name
 * belongs beside the drawing, where the caller escapes it — so the SVG is
 * `aria-hidden` and the caller labels the figure.
 *
 * It has a viewBox and no size of its own; the page sizes it (`width: 100%`).
 */

/** A hex colour, an oklch() of plain numbers, or a custom property. Nothing else. */
const COLOUR =
  /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|oklch\(\s*[0-9.]+%?\s+[0-9.]+\s+[0-9.]+(\s*\/\s*[0-9.]+%?)?\s*\)|var\(--[a-z][a-z0-9-]*\))$/i;

function num(n: number): string {
  if (!Number.isFinite(n)) throw new Error("figure: a number that is not finite");
  const rounded = Math.round(n * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

const xy = ([x, y]: XY) => `${num(x)},${num(y)}`;

function paint(p: FigurePrimitive, colour: string): string {
  const opacity = p.opacity < 1 ? ` opacity="${num(p.opacity)}"` : "";
  const stroke = ` stroke="${colour}" stroke-width="${num(p.width)}"`;
  switch (p.shape) {
    case "polyline":
      return `<polyline points="${p.points.map(xy).join(" ")}"${stroke}${opacity}/>`;
    case "curve": {
      const [fx, fy] = p.from;
      const [cx, cy] = p.control;
      const [tx, ty] = p.to;
      return `<path d="M${num(fx)} ${num(fy)}Q${num(cx)} ${num(cy)} ${num(tx)} ${num(ty)}"${stroke}${opacity}/>`;
    }
    case "circle": {
      const at = `cx="${num(p.center[0])}" cy="${num(p.center[1])}" r="${num(p.r)}"`;
      return p.fill
        ? `<circle ${at} fill="${colour}"${opacity}/>`
        : `<circle ${at}${stroke}${opacity}/>`;
    }
    case "rect": {
      const at = `x="${num(p.x)}" y="${num(p.y)}" width="${num(p.w)}" height="${num(p.h)}" rx="${num(p.radius)}"`;
      return p.fill
        ? `<rect ${at} fill="${colour}"${opacity}/>`
        : `<rect ${at}${stroke}${opacity}/>`;
    }
  }
}

export function figureSvg(pose: Pose, colours: FigureColours): string {
  for (const value of Object.values(colours))
    if (!COLOUR.test(value)) throw new Error("figure: a colour that is not a plain colour value");
  const body = figureGeometry(pose)
    .map((p) => paint(p, colours[p.tone]))
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX.width} ${BOX.height}"` +
    ` fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
    body +
    `</svg>`
  );
}

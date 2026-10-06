import { FIGURE, line, type FigurePrimitive } from "./figure-style";
import { BOX, type Prop } from "./types";

/**
 * What the figure stands on and uses, as primitives: the ground (floor,
 * wall, mat), drawn first, and the props (bench, step, band, ball,
 * kettlebell), drawn behind the figure so its hands hold them.
 */

function floorOf(props: readonly Prop[]): number | null {
  for (const p of props) if (p.kind === "floor") return p.y;
  return null;
}

export function groundPrimitives(props: readonly Prop[]): FigurePrimitive[] {
  const floor = floorOf(props);
  const out: FigurePrimitive[] = [];
  for (const p of props) {
    if (p.kind === "floor") {
      const ends = [FIGURE.margin, BOX.width - FIGURE.margin] as const;
      out.push(
        line(
          "ground",
          [
            [ends[0], p.y],
            [ends[1], p.y],
          ],
          FIGURE.groundStroke,
        ),
      );
    } else if (p.kind === "wall") {
      const bottom = floor ?? BOX.height - FIGURE.margin;
      out.push(
        line(
          "ground",
          [
            [p.x, FIGURE.margin],
            [p.x, bottom],
          ],
          FIGURE.groundStroke,
        ),
      );
    } else if (p.kind === "mat") {
      out.push(line("prop", [p.from, p.to], FIGURE.matStroke, 0.5));
    }
  }
  return out;
}

export function propPrimitives(props: readonly Prop[]): FigurePrimitive[] {
  const floor = floorOf(props);
  const paint = { tone: "prop", opacity: 1 } as const;
  const out: FigurePrimitive[] = [];
  for (const p of props) {
    switch (p.kind) {
      case "bench": {
        // `at` is the seat's top left; the legs reach `height` down from it.
        const [x, y] = p.at;
        const seat = FIGURE.benchSeat;
        const inset = Math.min(6, p.width / 4);
        out.push({
          ...paint,
          shape: "rect",
          x,
          y,
          w: p.width,
          h: seat,
          radius: 2,
          fill: true,
          width: 0,
        });
        for (const lx of [x + inset, x + p.width - inset])
          out.push(
            line(
              "prop",
              [
                [lx, y + seat],
                [lx, y + p.height],
              ],
              FIGURE.propStroke,
            ),
          );
        break;
      }
      case "step": {
        // `at` is the top left; the step reaches down to the floor.
        const [x, y] = p.at;
        const half = FIGURE.propStroke / 2;
        const height = floor !== null && floor > y ? floor - y : FIGURE.stepHeight;
        out.push({
          ...paint,
          shape: "rect",
          x: x + half,
          y: y + half,
          w: Math.max(1, p.width - FIGURE.propStroke),
          h: Math.max(1, height - FIGURE.propStroke),
          radius: 2,
          fill: false,
          width: FIGURE.propStroke,
        });
        break;
      }
      case "band":
        out.push(line("prop", [p.from, p.to], FIGURE.bandStroke));
        break;
      case "ball":
        out.push({
          ...paint,
          shape: "circle",
          center: p.at,
          r: p.radius,
          fill: false,
          width: FIGURE.propStroke,
        });
        break;
      case "kettlebell": {
        // `at` is the handle, where a hand holds it; the bell hangs below.
        const [x, y] = p.at;
        const k = FIGURE.kettlebell;
        out.push(
          {
            ...paint,
            shape: "circle",
            center: [x, y],
            r: k.handle,
            fill: false,
            width: FIGURE.propStroke,
          },
          { ...paint, shape: "circle", center: [x, y + k.drop], r: k.bell, fill: true, width: 0 },
        );
        break;
      }
      default:
        break;
    }
  }
  return out;
}

import * as THREE from "three";
import type { Kit } from "./kits";

/** The canvas, around the torso and up it. */
const WIDE = 1024;
const HIGH = 512;
/** Up the torso, as shares of it: where the lower colour reaches to, and the crown's band. */
const LOWER = 0.3;
const BAND = { foot: 0.315, top: 0.42 };
/**
 * The crown's five points, as shares of the way round from its middle and
 * up: tall, short, tallest, short, tall; the dips between them; and its
 * half-width at the band.
 */
const POINTS: readonly [number, number][] = [
  [-0.12, 0.66],
  [-0.06, 0.6],
  [0, 0.76],
  [0.06, 0.6],
  [0.12, 0.66],
];
const DIP = 0.5;
const HALF = 0.135;
/** The balls on the points, and the stones along the band, pixels across. */
const BALL = 7;
const STONE = 5;
/** Round the torso, from the middle of its back: its back, and its chest. */
const BACK = 0;
const CHEST = 0.5;

type Pen = {
  context: CanvasRenderingContext2D;
  at: (round: number, up: number) => [number, number];
};

/**
 * A two-tone jersey (`Kit.lower`) drawn round the torso: the jersey's
 * colour above, the lower one below, and where the kit has one
 * (`Kit.crown`) a crown on the chest and on the back in the lower colour —
 * the sprinter's (ADR 0050). The torso is a cylinder: round it is across
 * the canvas, from the middle of the back; up it is up the canvas, from
 * the hips.
 */
export function jerseyTexture(kit: Kit): THREE.CanvasTexture {
  const element = document.createElement("canvas");
  element.width = WIDE;
  element.height = HIGH;
  const context = element.getContext("2d")!;
  const at = (round: number, up: number): [number, number] => [round * WIDE, (1 - up) * HIGH];
  context.fillStyle = kit.jersey;
  context.fillRect(0, 0, WIDE, HIGH);
  context.fillStyle = kit.lower ?? kit.jersey;
  context.fillRect(0, (1 - LOWER) * HIGH, WIDE, LOWER * HIGH);
  // The back's crown is drawn at both edges of the canvas, where the way round closes.
  if (kit.crown)
    for (const middle of [BACK, CHEST, BACK + 1])
      crown({ context, at }, middle, kit.lower ?? kit.jersey, kit.jersey);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * A crown about `middle`, in `ink` on the jersey's `ground`: its band,
 * apart from the colour below by a thin line of the ground and set with
 * stones of it; five points rising from the band, a ball on each; and a
 * small cross over the middle one.
 */
function crown({ context, at }: Pen, middle: number, ink: string, ground: string): void {
  context.fillStyle = ink;
  context.beginPath();
  context.moveTo(...at(middle - HALF, BAND.foot));
  context.lineTo(...at(middle - HALF, BAND.top));
  POINTS.forEach(([round, up], i) => {
    context.lineTo(...at(middle + round, up));
    const next = POINTS[i + 1];
    if (next) context.lineTo(...at(middle + (round + next[0]) / 2, DIP));
  });
  context.lineTo(...at(middle + HALF, BAND.top));
  context.lineTo(...at(middle + HALF, BAND.foot));
  context.closePath();
  context.fill();
  for (const [round, up] of POINTS) disc(context, at(middle + round, up), BALL, ink);
  // The cross over the middle point.
  const [x, y] = at(middle, POINTS[2]![1]);
  context.fillRect(x - 2, y - BALL - 18, 4, 16);
  context.fillRect(x - 7, y - BALL - 13, 14, 4);
  // Stones along the band; under it, the ground shows between it and the colour below.
  const stones = (BAND.foot + BAND.top) / 2;
  for (let i = -4; i <= 4; i++) disc(context, at(middle + i * 0.028, stones), STONE, ground);
}

function disc(
  context: CanvasRenderingContext2D,
  [x, y]: [number, number],
  size: number,
  color: string,
) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, size, 0, Math.PI * 2);
  context.fill();
}

import * as THREE from "three";
import type { Kit } from "./kits";

/** The canvas, around the torso and up it; and where the lower colour reaches to, as a share of its height. */
const WIDE = 512;
const HIGH = 256;
const LOWER = 0.35;
/**
 * A crown, as shares of the way round and up: its foot, and the points
 * and dips across it from one side to the other — three points, the
 * middle one tallest.
 */
const CROWN: readonly [number, number][] = [
  [-0.14, LOWER],
  [-0.11, 0.7],
  [-0.055, 0.52],
  [0, 0.8],
  [0.055, 0.52],
  [0.11, 0.7],
  [0.14, LOWER],
];
/** Round the torso, from the middle of its back: its back, and its chest. */
const BACK = 0;
const CHEST = 0.5;

/**
 * A two-tone jersey (`Kit.lower`) drawn round the torso: the jersey's
 * colour above, the lower one below, rising in a crown on the chest and
 * on the back where the kit has one (`Kit.crown`) — the sprinter's (ADR
 * 0050). The torso is a cylinder: round it is across the canvas, from
 * the middle of the back; up it is up the canvas, from the hips.
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
  if (kit.crown)
    // The back's crown is drawn at both edges of the canvas, where the way round closes.
    for (const middle of [BACK, CHEST, BACK + 1]) {
      context.beginPath();
      for (const [round, up] of CROWN) context.lineTo(...at(middle + round, up));
      context.closePath();
      context.fill();
    }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

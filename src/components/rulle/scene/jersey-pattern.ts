import * as THREE from "three";
import type { Kit } from "./kits";

/** The canvas, around the torso and up it. */
const WIDE = 1024;
const HIGH = 512;
/** Round the torso, from the middle of its back: its back, its right side, its chest. */
const BACK = 0;
const CHEST = 0.5;
/** Up the torso, from the hips: where its quarters meet, and where the crown sits. */
const MIDDLE = 0.5;
/**
 * The crown, as shares of the way round from its middle and up: its foot
 * and its three rounded points, the middle one tallest.
 */
const CROWN: readonly [number, number][] = [
  [-0.085, 0.4],
  [-0.09, 0.6],
  [-0.045, 0.52],
  [0, 0.66],
  [0.045, 0.52],
  [0.09, 0.6],
  [0.085, 0.4],
];
/** How round its corners are and how soft its edge, pixels. */
const ROUND = 14;
const SOFT = 2.5;

/**
 * A patterned jersey drawn round the torso: quartered (`Kit.quarters`) —
 * split down the middle of the chest and the back and across halfway up,
 * the body's upper left and lower right in the other colour — and a
 * soft-edged crown (`Kit.crown`) in the middle of the chest and of the
 * back: the sprinter's (ADR 0050). The torso is a cylinder: round it is
 * across the canvas, from the middle of the back by its right side; up it
 * is up the canvas, from the hips.
 */
export function jerseyTexture(kit: Kit): THREE.CanvasTexture {
  const element = document.createElement("canvas");
  element.width = WIDE;
  element.height = HIGH;
  const context = element.getContext("2d")!;
  const at = (round: number, up: number): [number, number] => [round * WIDE, (1 - up) * HIGH];
  context.fillStyle = kit.jersey;
  context.fillRect(0, 0, WIDE, HIGH);
  if (kit.quarters) {
    context.fillStyle = kit.quarters;
    // The body's lower right, back round to chest; its upper left, chest round to back.
    context.fillRect(...at(BACK, MIDDLE), (CHEST - BACK) * WIDE, MIDDLE * HIGH);
    context.fillRect(...at(CHEST, 1), (1 - CHEST) * WIDE, (1 - MIDDLE) * HIGH);
  }
  if (kit.crown) {
    context.fillStyle = kit.crown;
    context.strokeStyle = kit.crown;
    context.lineWidth = ROUND;
    context.lineJoin = "round";
    context.filter = `blur(${SOFT}px)`;
    // The back's crown is drawn at both edges of the canvas, where the way round closes.
    for (const middle of [BACK, CHEST, BACK + 1]) {
      context.beginPath();
      for (const [round, up] of CROWN) context.lineTo(...at(middle + round, up));
      context.closePath();
      context.fill();
      context.stroke();
    }
    context.filter = "none";
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

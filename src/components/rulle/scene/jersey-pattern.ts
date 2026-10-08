import * as THREE from "three";
import { crownBadge } from "./jersey-crown";
import type { Kit } from "./kits";

/** The canvas, around the torso and up it. */
const WIDE = 1024;
const HIGH = 512;
/** Round the torso, from the middle of its back: its back, its right side, its chest. */
const BACK = 0;
const CHEST = 0.5;
/** Up the torso, from the hips: where its quarters meet, and where the crown sits. */
const MIDDLE = 0.5;
/** The crown's width, as a share of the way round the torso. */
const CROWN_WIDE = 0.25;
/** The canvas is stretched more round the torso than up it: the crown is drawn flatter to stand true. */
const FLAT = 0.87;
/** How soft its edges are, pixels. */
const SOFT = 0.7;

/**
 * A patterned jersey drawn round the torso: quartered (`Kit.quarters`) —
 * split down the middle of the chest and the back and across halfway up,
 * the body's upper left and lower right in the other colour — and a
 * crown (`Kit.crown`, `jersey-crown.ts`) in the middle of the chest and
 * of the back: the sprinter's (ADR 0075). The torso is a cylinder: round it is
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
    const badge = crownBadge(kit.crown);
    const wide = CROWN_WIDE * WIDE;
    const high = wide * FLAT;
    context.filter = `blur(${SOFT}px)`;
    // The back's crown is drawn at both edges of the canvas, where the way round closes.
    for (const middle of [BACK, CHEST, BACK + 1]) {
      const [x, y] = at(middle, MIDDLE);
      context.drawImage(badge, x - wide / 2, y - high / 2, wide, high);
    }
    context.filter = "none";
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

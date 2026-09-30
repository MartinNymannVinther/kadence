import * as THREE from "three";
import { hash } from "./noise";

/**
 * Words in the landscape (ADR 0034), drawn on a canvas and used as a
 * texture: the rider's name in chalk on the climb, a café's sign, the z's
 * of a nap. The words come from the page, in the reader's language; the
 * canvas only draws them.
 */

const FONT = "Archivo, system-ui, sans-serif";

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return { element, context: element.getContext("2d")! };
}

/** Text as chalk: white, bold, a little worn, on nothing. `across` by `along` in the canvas's proportion. */
export function chalkTexture(text: string): THREE.CanvasTexture {
  const { element, context } = canvas(1024, 256);
  let size = 170;
  context.font = `900 ${size}px ${FONT}`;
  while (context.measureText(text).width > 940 && size > 60) {
    size -= 6;
    context.font = `900 ${size}px ${FONT}`;
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(250, 248, 242, 0.92)";
  context.strokeStyle = "rgba(250, 248, 242, 0.92)";
  context.lineWidth = 12;
  context.lineJoin = "round";
  context.strokeText(text, 512, 132);
  context.fillText(text, 512, 132);
  // Worn: specks taken out of the strokes, the same specks every time.
  context.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 1400; i++) {
    const x = hash(i, 1, 301) * 1024;
    const y = hash(i, 2, 301) * 256;
    context.fillStyle = `rgba(0,0,0,${0.3 + hash(i, 3, 301) * 0.6})`;
    context.fillRect(x, y, 2 + hash(i, 4, 301) * 5, 2 + hash(i, 5, 301) * 3);
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Chalk on the road: a plate lying on it, `across` metres wide, stretched
 * `along` metres down the road as road markings are, so it reads from a
 * saddle coming up to it.
 */
export function chalkPlate(text: string, across: number, along: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: chalkTexture(text),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(across, along), material);
  // Flat on the road, the top of the letters toward where the rider is going (-z).
  plate.rotation.x = -Math.PI / 2;
  return plate;
}

/** A sign's face: dark letters on a cream board. */
export function signTexture(text: string): THREE.CanvasTexture {
  const { element, context } = canvas(512, 128);
  context.fillStyle = "#f3eee4";
  context.fillRect(0, 0, 512, 128);
  context.strokeStyle = "#4a6b53";
  context.lineWidth = 10;
  context.strokeRect(5, 5, 502, 118);
  let size = 72;
  context.font = `700 ${size}px ${FONT}`;
  while (context.measureText(text).width > 460 && size > 24) {
    size -= 4;
    context.font = `700 ${size}px ${FONT}`;
  }
  context.fillStyle = "#2e2c29";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 68);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A café's chalkboard on the pavement: the word in chalk on slate, and a cup drawn under it. */
export function boardTexture(text: string): THREE.CanvasTexture {
  const { element, context } = canvas(256, 320);
  context.fillStyle = "#2f3a33";
  context.fillRect(0, 0, 256, 320);
  context.strokeStyle = "#8a6a4a";
  context.lineWidth = 14;
  context.strokeRect(7, 7, 242, 306);
  let size = 88;
  context.font = `800 ${size}px ${FONT}`;
  while (context.measureText(text).width > 212 && size > 28) {
    size -= 4;
    context.font = `800 ${size}px ${FONT}`;
  }
  context.fillStyle = "rgba(246, 243, 236, 0.92)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 128, 118);
  // A cup and its steam, in chalk.
  context.strokeStyle = "rgba(246, 243, 236, 0.85)";
  context.lineWidth = 6;
  context.strokeRect(96, 200, 56, 46);
  context.beginPath();
  context.arc(158, 222, 13, -Math.PI / 2, Math.PI / 2);
  context.stroke();
  for (const x of [110, 124, 138]) {
    context.beginPath();
    context.moveTo(x, 190);
    context.quadraticCurveTo(x - 8, 178, x, 166);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A finish arch's banner: the word large, dark on cream, a moss band either end. */
export function bannerTexture(text: string): THREE.CanvasTexture {
  const { element, context } = canvas(1024, 128);
  context.fillStyle = "#f3eee4";
  context.fillRect(0, 0, 1024, 128);
  context.fillStyle = "#4a6b53";
  context.fillRect(0, 0, 90, 128);
  context.fillRect(934, 0, 90, 128);
  context.font = `900 96px ${FONT}`;
  context.fillStyle = "#2e2c29";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 512, 70);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The finish line across the road: two rows of black and white squares. */
export function checkerTexture(): THREE.CanvasTexture {
  const { element, context } = canvas(512, 64);
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 2; j++) {
      context.fillStyle = (i + j) % 2 === 0 ? "#f6f3ec" : "#2a2927";
      context.fillRect(i * 32, j * 32, 32, 32);
    }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A "z", for a nap: a sprite that rises and fades. */
export function zSprite(): THREE.Sprite {
  const { element, context } = canvas(64, 64);
  context.font = `800 52px ${FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#4a6b53";
  context.fillText("z", 32, 34);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(0.22, 0.22, 1);
  return sprite;
}

/** Frees what a plate, sign or sprite holds on the GPU. */
export function disposeTextured(object: THREE.Mesh | THREE.Sprite): void {
  const material = object.material as THREE.MeshBasicMaterial;
  material.map?.dispose();
  material.dispose();
  if (object instanceof THREE.Mesh) object.geometry.dispose();
}

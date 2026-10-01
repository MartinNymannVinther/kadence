import * as THREE from "three";
import { hash } from "@/modules/rulle";
import { treeMaterial } from "./trees";

/**
 * People who do not all look alike (ADR 0045): skin from fair to dark,
 * hair blond, brown, black, red, grey or white — the darker skins with
 * the darker hair — and trousers of every everyday kind. A figure made
 * on its own gets its looks from its number (`personOf`). A crowd of
 * thousands gets them per copy from where each one stands, in its
 * material (`folkMaterial`), at no extra cost: its shapes are painted in
 * marker colours the material paints over, and some have long hair or a
 * cap that the others do not.
 */

/** Sixteen of each, the commoner ones more than once: as a Danish or a Canadian crowd has them. */
const SKINS = spread([
  ["#f4dccb", 3],
  ["#ecc9b0", 3],
  ["#dfb999", 3],
  ["#cfa27f", 2],
  ["#b8866a", 2],
  ["#946549", 1],
  ["#6f4a35", 1],
  ["#503528", 1],
]);
const HAIRS = spread([
  ["#e3cb94", 2],
  ["#c6a066", 2],
  ["#98734a", 3],
  ["#6b4c33", 3],
  ["#3b2c22", 2],
  ["#a4502e", 1],
  ["#9d988f", 2],
  ["#dedad2", 1],
]);
/** The darkest four skins' hair. */
const DARK_HAIRS = ["#2a221d", "#3b2c22", "#1f1a17", "#4a3a2e"];
const DARK_FROM = 13;
const TROUSERS = spread([
  ["#4d5d78", 3],
  ["#2f3a52", 3],
  ["#2b2d31", 3],
  ["#5d6066", 2],
  ["#b9ab8f", 2],
  ["#7a7458", 1],
  ["#26304a", 2],
]);

function spread(weighted: [string, number][]): string[] {
  const out = weighted.flatMap(([colour, n]) => Array<string>(n).fill(colour));
  if (out.length !== 16) throw new Error("Sixteen colours, by weight.");
  return out;
}

export type Person = { skin: string; hair: string; trousers: string };

/** Someone's looks, the same for the same number every ride. */
export function personOf(seed: number): Person {
  const skin = Math.floor(hash(seed, 1, 917) * 16);
  const hair = hash(seed, 2, 917);
  return {
    skin: SKINS[skin]!,
    hair: skin >= DARK_FROM ? DARK_HAIRS[Math.floor(hair * 4)]! : HAIRS[Math.floor(hair * 16)]!,
    trousers: TROUSERS[Math.floor(hash(seed, 3, 917) * 16)]!,
  };
}

/**
 * The marker colours a crowd's shapes are painted in, each painted over
 * per copy by `folkMaterial`: the skin, the hair, long hair (for some),
 * the trousers, and a cap (for a few, in the jacket's colour).
 */
export const MARK = {
  skin: "#ff0000",
  hair: "#00ff00",
  long: "#00ffff",
  trousers: "#0000ff",
  cap: "#ff00ff",
} as const;

/** The shares of a crowd with long hair and with a cap. */
const LONG = 0.38;
const CAP = 0.22;

const FOLK = `
#if defined( USE_COLOR ) && defined( USE_INSTANCING )
  vec2 folkAt = instanceMatrix[3].xz;
  float folkA = fract(sin(dot(folkAt, vec2(12.9898, 78.233))) * 43758.5453);
  float folkB = fract(sin(dot(folkAt, vec2(39.3468, 11.135))) * 24634.6345);
  float folkC = fract(sin(dot(folkAt, vec2(73.156, 52.235))) * 19341.4253);
  vec3 folkMark = color.xyz;
  int folkSkin = int(folkA * 16.0);
  if (folkMark.r > 0.99 && folkMark.g < 0.01 && folkMark.b < 0.01) {
    vColor.xyz = uSkins[folkSkin];
  } else if (folkMark.g > 0.99 && folkMark.r < 0.01) {
    vColor.xyz = folkSkin >= ${DARK_FROM} ? uDarkHairs[int(folkB * 4.0)] : uHairs[int(folkB * 16.0)];
    if (folkMark.b > 0.99 && folkC > ${LONG}) transformed = vec3(0.0, 1.55, 0.0);
  } else if (folkMark.b > 0.99 && folkMark.r < 0.01 && folkMark.g < 0.01) {
    vColor.xyz = uTrousers[int(folkC * 16.0)];
  } else if (folkMark.r > 0.99 && folkMark.b > 0.99 && folkMark.g < 0.01) {
    #ifdef USE_INSTANCING_COLOR
    vColor.xyz = instanceColor.xyz * 0.8;
    #endif
    if (fract(folkC * 7.31) > ${CAP}) transformed = vec3(0.0, 1.55, 0.0);
  }
#endif
`;

/**
 * A crowd's material: flat-shaded, each copy in a jacket of its own colour
 * (`treeMaterial`), and with a skin, a hair, trousers, long hair or a cap
 * of its own from where it stands. What is not worn folds away to a point
 * inside the head.
 */
export function folkMaterial(): THREE.MeshLambertMaterial {
  const material = treeMaterial();
  const jackets = material.onBeforeCompile;
  const colours = (list: string[]) => ({ value: list.map((c) => new THREE.Color(c)) });
  material.onBeforeCompile = (shader, renderer) => {
    jackets(shader, renderer);
    shader.uniforms.uSkins = colours(SKINS);
    shader.uniforms.uHairs = colours(HAIRS);
    shader.uniforms.uDarkHairs = colours(DARK_HAIRS);
    shader.uniforms.uTrousers = colours(TROUSERS);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform vec3 uSkins[16];",
          "uniform vec3 uHairs[16];",
          "uniform vec3 uDarkHairs[4];",
          "uniform vec3 uTrousers[16];",
        ].join("\n"),
      )
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${FOLK}`);
  };
  material.customProgramCacheKey = () => "rulle-folk";
  return material;
}

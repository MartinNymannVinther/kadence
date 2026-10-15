import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DARK, LIGHT, mapSources, mapStyle } from "@/components/activities/map-style";
import { FONT_STACKS, GLYPH_RANGES } from "@/components/activities/map-text";

/**
 * The glyphs the map's names are drawn with (ADR 0100) are files in the
 * repository: every font stack the style names is there with every range,
 * nothing else is, the licence travels with them, and the ranges hold the
 * letters of Danish, Spanish and Catalan names.
 */

const FONTS = join(import.meta.dirname, "..", "..", "public", "map", "fonts");

/** A protobuf varint at `at`: the value and where the next field starts. */
function varint(bytes: Uint8Array, at: number): [number, number] {
  let value = 0;
  let shift = 0;
  let i = at;
  for (;;) {
    const byte = bytes[i++]!;
    value += (byte & 0x7f) * 2 ** shift;
    if (byte < 0x80) return [value, i];
    shift += 7;
  }
}

/** Each field of one protobuf message: its number, and its bytes when length-delimited or its value. */
function* fields(bytes: Uint8Array): Generator<[number, Uint8Array | number]> {
  let i = 0;
  while (i < bytes.length) {
    const [key, next] = varint(bytes, i);
    i = next;
    const wire = key & 7;
    if (wire === 0) {
      const [value, after] = varint(bytes, i);
      i = after;
      yield [key >> 3, value];
    } else if (wire === 2) {
      const [length, start] = varint(bytes, i);
      i = start + length;
      yield [key >> 3, bytes.subarray(start, i)];
    } else if (wire === 5) i += 4;
    else if (wire === 1) i += 8;
    else throw new Error(`wire type ${wire}`);
  }
}

/**
 * The code points a glyph file holds. The format is MapLibre's glyphs
 * protobuf: glyphs { repeated fontstack stacks = 1 }, fontstack { name = 1,
 * range = 2, repeated glyph glyphs = 3 }, glyph { uint32 id = 1, … }.
 */
function codePoints(file: string): Set<number> {
  const found = new Set<number>();
  for (const [field, stack] of fields(new Uint8Array(readFileSync(file)))) {
    if (field !== 1 || typeof stack === "number") continue;
    for (const [inner, glyph] of fields(stack)) {
      if (inner !== 3 || typeof glyph === "number") continue;
      for (const [id, value] of fields(glyph)) if (id === 1) found.add(value as number);
    }
  }
  return found;
}

/** Every font stack a style's layers name, including those chosen by an expression. */
function stacksIn(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === "string" && value.startsWith("Noto ")) found.add(value);
  else if (Array.isArray(value)) value.forEach((v) => stacksIn(v, found));
  return found;
}

describe("the map's glyphs", () => {
  it("has every range of every font stack, and nothing beside them", () => {
    for (const stack of FONT_STACKS) {
      const files = readdirSync(join(FONTS, stack)).sort();
      expect(files).toEqual(GLYPH_RANGES.map((range) => `${range}.pbf`).sort());
    }
    const dirs = readdirSync(FONTS, { withFileTypes: true }).filter((e) => e.isDirectory());
    expect(dirs.map((d) => d.name).sort()).toEqual([...FONT_STACKS].sort());
  });

  it("has every font stack the style names", () => {
    const origin = "https://kadence.example";
    for (const palette of [LIGHT, DARK]) {
      const style = mapStyle(mapSources(origin, { detail: "a", world: "b" }), palette);
      const named = new Set<string>();
      for (const layer of style.layers)
        if (layer.type === "symbol") stacksIn(layer.layout?.["text-font"], named);
      expect(named.size).toBeGreaterThan(0);
      for (const stack of named) expect(FONT_STACKS).toContain(stack);
    }
  });

  it("keeps the files small", () => {
    let bytes = 0;
    for (const stack of FONT_STACKS)
      for (const range of GLYPH_RANGES)
        bytes += readFileSync(join(FONTS, stack, `${range}.pbf`)).length;
    expect(bytes).toBeLessThan(1.5 * 1024 * 1024);
  });

  it("covers Danish, Spanish and Catalan names, in both weights", () => {
    const letters = "æøåÆØÅ ñÑ çÇ àèéíïòóúü ÀÈÉÍÏÒÓÚÜ l·l ¿¡ ’–— O2 Ma-10 Sóller Køge Ŀ ș";
    for (const stack of FONT_STACKS) {
      const shipped = new Set<number>();
      for (const range of GLYPH_RANGES)
        for (const point of codePoints(join(FONTS, stack, `${range}.pbf`))) shipped.add(point);
      for (const letter of letters.replace(/ /g, ""))
        expect(shipped.has(letter.codePointAt(0)!), `${letter} in ${stack}`).toBe(true);
    }
  });

  it("carries the Open Font License and says where the files came from", () => {
    const licence = readFileSync(join(FONTS, "OFL.txt"), "utf8");
    expect(licence).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(licence).toContain("Noto Project Authors");
    expect(existsSync(join(FONTS, "README.md"))).toBe(true);
    expect(readFileSync(join(FONTS, "README.md"), "utf8")).toContain("protomaps/basemaps-assets");
  });
});

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The user manual (docs/adr/0079) is a document under public/, written
 * by hand: one HTML page with its pictures and the PDF rendered from it.
 * Nothing here is generated at build time, so this holds the pieces
 * together — every picture the page names is there, every chapter the
 * contents list exists, the PDF is beside the page and not stale against
 * the page's text — and Viden og hjælp's links point at files that exist.
 */

const dir = join(process.cwd(), "public", "brugervejledning");
const html = readFileSync(join(dir, "index.html"), "utf8");

describe("the user manual", () => {
  it("names only pictures that are there", () => {
    const pictures = [...html.matchAll(/src="(img\/[^"]+)"/g)].map((m) => m[1]!);
    expect(pictures.length).toBeGreaterThanOrEqual(10);
    for (const picture of pictures) expect(existsSync(join(dir, picture)), picture).toBe(true);
  });

  it("lists chapters that exist, and every chapter is listed", () => {
    const listed = [...html.matchAll(/<li><a href="#([^"]+)">/g)].map((m) => m[1]!);
    const chapters = [...html.matchAll(/<section class="chapter" id="([^"]+)">/g)].map(
      (m) => m[1]!,
    );
    expect(listed).toEqual(chapters);
    expect(chapters.length).toBe(8);
  });

  it("gives every picture a text for a screen reader", () => {
    const images = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    for (const image of images) expect(image, image).toMatch(/alt="[^"]+"/);
  });

  it("has its PDF beside it, rendered after the page was last written", () => {
    const pdf = join(dir, "kadence-brugervejledning.pdf");
    expect(existsSync(pdf)).toBe(true);
    expect(statSync(pdf).size).toBeGreaterThan(200_000);
    expect(readFileSync(pdf).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("is where Viden og hjælp points", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/[locale]/(app)/(narrow)/help/page.tsx"),
      "utf8",
    );
    for (const href of [...page.matchAll(/"\/brugervejledning\/([^"]+)"/g)].map((m) => m[1]!)) {
      expect(existsSync(join(dir, href)), href).toBe(true);
    }
  });
});

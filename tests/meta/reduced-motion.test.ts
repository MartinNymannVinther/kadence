import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

/**
 * `motion-reduce:animate-none` alone does not reliably win: a sibling
 * variant of equal specificity — `data-open:animate-in` and friends —
 * sits later in Tailwind's generated stylesheet and overrides it even
 * under `prefers-reduced-motion`, confirmed by rendering `SheetContent`
 * with and without `!` and reading `getComputedStyle(...).animationName`
 * (P2-06). `!motion-reduce:animate-none` — Tailwind's important modifier,
 * written `motion-reduce:!animate-none` — forces the win regardless of
 * generation order. Every place that stops an animation under reduced
 * motion must use the `!` form, so a later edit that drops it is caught
 * here rather than by a rider who asked for less motion and did not get
 * it.
 */

const FILES = [
  "src/app/[locale]/page.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/ui/skeleton.tsx",
  "src/components/ui/select.tsx",
  "src/components/rulle/scene/lens-drops.tsx",
];

const read = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

describe("reduced motion wins the cascade", () => {
  it.each(FILES)(
    "%s uses the important modifier on every motion-reduce:animate-none",
    async (path) => {
      const source = await read(path);
      const plain = source.match(/motion-reduce:animate-none/g) ?? [];
      expect(plain).toEqual([]);
      expect(source).toContain("motion-reduce:!animate-none");
    },
  );
});

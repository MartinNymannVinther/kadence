import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { field, fieldSorts, FIELD_SORTS } from "@/core/jobs/payload";
import { HANDLERS } from "@/modules/jobs/handlers";

/**
 * A job's payload holds ids, days, counts, short words, a provider's
 * address for a file and a ride file's name — never a person's name, an
 * address, a token or anything about health (docs/adr/0085). The jobs
 * table is the installation's and carries no audit trigger, so this is
 * the rule that keeps it that way: every field of every kind is built
 * from `field`, and every payload is closed to fields it does not name.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("every kind of job", () => {
  it("has a payload of fields built for it, and closed to any other", () => {
    for (const { kind } of HANDLERS) {
      const sorts = fieldSorts(kind.payload);
      expect(sorts, kind.kind).not.toBeNull();
      for (const [name, sort] of Object.entries(sorts!))
        expect(sort, `${kind.kind}.${name}`).not.toBeNull();
      const def = (kind.payload as unknown as { _zod: { def: { catchall?: z.ZodType } } })._zod.def;
      expect(def.catchall?._zod.def.type, kind.kind).toBe("never");
    }
  });

  it("has exactly one handler, and every kind declared in the code has one", () => {
    const registered = HANDLERS.map((h) => h.kind.kind);
    expect(new Set(registered).size).toBe(registered.length);
    const declared = sourceFiles(join(process.cwd(), "src")).flatMap((path) =>
      [...readFileSync(path, "utf8").matchAll(/jobKind\(\s*"([\w.]+)"/g)].map((m) => m[1]!),
    );
    expect(declared.length).toBeGreaterThan(0);
    expect([...declared].sort()).toEqual([...registered].sort());
  });

  it("is run as the team's own people, or has no team", () => {
    const teams = HANDLERS.filter((h) => h.kind.team).map((h) => h.kind.kind);
    expect(teams.sort()).toEqual(["dcu.read_rider", "files.move"]);
  });
});

describe("a payload's fields", () => {
  it("are of the sorts there are", () => {
    expect([...FIELD_SORTS]).toEqual(["id", "day", "count", "word", "ref", "file"]);
  });

  it("refuse a name, an address and free text where an id belongs", () => {
    const id = field.id();
    expect(id.safeParse("user_abc-123:x").success).toBe(true);
    for (const value of ["Ida Holm", "ida@example.com ", "a/b", "", "x".repeat(201)])
      expect(id.safeParse(value).success, value).toBe(false);
    expect(field.day().safeParse("2026-10-11").success).toBe(true);
    expect(field.day().safeParse("11. oktober").success).toBe(false);
    expect(field.count().safeParse(-1).success).toBe(false);
    expect(field.ref().safeParse("http://cdn.example/ride.fit").success).toBe(false);
    expect(field.ref().safeParse("https://cdn.example/ride.fit").success).toBe(true);
    expect(field.file().safeParse("Morgentur.fit").success).toBe(true);
    expect(field.file().safeParse("puls 182 og ondt i knæet").success).toBe(false);
  });
});

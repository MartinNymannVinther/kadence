import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A function exported from a "use client" module can be rendered or passed
 * to a client component from the server, never called there: Next throws
 * "Attempted to call … from the server but … is on the client", and the
 * page shows "This page couldn't load". That reached kadence.haij.dk once
 * (12 October 2026, a session's panel that called weekNoteOf). Nothing in
 * the unit suite renders server components, so this reads the source: a
 * module without "use client" may import components (PascalCase) and types
 * from a client module, and nothing else.
 */

const ROOT = resolve(__dirname, "../..");
const SRC = join(ROOT, "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

const isClient = (source: string) => /^\s*["']use client["'];?/.test(source);

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ])
    if (existsSync(candidate)) return candidate;
  return null;
}

const IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;

describe("the server never calls into a client module", () => {
  it("imports only components and types from a 'use client' module outside one", () => {
    const offenders: string[] = [];
    for (const file of files(SRC)) {
      const source = readFileSync(file, "utf8");
      if (isClient(source)) continue;
      for (const match of source.matchAll(IMPORT)) {
        if (match[1]) continue; // `import type { … }`
        const target = resolveImport(file, match[3]!);
        if (!target || !isClient(readFileSync(target, "utf8"))) continue;
        const names = match[2]!
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .filter((n) => !n.startsWith("type "))
          .map((n) => n.split(/\s+as\s+/)[0]!.trim());
        for (const name of names)
          if (!/^[A-Z]/.test(name))
            offenders.push(`${file.slice(ROOT.length + 1)}: ${name} from ${match[3]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

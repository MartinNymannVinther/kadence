import { createHash } from "node:crypto";
import { expect, vi } from "vitest";
import {
  importArchive,
  planArchive,
  type ArchiveProgress,
} from "@/components/activities/import-archive";
import type { RefusalMemory } from "@/components/activities/archive-memory";
import { openFolder, type ArchiveSource } from "@/components/activities/read-archive";

/**
 * A Strava archive and a Kadence to send it to, both stood in for, for the
 * browser's side of the import (tests/files/import-archive*.test.ts).
 */

export const RIDER = "rider_1";
export const sha = (text: string) => createHash("sha256").update(text).digest("hex");

export const CSV = [
  "Activity ID,Activity Name,Activity Type,Filename",
  "1,Første tur,Ride,activities/1.fit.gz",
  "2,Løb,Run,activities/2.gpx",
  "3,Tredje tur,Ride,activities/3.fit.gz",
  "4,Fjerde tur,Virtual Ride,activities/4.fit.gz",
  "5,Femte tur,Ride,activities/5.fit.gz",
].join("\n");

export function archive(files: Record<string, string>): ArchiveSource {
  return openFolder(
    Object.entries(files).map(([path, content]) => ({
      path,
      file: new File([content], path.split("/").at(-1)!),
    })),
  );
}

export const full = () =>
  archive({
    "export_9/activities.csv": CSV,
    "export_9/activities/1.fit.gz": "ride 1",
    "export_9/activities/2.gpx": "run 2",
    "export_9/activities/3.fit.gz": "ride 3",
    "export_9/activities/4.fit.gz": "ride 4",
    "export_9/activities/5.fit.gz": "ride 5",
  });

export type Sent = { only: string; files: string[]; titles: string[]; kinds: string[] };

/** A browser's storage, for one test. */
export function storage(): RefusalMemory & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

/** A Kadence that has the files with these contents, and answers each sent file with `answer`. */
export function server(
  has: string[],
  answer: (name: string) => { ok: boolean; error?: string } = () => ({ ok: true }),
  status = 200,
) {
  const sent: Sent[] = [];
  const asked: string[][] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/activities/known") {
        const { riderId, hashes } = JSON.parse(String(init.body));
        expect(riderId).toBe(RIDER);
        asked.push(hashes);
        return Response.json({ known: hashes.filter((h: string) => has.map(sha).includes(h)) });
      }
      const address = new URL(url, "http://kadence.test");
      expect(address.pathname).toBe("/api/activities/archive");
      expect(address.searchParams.get("riderId")).toBe(RIDER);
      const form = init.body as FormData;
      const files = form.getAll("file") as File[];
      sent.push({
        only: String(address.searchParams.get("only")),
        files: files.map((f) => f.name),
        titles: form.getAll("title").map(String),
        kinds: form.getAll("kind").map(String),
      });
      if (status !== 200)
        return Response.json({ error: "x", retryAfterSeconds: 7_200 }, { status });
      const results = files.map((f) => ({ name: f.name, ...answer(f.name) }));
      const limited = results.some((r) => r.error === "rateLimited");
      return Response.json({ results, retryAfterSeconds: limited ? 7_200 : 0 });
    }),
  );
  return { sent, asked };
}

export async function run(
  source: ArchiveSource,
  onlyBike: boolean,
  signal = new AbortController().signal,
  memory: RefusalMemory = storage(),
) {
  const plan = (await planArchive(source))!;
  const seen: ArchiveProgress[] = [];
  const final = await importArchive(RIDER, source, plan, {
    onlyBike,
    signal,
    onProgress: (p) => seen.push(p),
    memory,
    paceMs: 0,
  });
  return { plan, final, seen };
}

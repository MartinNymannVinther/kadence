import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeviceDenied,
  fetchWorkout,
  findNewFiles,
  pickNewFiles,
  writeFiles,
  type DirectoryHandleLike,
} from "@/components/session/send-to-device";

/**
 * Sessions onto a Garmin by cable (docs/adr/0031), with the device stood
 * in for: the NewFiles folder is found from whatever the rider picked —
 * a drive, a Mac's GARMIN volume, the Garmin folder, a watch's upper-case
 * folders, NewFiles itself — and nowhere else; files are written there
 * under the names Kadence's export gives, and a browser's no is a no.
 */

type FakeDir = DirectoryHandleLike & {
  files: Map<string, Uint8Array>;
  dirs: Map<string, FakeDir>;
};

function dir(name: string, children: FakeDir[] = [], refuse = false): FakeDir {
  const files = new Map<string, Uint8Array>();
  const dirs = new Map(children.map((child) => [child.name, child]));
  const self: FakeDir = {
    kind: "directory",
    name,
    files,
    dirs,
    async *values() {
      for (const child of dirs.values()) yield { kind: "directory" as const, name: child.name };
      for (const file of files.keys()) yield { kind: "file" as const, name: file };
    },
    async getDirectoryHandle(child, options) {
      const found = dirs.get(child);
      if (found) return found;
      if (!options?.create) throw new DOMException("no such folder", "NotFoundError");
      const made = dir(child);
      dirs.set(child, made);
      return made;
    },
    async getFileHandle(file) {
      return {
        async createWritable() {
          if (refuse) throw new DOMException("not allowed", "NotAllowedError");
          let written: Uint8Array = new Uint8Array();
          return {
            async write(data: Uint8Array) {
              written = data;
            },
            async close() {
              files.set(file, written);
            },
          };
        },
      };
    },
  };
  return self;
}

const newFilesOf = (root: FakeDir) => findNewFiles(root).then((found) => found?.name ?? null);

afterEach(() => vi.unstubAllGlobals());

describe("the folder a Garmin takes new files from", () => {
  it("is found from the drive, a Mac's GARMIN volume, or the Garmin folder", async () => {
    expect(await newFilesOf(dir("E:", [dir("Garmin", [dir("NewFiles"), dir("Activities")])]))).toBe(
      "NewFiles",
    );
    // On a Mac the volume is called GARMIN too, with the Garmin folder inside it.
    expect(await newFilesOf(dir("GARMIN", [dir("Garmin", [dir("NewFiles")])]))).toBe("NewFiles");
    expect(await newFilesOf(dir("Garmin", [dir("NewFiles")]))).toBe("NewFiles");
    expect(await newFilesOf(dir("NewFiles"))).toBe("NewFiles");
  });

  it("is found on a watch, whose folders are upper case", async () => {
    expect(await newFilesOf(dir("GARMIN", [dir("GARMIN", [dir("NEWFILES")])]))).toBe("NEWFILES");
  });

  it("is made in a Garmin folder that has none", async () => {
    const garmin = dir("Garmin", [dir("Activities")]);
    expect(await newFilesOf(dir("E:", [garmin]))).toBe("NewFiles");
    expect(garmin.dirs.has("NewFiles")).toBe(true);
  });

  it("is not found anywhere else, and nothing is made there", async () => {
    const activities = dir("Activities");
    expect(await findNewFiles(activities)).toBeNull();
    expect(await findNewFiles(dir("Downloads", [dir("Photos")]))).toBeNull();
    expect(activities.dirs.size).toBe(0);
  });
});

describe("asking for the device", () => {
  it("answers with NewFiles, nothing when the picker is closed, and says so when it is no Garmin", async () => {
    const picker = vi.fn();
    vi.stubGlobal("window", { showDirectoryPicker: picker });
    picker.mockResolvedValueOnce(dir("GARMIN", [dir("Garmin", [dir("NewFiles")])]));
    const found = await pickNewFiles();
    expect(found !== null && found !== "not_garmin" && found.name).toBe("NewFiles");
    expect(picker).toHaveBeenCalledWith({ id: "kadence-device", mode: "readwrite" });

    picker.mockRejectedValueOnce(new DOMException("closed", "AbortError"));
    expect(await pickNewFiles()).toBeNull();
    picker.mockResolvedValueOnce(dir("Documents"));
    expect(await pickNewFiles()).toBe("not_garmin");
    picker.mockRejectedValueOnce(new DOMException("no", "NotAllowedError"));
    await expect(pickNewFiles()).rejects.toBeInstanceOf(DeviceDenied);
  });
});

describe("writing the sessions", () => {
  it("puts each file in the folder under its name", async () => {
    const newFiles = dir("NewFiles");
    await writeFiles(newFiles, [
      { name: "2026-09-29-tempo.fit", bytes: new Uint8Array([1, 2]) },
      { name: "2026-09-30-2-sprint.fit", bytes: new Uint8Array([3]) },
    ]);
    expect([...newFiles.files.entries()]).toEqual([
      ["2026-09-29-tempo.fit", new Uint8Array([1, 2])],
      ["2026-09-30-2-sprint.fit", new Uint8Array([3])],
    ]);
  });

  it("is refused when the browser may not write, and says so as a no", async () => {
    await expect(
      writeFiles(dir("NewFiles", [], true), [{ name: "a.fit", bytes: new Uint8Array([1]) }]),
    ).rejects.toBeInstanceOf(DeviceDenied);
  });

  it("takes the name the export gives, and no other", async () => {
    const answer = (disposition: string) =>
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(new Uint8Array([9]), { headers: { "content-disposition": disposition } }),
        ),
      );
    answer('attachment; filename="2026-09-29-tempo.fit"');
    expect(await fetchWorkout("ses_1")).toEqual({
      name: "2026-09-29-tempo.fit",
      bytes: new Uint8Array([9]),
    });
    for (const odd of [
      'attachment; filename="../../boot.fit"',
      'attachment; filename="x.exe"',
      "",
    ]) {
      answer(odd);
      expect((await fetchWorkout("ses/1")).name, odd).toBe("kadence-ses1.fit");
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    await expect(fetchWorkout("ses_1")).rejects.toThrow();
  });
});

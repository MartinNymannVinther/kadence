"use client";

import {
  hasRideName,
  isWalkable,
  MAX_FOLDER_FILES,
  pickRideFiles,
  type FolderEntry,
} from "@/modules/files/device-folder";

/**
 * A folder from a bike computer, read in the browser: the rides in it
 * that Kadence does not have. The device is plugged in with a cable and
 * shows up as a drive; the rider picks it, the rides are found
 * (src/modules/files/device-folder.ts), each is hashed here, and the
 * server says which hashes it knows (/api/activities/known). Only the
 * rest is sent, newest first. Nothing is read from the drive but the
 * ride files, and nothing is written to it.
 *
 * Two ways to be handed a folder: the File System Access API, where the
 * browser has it (Chrome on a computer and on Android), and a file input
 * that takes a directory elsewhere (Safari on iPhone from 18.4, Firefox).
 * A browser with neither shows no button.
 */

export type FolderFile = FolderEntry & { file: File };

export type FolderSupport = "picker" | "input" | null;

/** The rider said no to the browser's question, or the browser may not ask. */
export class FolderDenied extends Error {}

/** The part of the File System Access API this file uses; not in TypeScript's DOM library yet. */
type EntryHandle =
  | { kind: "file"; name: string; getFile(): Promise<File> }
  | { kind: "directory"; name: string; values(): AsyncIterable<EntryHandle> };
type DirectoryHandle = Extract<EntryHandle, { kind: "directory" }>;
type PickerWindow = Window & {
  showDirectoryPicker?: (options: { id: string; mode: "read" }) => Promise<DirectoryHandle>;
};

export function folderSupport(): FolderSupport {
  if (typeof window === "undefined") return null;
  if (typeof (window as PickerWindow).showDirectoryPicker === "function") return "picker";
  return "webkitdirectory" in HTMLInputElement.prototype ? "input" : null;
}

async function walk(dir: DirectoryHandle, prefix: string, depth: number, out: FolderFile[]) {
  for await (const handle of dir.values()) {
    if (out.length >= MAX_FOLDER_FILES * 2) return;
    if (handle.kind === "directory") {
      if (isWalkable(handle.name, depth))
        await walk(handle, `${prefix}${handle.name}/`, depth + 1, out);
    } else if (hasRideName(handle.name)) {
      const file = await handle.getFile();
      out.push({
        path: `${prefix}${handle.name}`,
        size: file.size,
        modified: file.lastModified,
        file,
      });
    }
  }
}

/**
 * Asks for a folder and answers with the files in it that may be rides;
 * null when the rider closed the picker. The browser remembers where the
 * picker was last, so the second time it opens on the device.
 */
export async function pickFolder(): Promise<FolderFile[] | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  let root: DirectoryHandle;
  try {
    root = await picker.call(window, { id: "kadence-device", mode: "read" });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "AbortError") return null;
    if (name === "NotAllowedError" || name === "SecurityError") throw new FolderDenied();
    throw error;
  }
  const out: FolderFile[] = [];
  await walk(root, `${root.name}/`, 0, out);
  return out;
}

/** The same from a file input that was given a directory. */
export function filesOfInput(list: FileList): FolderFile[] {
  return Array.from(list)
    .filter((file) => hasRideName(file.name))
    .map((file) => ({
      path: file.webkitRelativePath || file.name,
      size: file.size,
      modified: file.lastModified,
      file,
    }));
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The server's cap on one question (src/modules/devices/import.ts). */
const ASK = 500;

export type FolderFindings = {
  /** Rides Kadence does not have, newest first; every ride, when `checked` is false. */
  fresh: File[];
  /** How many rides in the folder were here already. */
  known: number;
  /**
   * Whether the server was asked which rides it has. Where the browser
   * cannot hash — a page not served over https — or the server could not
   * be asked, it was not: every ride counts as new, the server recognises
   * the ones it has when they arrive, and the page says so rather than
   * calling them new.
   */
  checked: boolean;
  /** Files that could not be read from the drive, and were passed over. */
  unreadable: number;
};

export async function findFresh(riderId: string, files: FolderFile[]): Promise<FolderFindings> {
  const rides = pickRideFiles(files);
  const unchecked = (unreadable = 0): FolderFindings => ({
    fresh: rides.map((r) => r.file),
    known: 0,
    checked: false,
    unreadable,
  });
  if (rides.length === 0) return { fresh: [], known: 0, checked: true, unreadable: 0 };
  if (!globalThis.crypto?.subtle) return unchecked();

  const hashed: Array<{ file: File; hash: string }> = [];
  const seen = new Set<string>();
  let unreadable = 0;
  for (const ride of rides) {
    let hash: string;
    try {
      hash = await sha256(ride.file);
    } catch {
      // The cable came loose, or the drive let go of the file: the rest are still rides.
      unreadable += 1;
      continue;
    }
    if (seen.has(hash)) continue;
    seen.add(hash);
    hashed.push({ file: ride.file, hash });
  }

  const known = new Set<string>();
  try {
    for (let i = 0; i < hashed.length; i += ASK) {
      const response = await fetch("/api/activities/known", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId,
          hashes: hashed.slice(i, i + ASK).map((h) => h.hash),
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const answer = (await response.json()) as { known?: string[] };
      for (const hash of answer.known ?? []) known.add(hash);
    }
  } catch {
    return { ...unchecked(unreadable), fresh: hashed.map((h) => h.file) };
  }
  return {
    fresh: hashed.filter((h) => !known.has(h.hash)).map((h) => h.file),
    known: hashed.filter((h) => known.has(h.hash)).length,
    checked: true,
    unreadable,
  };
}

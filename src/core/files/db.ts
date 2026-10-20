import type { FileLocation, FileStorage } from "./types";

/**
 * Files in the database (docs/adr/0087): the file is the row's own
 * `bytes`, as it has been since the first upload (ADR 0018). Nothing
 * leaves the server, there is no second system to run, and a backup of
 * the database is a backup of the files. The default, and right for a
 * club on its own machine.
 */
export const dbStorage: FileStorage = {
  mode: "db",
  objects: null,
  async store(_key: string, bytes: Uint8Array): Promise<FileLocation> {
    return { bytes, storageKey: null };
  },
  async load(location: FileLocation): Promise<Uint8Array | null> {
    return location.bytes ?? null;
  },
  async discard(): Promise<void> {},
};

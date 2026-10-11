/**
 * What every file storage shares (docs/adr/0087), kept free of the
 * environment so the back ends and the tests can import it on their own.
 */

/** The two columns of a row that say where its file is. */
export type FileLocation = { bytes: Uint8Array | null; storageKey: string | null };

/** The four things an object store does; `s3.ts` implements them, the tests' fake S3 serves them. */
export interface ObjectStore {
  putObject(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  getObject(key: string): Promise<Uint8Array | null>;
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<{ size: number } | null>;
}

export interface FileStorage {
  readonly mode: "db" | "s3";
  /** The store beneath, for the jobs that move and delete objects; null in `db` mode. */
  readonly objects: ObjectStore | null;
  /** Puts a new file where this mode keeps files; answers the row's two columns. */
  store(key: string, bytes: Uint8Array): Promise<FileLocation>;
  /** The file's bytes for a row that was read under RLS; null when the object is gone. */
  load(location: FileLocation): Promise<Uint8Array | null>;
  /** Removes an object that was stored and whose row never came to be; nothing in `db` mode. */
  discard(key: string): Promise<void>;
}

export const FILE_CONTENT_TYPE = "application/octet-stream";

/** `<org id>/<rider id>/<sha256>.fit`: a listing of the bucket says nothing about anyone. */
export function objectKey(orgId: string, riderId: string, sha256: string): string {
  return `${orgId}/${riderId}/${sha256}.fit`;
}

/** Where a key says its file belongs: the two ids, or null for a key of another shape. */
export function keyOwner(key: string): { orgId: string; riderId: string } | null {
  const match = /^([^/]+)\/([^/]+)\/[0-9a-f]{64}\.fit$/.exec(key);
  return match ? { orgId: match[1]!, riderId: match[2]! } : null;
}

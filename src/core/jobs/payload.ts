import { z } from "zod";

/**
 * What a job may carry (docs/adr/0085). The jobs table is the
 * installation's: the worker reads every team's jobs with nobody signed
 * in, and the table has no audit trigger. So a payload holds what is
 * needed to find the work again and nothing that is anybody's to keep:
 * ids, days, counts, short words from a fixed list, a provider's address
 * for a file, and a ride's file name as the rider's device gave it. Never
 * a person's name, an e-mail address, a password or a token, and nothing
 * about health. The handler reads the rest as the team's own people, under
 * the ordinary policies.
 *
 * Every field of every kind is built from `field` below, which marks it
 * with what it is; tests/jobs/payload.test.ts walks every registered
 * kind and fails one with a field built any other way. Imports nothing
 * but zod, so it is tested without a database.
 */

/** What a field of a payload is. */
export const FIELD_SORTS = ["id", "day", "count", "word", "ref", "file"] as const;
export type FieldSort = (typeof FIELD_SORTS)[number];

/** An id: a row's, a provider's for a person or an activity, a key. Letters, digits and `_-.:@`. */
const ID = /^[\w.:@-]{1,200}$/;

export const field = {
  id: () => z.string().regex(ID).describe("id"),
  /** A Copenhagen day, yyyy-mm-dd. */
  day: () =>
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("day"),
  count: () => z.number().int().min(0).max(1_000_000_000).describe("count"),
  /** One of a fixed list of words: which provider, which kind of event. */
  word: <const T extends readonly [string, ...string[]]>(values: T) =>
    z.enum(values).describe("word"),
  /**
   * Where a provider keeps a file it told Kadence about: an https address
   * the provider wrote, checked again against the provider's own hosts
   * before anything is fetched (src/modules/devices/http.ts).
   */
  ref: () =>
    z
      .url({ protocol: /^https$/ })
      .max(2000)
      .describe("ref"),
  /**
   * A ride file's name as the rider's device named the ride, already made
   * printable and cut to a hundred characters (src/modules/devices/file-name.ts).
   * The import names the ride from it a moment later, under the rider's
   * own policies; it never holds anything else.
   */
  file: () =>
    z
      .string()
      .max(110)
      .regex(/\.fit$/)
      .describe("file"),
};

/** A payload: an object of fields and nothing else. */
export function payload<S extends z.ZodRawShape>(shape: S) {
  return z.strictObject(shape);
}

/** Whether `value` is a valid dedupe key: an id. */
export function isJobKey(value: string): boolean {
  return ID.test(value);
}

type Inner = { _zod: { def: { type: string; innerType?: z.ZodType } } };

/** The schema under `.optional()`, `.nullable()` and `.default()`. */
function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema as unknown as Inner;
  while (["optional", "nullable", "default"].includes(current._zod.def.type)) {
    const inner = current._zod.def.innerType;
    if (!inner) break;
    current = inner as unknown as Inner;
  }
  return current as unknown as z.ZodType;
}

/**
 * What each field of a payload schema is, or null for a field that was
 * not built from `field` (and so may carry anything). For the test, and
 * for nothing else.
 */
export function fieldSorts(schema: z.ZodType): Record<string, FieldSort | null> | null {
  if (!(schema instanceof z.ZodObject)) return null;
  const sorts: Record<string, FieldSort | null> = {};
  for (const [name, value] of Object.entries(schema.shape as Record<string, z.ZodType>)) {
    const description = unwrap(value).description;
    sorts[name] = (FIELD_SORTS as readonly string[]).includes(description ?? "")
      ? (description as FieldSort)
      : null;
  }
  return sorts;
}

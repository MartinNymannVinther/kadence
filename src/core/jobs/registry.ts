import type { z } from "zod";

/**
 * The kinds of job there are, and what runs each (docs/adr/0085).
 *
 * A kind is declared where its work lives, with the zod schema its
 * payload must pass (built from src/core/jobs/payload.ts) and how it is
 * run: how long a run may take, how often it is tried, and for a
 * recurring kind how long between runs. The declaration is all a caller
 * needs to put a job in the queue (queue.ts), so it imports nothing but
 * types and stays free of the code that does the work.
 *
 * The work is attached with `handle()`, in a file beside the module's
 * code, and the list of every handler (src/modules/jobs/handlers.ts) is
 * the registry the worker runs from. A kind without a handler there is a
 * job nobody will run, and tests/jobs/payload.test.ts fails it.
 */

export type JobKind<S extends z.ZodType = z.ZodType> = {
  readonly kind: string;
  readonly payload: S;
  /** How long one run may take before it counts as failed. Default two minutes. */
  readonly timeoutMs: number;
  /** How many runs before the job gives up. Default five. */
  readonly maxAttempts: number;
  /** For a recurring kind: how long after a run the next one is due. */
  readonly every?: number;
  /** Whether a job of this kind is a team's work, and so carries `org_id`. */
  readonly team: boolean;
};

export type JobContext = {
  id: string;
  /** The team whose work it is, for a kind that is a team's. */
  orgId: string | null;
  /** Which run this is, from 1. */
  attempt: number;
  /** Aborted when the run has taken longer than the kind allows. */
  signal: AbortSignal;
};

export type Handler = {
  readonly kind: JobKind;
  readonly run: (payload: unknown, ctx: JobContext) => Promise<unknown>;
};

const MINUTE = 60_000;

export function jobKind<S extends z.ZodType>(
  kind: string,
  payload: S,
  options: { timeoutMs?: number; maxAttempts?: number; every?: number; team?: boolean } = {},
): JobKind<S> {
  return {
    kind,
    payload,
    timeoutMs: options.timeoutMs ?? 2 * MINUTE,
    maxAttempts: options.maxAttempts ?? 5,
    every: options.every,
    team: options.team ?? false,
  };
}

/** The work for a kind. The payload it is given has passed the kind's schema. */
export function handle<S extends z.ZodType>(
  kind: JobKind<S>,
  run: (payload: z.infer<S>, ctx: JobContext) => Promise<unknown>,
): Handler {
  return { kind, run: run as Handler["run"] };
}

/**
 * A handler's answer that the work cannot be done yet and is not a
 * failure: the job is put back, due again in `ms`, without counting a
 * try. A reading of Cykling Danmark when the installation has read its six
 * pages this minute answers this.
 */
export type Later = { readonly later: number };

export function later(ms: number): Later {
  return { later: Math.max(1_000, Math.round(ms)) };
}

export function isLater(value: unknown): value is Later {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { later?: unknown }).later === "number"
  );
}

/**
 * A failure that trying again will not mend: the job gives up at once,
 * with `code` as its last error.
 */
export class GiveUp extends Error {
  constructor(readonly code: string) {
    super(`job gave up: ${code}`);
    this.name = "GiveUp";
  }
}

/** The handlers by kind; a kind named twice is a mistake, refused at once. */
export function registry(handlers: readonly Handler[]): Map<string, Handler> {
  const byKind = new Map<string, Handler>();
  for (const handler of handlers) {
    if (byKind.has(handler.kind.kind)) throw new Error(`jobs: ${handler.kind.kind} twice`);
    byKind.set(handler.kind.kind, handler);
  }
  return byKind;
}

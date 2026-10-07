/**
 * Which week plan the planner shows when this device's copy and the
 * server's shared draft disagree (ADR 0043, amended 2026-10-07). The
 * planner keeps its copy in the browser as before, so a lost signal loses
 * nothing, and saves it to the server a moment after each change. When it
 * reads the server's draft — on opening, and now and then while open —
 * this decides:
 *
 * - **Nothing changed on the server** since this device last saved or
 *   read it: this device's copy stands, and is sent if it holds a change
 *   the server has not got.
 * - **Someone saved since**, and this device has nothing unsaved: the
 *   server's draft is taken, and the coach is told who saved it.
 * - **Both changed** (a conflict): the latest write wins. The server's
 *   draft is taken, with the message, when it was saved after this
 *   device's last change; otherwise this device's copy is sent and wins,
 *   and the other coach's planner finds it on its next read.
 * - **The server's draft is gone** — the week was laid in — while this
 *   device's copy was saved and unchanged: the copy is cleared too.
 *
 * Times are compared as they are: the server's clock against this
 * device's. A clock a minute wrong decides a race a minute wide wrongly,
 * which is the trade-off of a last-write-wins draft without a lock.
 *
 * Pure: imports nothing from the database.
 */

/** The team's plan; any other scope is the id of the rider the planner was opened for (ADR 0059). */
export const TEAM_SCOPE = "team";

export type LocalDraftMeta = {
  /** When this device last changed its copy, in ms since 1970 (this device's clock). */
  at: number;
  /** The server's `updatedAt` this copy was last saved as or read from; null if never. */
  base: string | null;
  /** True while this copy holds a change the server has not got. */
  dirty: boolean;
};

export type ServerDraftMeta = { updatedAt: string };

export type DraftChoice =
  /** Show this device's copy; send it when `push`. */
  | { take: "local"; push: boolean }
  /** Show the server's draft; say who saved it when `notice` (something here was replaced). */
  | { take: "server"; notice: boolean }
  /** Nothing to show; `cleared` when the server's draft went away under a saved copy. */
  | { take: "none"; cleared: boolean };

export function chooseDraft(
  local: LocalDraftMeta | null,
  server: ServerDraftMeta | null,
): DraftChoice {
  if (!local) return server ? { take: "server", notice: false } : { take: "none", cleared: false };
  if (!server) {
    if (local.dirty || local.base === null) return { take: "local", push: true };
    return { take: "none", cleared: true };
  }
  if (local.base === server.updatedAt) return { take: "local", push: local.dirty };
  if (!local.dirty) return { take: "server", notice: true };
  return Date.parse(server.updatedAt) > local.at
    ? { take: "server", notice: true }
    : { take: "local", push: true };
}

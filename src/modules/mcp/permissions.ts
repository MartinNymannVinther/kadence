/**
 * What a person lets their own assistant do (docs/adr/0120): switches the
 * person sets on the consent page and under Indstillinger → AI-forbindelser,
 * one connection at a time. Reading is on from the start; writing and
 * deleting are off until the person turns them on. A switch never reaches
 * beyond what the person may do in Kadence themselves, and never another
 * person's data. Whatever an assistant writes or deletes can be undone for
 * 30 days (src/modules/mcp/ai-actions.ts): that part is no switch. Pure.
 */

export const READ_PERMISSIONS = [
  "read_sessions",
  "read_rides",
  "read_checkins",
  "read_form",
  "read_season",
] as const;

export const WRITE_PERMISSIONS = [
  "write_checkin",
  "write_ride_feedback",
  "write_move_skip",
  "write_sessions",
] as const;

export const DELETE_PERMISSIONS = [
  "delete_sessions",
  "delete_manual",
  "delete_rides",
  "delete_checkins",
] as const;

export const PERMISSIONS = [
  ...READ_PERMISSIONS,
  ...WRITE_PERMISSIONS,
  ...DELETE_PERMISSIONS,
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** A new connection: everything it can read, nothing it can change. */
export const DEFAULT_PERMISSIONS: readonly Permission[] = READ_PERMISSIONS;

export const PERMISSION_GROUPS = [
  { key: "read", permissions: READ_PERMISSIONS },
  { key: "write", permissions: WRITE_PERMISSIONS },
  { key: "delete", permissions: DELETE_PERMISSIONS },
] as const;

export const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

/** Only known switches, each once, in their own order. */
export function cleanPermissions(values: readonly string[]): Permission[] {
  const wanted = new Set(values);
  return PERMISSIONS.filter((p) => wanted.has(p));
}

/** How long an assistant's change can be undone. */
export const UNDO_DAYS = 30;

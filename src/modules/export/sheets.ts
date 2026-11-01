/**
 * The names the export's sheets share with the pages and the stream, and
 * the tables the export leaves out on purpose, with why. Split from
 * tables.ts, which lists what goes in; tables.ts re-exports these names.
 */

/**
 * The audit trail, last and on its own: it is the one table that grows
 * with every change, so it is read in pages of AUDIT_PAGE rows rather
 * than at once (service.ts). The spreadsheet holds the newest
 * AUDIT_SHEET_ROWS of it; the JSON export holds all of it.
 */
export const AUDIT_SHEET = "Revisionsspor";
export const AUDIT_COLUMNS =
  "id, org_id, actor_user_id, actor_type, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent, created_at";
export const AUDIT_PAGE = 5_000;
export const AUDIT_SHEET_ROWS = 10_000;

/** The column names in a `columns` list, unquoted. */
export function columnNames(columns: string): string[] {
  return columns.split(",").map((column) => column.trim().replaceAll('"', ""));
}

/**
 * Left out on purpose:
 *
 * - `activity_files`: the original FIT files. They are binary and do not
 *   belong in a spreadsheet; they come out as their own download, a ZIP
 *   with a folder per rider ("Hent dine filer", files.ts, ADR 0084).
 *   `streams`, the samples thinned from them, is left out for the same
 *   reason.
 * - `device_links`: sealed tokens for Wahoo and Garmin — credentials, not
 *   data a team owns.
 * - `device_inbox`: a ride's file between Garmin's download and the
 *   import (docs/adr/0113); once imported it is in `activity_files`.
 * - `device_workouts`: Garmin's ids for the sessions Kadence put on a
 *   rider's Garmin calendar, and a hash of what was sent (docs/adr/0114)
 *   — a copy kept so it can be changed and taken off again, not data a
 *   team made. The sessions are in "Pas", and each send is in the audit
 *   trail.
 * - `upload_keys`: the hashes of riders' upload keys (ADR 0029) —
 *   credentials again. That a key was made, used and removed is in the
 *   audit trail, without the hash.
 * - `password_resets`: the record that a coach made a link for a new
 *   password (ADR 0032). It is about accounts, not training, and the audit
 *   trail, which is exported, holds every one of them.
 * - `push_subscriptions`: a browser's push address for reminders (ADR
 *   0060) — a capability that could wake that browser, owned by the person
 *   rather than the team, and nothing about training. That reminders were
 *   turned on and off is in the audit trail, without the address. Nor
 *   `push_runs`, the run's marks beside it: when a reminder went out.
 * - `mail_preferences`: whether a parent has chosen the week by mail too,
 *   and in which language (ADR 0086). The person's own choice, which the
 *   policy shows to nobody else, the coach exporting included, and nothing
 *   about training. That it was turned on and off is in the audit trail.
 * - `planned_session_deletions`: a deleted session's day and title, kept
 *   for seven days so a rider's reminder can say the plan changed (ADR
 *   0060, drizzle/0037). The deletion itself, and this record of it, are
 *   in the audit trail, which is exported.
 * - `ai_calls`: a counter for the ceilings and the month's AI budget, with
 *   tokens and cost (ADR 0089) — metering, no content, not something a
 *   workspace owns.
 * - `price_plans`: the installation's prices (ADR 0090), not a workspace's.
 * - `workspace_llm_settings`: the model choice, which holds an encrypted
 *   key; a workspace that leaves gets its data, not its secrets.
 * - Everything Better Auth owns (users, sessions, accounts, passkeys, two
 *   factors, rate limits). Sessions and passkeys are credentials, and the
 *   people are exported as members below rather than as auth rows.
 * - `access_requests` and `access_invitations`: they belong to the
 *   installation, not to any workspace, and describe people who are not
 *   users of it. The application role cannot read them anyway.
 * - Trænerrummet's threads, replies, reports and read markers (ADR 0052):
 *   they belong to the installation's room, not to a workspace, and a
 *   club's export would otherwise carry other clubs' coaches' words.
 */
export const MEMBERS_SHEET = "Brugere";

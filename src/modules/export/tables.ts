/**
 * What a full export contains, and what it deliberately leaves out.
 *
 * The list is written by hand rather than derived from the schema, because
 * "everything in the database" is the wrong answer twice over: it would
 * carry secrets out of the system, and it would silently start including
 * whatever table someone adds next. A new table appears in the export when
 * a person decides it should, which is the same discipline the tenancy
 * checklist asks for.
 *
 * Order matters: it is the order of the tabs in the spreadsheet, and it
 * runs from the things a person recognizes (the riders) toward the
 * technical ones (audit trail).
 */

export type ExportTable = {
  /** Database table, from this fixed list and never from user input. */
  table: string;
  /** Tab name in the spreadsheet, and key in the JSON export. */
  sheet: string;
  /** Columns never written out, whatever they contain. */
  redact?: string[];
  /** Column to sort by; falls back to the primary key's insertion order. */
  orderBy?: string;
};

export const EXPORT_TABLES: ExportTable[] = [
  { table: "riders", sheet: "Ryttere", orderBy: "name" },
  { table: "guardians", sheet: "Forældre", orderBy: "rider_id, name" },
  { table: "planned_sessions", sheet: "Pas", orderBy: "rider_id, on_date, sort" },
  {
    table: "activities",
    sheet: "Aktiviteter",
    orderBy: "rider_id, started_at",
    redact: ["streams"],
  },
  { table: "checkins", sheet: "Check-ins", orderBy: "rider_id, on_date" },
  { table: "rider_measurements", sheet: "Målinger", orderBy: "rider_id, measured_on" },
  { table: "rider_goals", sheet: "Mål", orderBy: "rider_id, starts_on" },
  { table: "calendar_events", sheet: "Kalender", orderBy: "starts_on" },
  { table: "comments", sheet: "Kommentarer", orderBy: "rider_id, created_at" },
  { table: "season_plans", sheet: "Sæsonplaner", orderBy: "rider_id, season_start_year" },
  { table: "workout_templates", sheet: "Skabeloner", orderBy: "sport, name" },
  { table: "training_blocks", sheet: "Blokke", orderBy: "name" },
  { table: "training_block_items", sheet: "Blokkens pas", orderBy: "block_id, day, sort" },
  { table: "team_settings", sheet: "Indstillinger" },
  { table: "audit_log", sheet: "Revisionsspor", orderBy: "created_at" },
];

/**
 * Left out on purpose:
 *
 * - `activity_files`: the original FIT files. They are binary and belong
 *   in the rider's own download of an activity, not in a spreadsheet;
 *   `streams` is left out of the sheet for the same reason.
 * - `device_links`: sealed tokens for Wahoo and Garmin — credentials, not
 *   data a team owns.
 * - `ai_calls`: a counter for rate limiting, not something a workspace owns.
 * - `workspace_llm_settings`: the model choice, which holds an encrypted
 *   key; a workspace that leaves gets its data, not its secrets.
 * - Everything Better Auth owns (users, sessions, accounts, passkeys, two
 *   factors, rate limits). Sessions and passkeys are credentials, and the
 *   people are exported as members below rather than as auth rows.
 * - `access_requests` and `access_invitations`: they belong to the
 *   installation, not to any workspace, and describe people who are not
 *   users of it. The application role cannot read them anyway.
 */
export const MEMBERS_SHEET = "Brugere";

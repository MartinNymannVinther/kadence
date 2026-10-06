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
  { table: "flag_resolutions", sheet: "Afklaret", orderBy: "rider_id, week_monday, kind" },
  { table: "calendar_events", sheet: "Kalender", orderBy: "starts_on" },
  { table: "race_results", sheet: "Løbsresultater", orderBy: "rider_id, raced_on" },
  { table: "comments", sheet: "Kommentarer", orderBy: "rider_id, created_at" },
  { table: "season_plans", sheet: "Sæsonplaner", orderBy: "rider_id, season_start_year" },
  { table: "workout_templates", sheet: "Skabeloner", orderBy: "sport, name" },
  { table: "training_blocks", sheet: "Blokke", orderBy: "name" },
  { table: "training_block_items", sheet: "Blokkens pas", orderBy: "block_id, day, sort" },
  { table: "team_settings", sheet: "Indstillinger" },
  // The club championship (ADR 0051): the club's own seasons, rounds,
  // results and roll of honour.
  { table: "club_championships", sheet: "Klubmesterskaber", orderBy: "season" },
  { table: "club_championship_rounds", sheet: "Afdelinger", orderBy: "held_on" },
  { table: "club_championship_entries", sheet: "Resultater", orderBy: "round_id, class" },
  { table: "club_champions", sheet: "Klubmestre", orderBy: "year, class" },
  // The club's logo and picture (ADR 0048): which, what type, how big,
  // who and when. The image itself does not fit a spreadsheet cell; it is
  // one click away under Settings → Workspace, and the club has the file.
  { table: "org_images", sheet: "Logo og billede", orderBy: "kind", redact: ["bytes"] },
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
 * - `upload_keys`: the hashes of riders' upload keys (ADR 0029) —
 *   credentials again. That a key was made, used and removed is in the
 *   audit trail, without the hash.
 * - `password_resets`: the record that a coach made a link for a new
 *   password (ADR 0032). It is about accounts, not training, and the audit
 *   trail, which is exported, holds every one of them.
 * - `push_subscriptions`: a browser's push address for reminders (ADR
 *   0060) — a capability that could wake that browser, owned by the person
 *   rather than the team, and nothing about training. That reminders were
 *   turned on and off is in the audit trail, without the address.
 * - `ai_calls`: a counter for rate limiting, not something a workspace owns.
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

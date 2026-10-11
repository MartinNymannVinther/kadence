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
 * technical ones; the audit trail comes last, below.
 */

export type ExportTable = {
  /** Database table, from this fixed list and never from user input. */
  table: string;
  /** Tab name in the spreadsheet, and key in the JSON export. */
  sheet: string;
  /**
   * The columns written out, in this order. Named rather than `select *`,
   * so a column added later is out until a person adds it here, and a
   * heavy column is never read at all. tests/export/columns holds every
   * column of the table to this list or to `redact`.
   */
  columns: string;
  /**
   * Columns never written out, whatever they contain: left out of
   * `columns`, and dropped again if one ever slips in.
   */
  redact?: string[];
  /** Column to sort by; falls back to the primary key's insertion order. */
  orderBy?: string;
};

export const EXPORT_TABLES: ExportTable[] = [
  {
    table: "riders",
    sheet: "Ryttere",
    orderBy: "name",
    columns:
      "id, org_id, user_id, invitation_id, name, birth_year, sex, category_override, ftp_watts, threshold_hr, max_hr, resting_hr, thresholds_on, share_training, share_wellbeing, archived, created_at, updated_at, uci_id, races_checked_at, races_error",
  },
  {
    table: "guardians",
    sheet: "Forældre",
    orderBy: "rider_id, name",
    columns:
      "id, org_id, rider_id, user_id, invitation_id, name, relation, confirmed_at, confirmed_as_adult, created_at, updated_at",
  },
  {
    table: "planned_sessions",
    sheet: "Pas",
    orderBy: "rider_id, on_date, sort",
    columns:
      "id, org_id, rider_id, on_date, sort, sport, title, description, structure, planned_minutes, planned_load, planned_km, template_id, programme_session, group_key, origin, activity_id, created_by, created_at, updated_at, series_key, start_time, meeting_place, updated_by",
  },
  {
    // The thinned samples behind the charts are not read: they are large,
    // and the original file is in "Hent dine filer" (ADR 0084).
    table: "activities",
    sheet: "Aktiviteter",
    orderBy: "rider_id, started_at",
    columns:
      "id, org_id, rider_id, started_at, on_date, sport, title, moving_seconds, elapsed_seconds, distance_m, ascent_m, avg_power, weighted_power, max_power, avg_hr, max_hr, avg_cadence, work_kj, zone_seconds, best_powers, rpe, feel, load, load_method, source, external_id, note, created_by, created_at, updated_at, max_speed, hr_drift, laps, climbs, upload_key_id",
    redact: ["streams"],
  },
  {
    table: "checkins",
    sheet: "Check-ins",
    orderBy: "rider_id, on_date",
    columns:
      "id, org_id, rider_id, on_date, sleep_hours, sleep_quality, energy, mood, soreness, stress, pain, pain_where, ill, note, created_at, updated_at, red_since",
  },
  {
    table: "rider_measurements",
    sheet: "Målinger",
    orderBy: "rider_id, measured_on",
    columns:
      "id, org_id, rider_id, measured_on, kind, value, note, created_by, created_at, updated_at",
  },
  {
    table: "rider_goals",
    sheet: "Mål",
    orderBy: "rider_id, starts_on",
    columns:
      "id, org_id, rider_id, title, kind, target, starts_on, ends_on, min_hours, progress, source, note, created_by, created_at, updated_at",
  },
  {
    table: "flag_resolutions",
    sheet: "Afklaret",
    orderBy: "rider_id, week_monday, kind",
    columns:
      "id, org_id, rider_id, kind, severity, week_monday, seen, note, resolved_by, created_at, updated_at",
  },
  {
    table: "calendar_events",
    sheet: "Kalender",
    orderBy: "starts_on",
    columns:
      "id, org_id, rider_id, kind, title, starts_on, ends_on, priority, note, created_by, created_at, updated_at, source, start_time, meeting_place, transport_note",
  },
  {
    table: "race_results",
    sheet: "Løbsresultater",
    orderBy: "rider_id, raced_on",
    columns:
      "id, org_id, rider_id, event_id, source, source_ref, race, discipline, race_class, raced_on, place, place_note, result_url, created_at, updated_at",
  },
  {
    table: "comments",
    sheet: "Kommentarer",
    orderBy: "rider_id, created_at",
    columns:
      "id, org_id, rider_id, author_id, planned_session_id, activity_id, on_date, body, created_at, updated_at",
  },
  {
    table: "season_plans",
    sheet: "Sæsonplaner",
    orderBy: "rider_id, season_start_year",
    columns: "id, org_id, rider_id, season_start_year, basis, months, note, created_at, updated_at",
  },
  {
    table: "workout_templates",
    sheet: "Skabeloner",
    orderBy: "sport, name",
    columns:
      "id, org_id, name, sport, description, structure, planned_minutes, source, source_key, archived, created_by, created_at, updated_at, rider_id, copied_from",
  },
  {
    table: "training_blocks",
    sheet: "Forløb",
    orderBy: "name",
    columns: "id, org_id, name, description, weeks, archived, created_by, created_at, updated_at",
  },
  {
    table: "training_block_items",
    sheet: "Forløbets pas",
    orderBy: "block_id, day, sort",
    columns:
      "id, org_id, block_id, template_id, day, sort, sport, title, description, structure, planned_minutes, start_time, meeting_place",
  },
  // The week planner's drafts the coaches share (ADR 0043, amended
  // 2026-10-07): weeks being planned and not yet laid in, as JSON in a cell.
  {
    table: "week_plan_drafts",
    sheet: "Ugekladder",
    orderBy: "week_monday, rider_id",
    columns: "id, org_id, week_monday, rider_id, payload, updated_by, created_at, updated_at",
  },
  // The team's own exercises and programmes (drizzle/0032), archived ones
  // included. A pose, a dose and a programme's parts are JSON in a cell;
  // the JSON export keeps them as they are, references and all.
  {
    table: "team_exercises",
    sheet: "Øvelser",
    orderBy: "name, created_at",
    columns:
      'id, org_id, name, "group", equipment, dose, how, why, pose, archived, created_by, created_at, updated_at',
  },
  {
    table: "team_programs",
    sheet: "Øvelsesprogrammer",
    orderBy: "name, created_at",
    columns: "id, org_id, name, description, parts, archived, created_by, created_at, updated_at",
  },
  {
    table: "team_settings",
    sheet: "Indstillinger",
    columns:
      "id, org_id, team_kind, ai_on_rider_data, allow_youth_weight, updated_by, created_at, updated_at, guidance, club_championship, low_intensity_first, ai_budget_micro",
  },
  // The club championship (ADR 0051): the club's own seasons, rounds,
  // results and roll of honour.
  {
    table: "club_championships",
    sheet: "Klubmesterskaber",
    orderBy: "season",
    columns: "id, org_id, season, title, points, created_by, created_at, updated_at",
  },
  {
    table: "club_championship_rounds",
    sheet: "Afdelinger",
    orderBy: "held_on",
    columns:
      "id, org_id, championship_id, held_on, kind, title, measure, event_id, created_at, updated_at",
  },
  {
    table: "club_championship_entries",
    sheet: "Resultater",
    orderBy: "round_id, class",
    columns:
      "id, org_id, round_id, rider_id, name, class, time_ms, place, status, created_at, updated_at",
  },
  {
    table: "club_champions",
    sheet: "Klubmestre",
    orderBy: "year, class",
    columns: "id, org_id, year, class, title, rider_id, name, note, created_at, updated_at",
  },
  // What a person agreed to when they created their own workspace, and
  // when they withdrew it (ADR 0088). The policy shows each person their
  // own rows only, so a club's export has none and a person's has theirs.
  {
    table: "consents",
    sheet: "Samtykker",
    orderBy: "given_at",
    columns: "id, org_id, user_id, rider_id, kind, given_at, withdrawn_at, version, locale",
  },
  // The club's logo and picture (ADR 0048): which, what type, how big,
  // who and when. The image itself does not fit a spreadsheet cell; it is
  // one click away under Settings → Workspace, and the club has the file.
  {
    table: "org_images",
    sheet: "Logo og billede",
    orderBy: "kind",
    columns: "org_id, kind, mime, width, height, updated_by, updated_at",
    redact: ["bytes"],
  },
];

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

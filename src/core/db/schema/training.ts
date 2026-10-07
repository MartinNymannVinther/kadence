import { sql } from "drizzle-orm";
import {
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { riders, workoutTemplates } from "./team";
import { tenant, timestamps } from "./shared";

/**
 * The training: what was planned, what was done, what else is in the
 * calendar, and the conversation about it. How the rider felt is in
 * wellbeing.ts and the links to their devices in devices.ts. Every row
 * belongs to one rider (the calendar's team events excepted) and is read
 * under the rider policies in drizzle/0003.
 */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * A session on the calendar. Copied from a template, drafted by the AI and
 * accepted by a coach, written by hand, or laid on a whole group at once
 * (`group_key`, the same on every copy, so the coach can change them
 * together). `activity_id` is the ride or session that fulfilled it.
 */
export const plannedSessions = pgTable(
  "planned_sessions",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    onDate: date("on_date").notNull(),
    sort: smallint("sort").notNull().default(0),
    /** bike | strength | other */
    sport: text("sport").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    structure: jsonb("structure")
      .notNull()
      .default(sql`'{"steps":[]}'::jsonb`),
    plannedMinutes: smallint("planned_minutes").notNull().default(0),
    plannedLoad: smallint("planned_load"),
    plannedKm: smallint("planned_km"),
    /**
     * When and where it starts, for a session ridden together: "17.30 fra
     * klubhuset" (docs/adr/0058). Both optional; a session alone has neither.
     */
    startTime: time("start_time"),
    meetingPlace: text("meeting_place").notNull().default(""),
    templateId: text("template_id").references(() => workoutTemplates.id, {
      onDelete: "set null",
    }),
    /** For a strength programme: which session in it this is (1-based). */
    programmeSession: smallint("programme_session"),
    groupKey: text("group_key"),
    /**
     * The copies made by one "Gentag" (ADR 0041): the same session on chosen
     * weekdays over a period, for one or more riders, changed or removed
     * together from a day onwards.
     */
    seriesKey: text("series_key"),
    /** template | ai | manual | group */
    origin: text("origin").notNull().default("manual"),
    activityId: text("activity_id").references(() => activities.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    /**
     * Who last changed it: stamped by the database from the caller's
     * context whenever the app writes the row (drizzle/0035), so no path
     * can leave it out or name somebody else. Null for a session last
     * written before; who laid it stands in (docs/adr/0060).
     */
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("planned_sessions_rider_date_idx").on(t.orgId, t.riderId, t.onDate),
    index("planned_sessions_group_idx").on(t.orgId, t.groupKey),
    index("planned_sessions_series_idx").on(t.orgId, t.seriesKey),
    check("planned_sessions_meeting_place", sql`char_length(${t.meetingPlace}) <= 120`),
    uniqueIndex("planned_sessions_activity_uq")
      .on(t.activityId)
      .where(sql`${t.activityId} is not null`),
    check("planned_sessions_sport", sql`${t.sport} in ('bike','strength','other')`),
    check("planned_sessions_origin", sql`${t.origin} in ('template','ai','manual','group')`),
    check("planned_sessions_minutes", sql`${t.plannedMinutes} between 0 and 1440`),
  ],
);

/**
 * Something the rider did: a ride from a FIT file or a device, or a
 * session entered by hand. The summary numbers are computed once on the
 * way in (src/modules/load, src/modules/fit); `streams` is a thinned copy
 * of the samples for the charts, and the file itself lives beside it in
 * `activity_files` so it can be read again by a better parser.
 */
export const activities = pgTable(
  "activities",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    /** The day in Copenhagen the activity counts on. */
    onDate: date("on_date").notNull(),
    /** bike | strength | other */
    sport: text("sport").notNull(),
    title: text("title").notNull().default(""),
    movingSeconds: integer("moving_seconds").notNull(),
    elapsedSeconds: integer("elapsed_seconds"),
    distanceM: integer("distance_m"),
    ascentM: integer("ascent_m"),
    avgPower: smallint("avg_power"),
    weightedPower: smallint("weighted_power"),
    maxPower: smallint("max_power"),
    avgHr: smallint("avg_hr"),
    maxHr: smallint("max_hr"),
    avgCadence: smallint("avg_cadence"),
    /** The fastest second, m/s. */
    maxSpeed: real("max_speed"),
    /** Heart-rate drift in per cent, first half against second (src/modules/load/drift.ts). */
    hrDrift: real("hr_drift"),
    workKj: integer("work_kj"),
    /** { power: [s per zone], hr: [s per zone] } */
    zoneSeconds: jsonb("zone_seconds"),
    /** { "1": w, "5": w, … } — the power curve, best mean power by duration in seconds. */
    bestPowers: jsonb("best_powers"),
    /** Thinned samples for the charts and the route: { t, power, hr, cadence, speed, alt, lat, lon } */
    streams: jsonb("streams"),
    /** The device's laps, measured on the ride (src/modules/fit/laps.ts). */
    laps: jsonb("laps"),
    /** The climbs found in the altitude (src/modules/fit/climbs.ts). */
    climbs: jsonb("climbs"),
    /** Session RPE, 1–10, from the rider afterwards. */
    rpe: smallint("rpe"),
    /** How it felt, 1–5. */
    feel: smallint("feel"),
    load: real("load"),
    /** power | hr | rpe | none — which model gave `load` (src/modules/load). */
    loadMethod: text("load_method").notNull().default("none"),
    /** fit | wahoo | garmin | polar | manual */
    source: text("source").notNull(),
    externalId: text("external_id"),
    /**
     * The upload key a ride came in with (ADR 0029), kept after the key is
     * gone: what tells a rider which rides a key that went astray added.
     */
    uploadKeyId: text("upload_key_id"),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("activities_rider_date_idx").on(t.orgId, t.riderId, t.onDate),
    uniqueIndex("activities_external_uq")
      .on(t.riderId, t.source, t.externalId)
      .where(sql`${t.externalId} is not null`),
    check("activities_sport", sql`${t.sport} in ('bike','strength','other')`),
    check("activities_source", sql`${t.source} in ('fit','wahoo','garmin','polar','manual')`),
    check("activities_load_method", sql`${t.loadMethod} in ('power','hr','rpe','none')`),
    check("activities_rpe", sql`${t.rpe} is null or ${t.rpe} between 1 and 10`),
    check("activities_feel", sql`${t.feel} is null or ${t.feel} between 1 and 5`),
    check("activities_seconds", sql`${t.movingSeconds} between 0 and 172800`),
  ],
);

/** The original file behind an activity, kept so it can be parsed again. */
export const activityFiles = pgTable(
  "activity_files",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .unique()
      .references(() => activities.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    sha256: text("sha256").notNull(),
    bytes: bytea("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("activity_files_rider_sha_uq").on(t.riderId, t.sha256)],
);

/**
 * Everything else in the calendar: races, school, exams, camps, holidays,
 * illness. Without a rider it is the team's and every member sees it.
 */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id").references(() => riders.id, { onDelete: "cascade" }),
    /** race | exam | school | camp | holiday | ill | other */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    /** A race's priority: A | B | C. */
    priority: text("priority"),
    note: text("note").notNull().default(""),
    /** Where the event came from when no person typed it: "dcu", a race read from Cykling Danmark (docs/adr/0039). */
    source: text("source"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("calendar_events_org_dates_idx").on(t.orgId, t.startsOn),
    check("calendar_events_source", sql`${t.source} is null or ${t.source} = 'dcu'`),
    check(
      "calendar_events_kind",
      sql`${t.kind} in ('race','exam','school','camp','holiday','ill','other')`,
    ),
    check("calendar_events_dates", sql`${t.endsOn} >= ${t.startsOn}`),
    check("calendar_events_priority", sql`${t.priority} is null or ${t.priority} in ('A','B','C')`),
  ],
);

/**
 * The conversation about a rider's training: on a planned session, on an
 * activity, or on a day. Coach, rider and the rider's guardians read the
 * same thread; there are no private threads between an adult and a young
 * rider (docs/adr/0012).
 */
export const comments = pgTable(
  "comments",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    plannedSessionId: text("planned_session_id").references(() => plannedSessions.id, {
      onDelete: "cascade",
    }),
    activityId: text("activity_id").references(() => activities.id, { onDelete: "cascade" }),
    onDate: date("on_date"),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [
    index("comments_rider_idx").on(t.orgId, t.riderId, t.createdAt),
    check(
      "comments_target",
      sql`num_nonnulls(${t.plannedSessionId}, ${t.activityId}, ${t.onDate}) = 1`,
    ),
    check("comments_length", sql`char_length(${t.body}) between 1 and 4000`),
  ],
);

export type PlannedSessionRow = typeof plannedSessions.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type CalendarEventRow = typeof calendarEvents.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;

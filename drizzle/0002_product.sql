CREATE TABLE "guardians" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"user_id" text,
	"invitation_id" text,
	"name" text NOT NULL,
	"relation" text DEFAULT 'guardian' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_as_adult" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_measurements" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"measured_on" date NOT NULL,
	"kind" text NOT NULL,
	"value" numeric(7, 2) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rider_measurements_kind" CHECK ("rider_measurements"."kind" in ('height_cm','weight_kg','ftp_w','threshold_hr','max_hr','resting_hr'))
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"invitation_id" text,
	"name" text NOT NULL,
	"birth_year" smallint NOT NULL,
	"sex" text,
	"category_override" text,
	"ftp_watts" smallint,
	"threshold_hr" smallint,
	"max_hr" smallint,
	"resting_hr" smallint,
	"thresholds_on" date,
	"share_training" boolean DEFAULT true NOT NULL,
	"share_wellbeing" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "riders_birth_year" CHECK ("riders"."birth_year" between 1940 and 2100),
	CONSTRAINT "riders_sex" CHECK ("riders"."sex" is null or "riders"."sex" in ('female','male')),
	CONSTRAINT "riders_category" CHECK ("riders"."category_override" is null or "riders"."category_override" in ('U17','U19','U23','senior'))
);
--> statement-breakpoint
CREATE TABLE "season_plans" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"season_start_year" integer NOT NULL,
	"basis" text NOT NULL,
	"months" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_settings" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"team_kind" text DEFAULT 'mixed' NOT NULL,
	"ai_on_rider_data" boolean DEFAULT false NOT NULL,
	"allow_youth_weight" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_settings_org_id_unique" UNIQUE("org_id"),
	CONSTRAINT "team_settings_kind" CHECK ("team_settings"."team_kind" in ('U17','U19','U23','mixed'))
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"sport" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"structure" jsonb NOT NULL,
	"planned_minutes" smallint DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'own' NOT NULL,
	"source_key" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_templates_sport" CHECK ("workout_templates"."sport" in ('bike','strength','other')),
	CONSTRAINT "workout_templates_source" CHECK ("workout_templates"."source" in ('dcu','own')),
	CONSTRAINT "workout_templates_minutes" CHECK ("workout_templates"."planned_minutes" between 0 and 1440)
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"on_date" date NOT NULL,
	"sport" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"moving_seconds" integer NOT NULL,
	"elapsed_seconds" integer,
	"distance_m" integer,
	"ascent_m" integer,
	"avg_power" smallint,
	"weighted_power" smallint,
	"max_power" smallint,
	"avg_hr" smallint,
	"max_hr" smallint,
	"avg_cadence" smallint,
	"work_kj" integer,
	"zone_seconds" jsonb,
	"best_powers" jsonb,
	"streams" jsonb,
	"rpe" smallint,
	"feel" smallint,
	"load" real,
	"load_method" text DEFAULT 'none' NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_sport" CHECK ("activities"."sport" in ('bike','strength','other')),
	CONSTRAINT "activities_source" CHECK ("activities"."source" in ('fit','wahoo','garmin','manual')),
	CONSTRAINT "activities_load_method" CHECK ("activities"."load_method" in ('power','hr','rpe','none')),
	CONSTRAINT "activities_rpe" CHECK ("activities"."rpe" is null or "activities"."rpe" between 1 and 10),
	CONSTRAINT "activities_feel" CHECK ("activities"."feel" is null or "activities"."feel" between 1 and 5),
	CONSTRAINT "activities_seconds" CHECK ("activities"."moving_seconds" between 0 and 172800)
);
--> statement-breakpoint
CREATE TABLE "activity_files" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"file_name" text NOT NULL,
	"sha256" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_files_activity_id_unique" UNIQUE("activity_id")
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"priority" text,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_kind" CHECK ("calendar_events"."kind" in ('race','exam','school','camp','holiday','ill','other')),
	CONSTRAINT "calendar_events_dates" CHECK ("calendar_events"."ends_on" >= "calendar_events"."starts_on"),
	CONSTRAINT "calendar_events_priority" CHECK ("calendar_events"."priority" is null or "calendar_events"."priority" in ('A','B','C'))
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"on_date" date NOT NULL,
	"sleep_hours" numeric(3, 1),
	"sleep_quality" smallint,
	"energy" smallint,
	"mood" smallint,
	"soreness" smallint,
	"stress" smallint,
	"pain" smallint DEFAULT 0 NOT NULL,
	"pain_where" text DEFAULT '' NOT NULL,
	"ill" smallint DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_scales" CHECK (coalesce("checkins"."sleep_quality",3) between 1 and 5 and coalesce("checkins"."energy",3) between 1 and 5
        and coalesce("checkins"."mood",3) between 1 and 5 and coalesce("checkins"."soreness",3) between 1 and 5
        and coalesce("checkins"."stress",3) between 1 and 5),
	CONSTRAINT "checkins_pain" CHECK ("checkins"."pain" between 0 and 3),
	CONSTRAINT "checkins_ill" CHECK ("checkins"."ill" between 0 and 1),
	CONSTRAINT "checkins_sleep" CHECK ("checkins"."sleep_hours" is null or "checkins"."sleep_hours" between 0 and 24)
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"author_id" text,
	"planned_session_id" text,
	"activity_id" text,
	"on_date" date,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_target" CHECK (num_nonnulls("comments"."planned_session_id", "comments"."activity_id", "comments"."on_date") = 1),
	CONSTRAINT "comments_length" CHECK (char_length("comments"."body") between 1 and 4000)
);
--> statement-breakpoint
CREATE TABLE "device_links" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_user_id" text NOT NULL,
	"access_token_sealed" text NOT NULL,
	"refresh_token_sealed" text,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_links_provider" CHECK ("device_links"."provider" in ('wahoo','garmin')),
	CONSTRAINT "device_links_status" CHECK ("device_links"."status" in ('connected','error','revoked'))
);
--> statement-breakpoint
CREATE TABLE "planned_sessions" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"on_date" date NOT NULL,
	"sort" smallint DEFAULT 0 NOT NULL,
	"sport" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"structure" jsonb DEFAULT '{"steps":[]}'::jsonb NOT NULL,
	"planned_minutes" smallint DEFAULT 0 NOT NULL,
	"planned_load" smallint,
	"planned_km" smallint,
	"template_id" text,
	"programme_session" smallint,
	"group_key" text,
	"origin" text DEFAULT 'manual' NOT NULL,
	"activity_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_sessions_sport" CHECK ("planned_sessions"."sport" in ('bike','strength','other')),
	CONSTRAINT "planned_sessions_origin" CHECK ("planned_sessions"."origin" in ('template','ai','manual','group')),
	CONSTRAINT "planned_sessions_minutes" CHECK ("planned_sessions"."planned_minutes" between 0 and 1440)
);
--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_measurements" ADD CONSTRAINT "rider_measurements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_measurements" ADD CONSTRAINT "rider_measurements_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_measurements" ADD CONSTRAINT "rider_measurements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_plans" ADD CONSTRAINT "season_plans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_plans" ADD CONSTRAINT "season_plans_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_settings" ADD CONSTRAINT "team_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_settings" ADD CONSTRAINT "team_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_files" ADD CONSTRAINT "activity_files_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_files" ADD CONSTRAINT "activity_files_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_files" ADD CONSTRAINT "activity_files_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_planned_session_id_planned_sessions_id_fk" FOREIGN KEY ("planned_session_id") REFERENCES "public"."planned_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_links" ADD CONSTRAINT "device_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_links" ADD CONSTRAINT "device_links_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guardians_org_rider_idx" ON "guardians" USING btree ("org_id","rider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_rider_user_uq" ON "guardians" USING btree ("rider_id","user_id") WHERE "guardians"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "rider_measurements_rider_idx" ON "rider_measurements" USING btree ("org_id","rider_id","measured_on");--> statement-breakpoint
CREATE UNIQUE INDEX "riders_org_user_uq" ON "riders" USING btree ("org_id","user_id") WHERE "riders"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "riders_org_idx" ON "riders" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "season_plans_rider_season_uq" ON "season_plans" USING btree ("rider_id","season_start_year");--> statement-breakpoint
CREATE INDEX "workout_templates_org_idx" ON "workout_templates" USING btree ("org_id","sport");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_templates_source_key_uq" ON "workout_templates" USING btree ("org_id","source_key") WHERE "workout_templates"."source_key" is not null;--> statement-breakpoint
CREATE INDEX "activities_rider_date_idx" ON "activities" USING btree ("org_id","rider_id","on_date");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_external_uq" ON "activities" USING btree ("rider_id","source","external_id") WHERE "activities"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_files_rider_sha_uq" ON "activity_files" USING btree ("rider_id","sha256");--> statement-breakpoint
CREATE INDEX "calendar_events_org_dates_idx" ON "calendar_events" USING btree ("org_id","starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_rider_date_uq" ON "checkins" USING btree ("rider_id","on_date");--> statement-breakpoint
CREATE INDEX "checkins_org_rider_idx" ON "checkins" USING btree ("org_id","rider_id","on_date");--> statement-breakpoint
CREATE INDEX "comments_rider_idx" ON "comments" USING btree ("org_id","rider_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "device_links_rider_provider_uq" ON "device_links" USING btree ("rider_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "device_links_external_uq" ON "device_links" USING btree ("provider","external_user_id");--> statement-breakpoint
CREATE INDEX "planned_sessions_rider_date_idx" ON "planned_sessions" USING btree ("org_id","rider_id","on_date");--> statement-breakpoint
CREATE INDEX "planned_sessions_group_idx" ON "planned_sessions" USING btree ("org_id","group_key");--> statement-breakpoint
CREATE UNIQUE INDEX "planned_sessions_activity_uq" ON "planned_sessions" USING btree ("activity_id") WHERE "planned_sessions"."activity_id" is not null;
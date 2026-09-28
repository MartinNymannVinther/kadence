CREATE TABLE "flag_resolutions" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"kind" text NOT NULL,
	"severity" text NOT NULL,
	"week_monday" date NOT NULL,
	"seen" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flag_resolutions_kind" CHECK ("flag_resolutions"."kind" in ('hours_above_corridor','hours_below_corridor','ramp','longest_ride','strength_spacing','compliance','wellbeing_talk','wellbeing_help','pain','sleep_short','sleep_below_minimum')),
	CONSTRAINT "flag_resolutions_severity" CHECK ("flag_resolutions"."severity" in ('info','warn','alert')),
	CONSTRAINT "flag_resolutions_monday" CHECK (extract(isodow from "flag_resolutions"."week_monday") = 1)
);
--> statement-breakpoint
ALTER TABLE "flag_resolutions" ADD CONSTRAINT "flag_resolutions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flag_resolutions" ADD CONSTRAINT "flag_resolutions_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flag_resolutions" ADD CONSTRAINT "flag_resolutions_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flag_resolutions_rider_kind_week_uq" ON "flag_resolutions" USING btree ("rider_id","kind","week_monday");--> statement-breakpoint
CREATE INDEX "flag_resolutions_org_week_idx" ON "flag_resolutions" USING btree ("org_id","week_monday");--> statement-breakpoint
-- A coach's "afklaret" on a guardrail flag (ADR 0026): the same security
-- as every table about a rider (drizzle/0003). Whoever may read the data
-- behind the flag reads the resolution: the flags computed from training
-- are named and read with the training scope; everything else — the
-- check-ins' pain, sleep and wellbeing, and any kind added later — is
-- health data and needs the wellbeing scope, so a guardian sees it only
-- when the rider shares wellbeing (ADR 0011). Only a coach writes: a
-- rider cannot wave their own warning away. Every change is audited.
GRANT SELECT, INSERT, UPDATE, DELETE ON "flag_resolutions" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "flag_resolutions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "flag_resolutions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_flag_resolutions ON "flag_resolutions" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND app_can_read_rider(
      rider_id,
      CASE WHEN kind IN ('hours_above_corridor', 'hours_below_corridor', 'ramp',
                         'longest_ride', 'strength_spacing', 'compliance')
        THEN 'training' ELSE 'wellbeing' END
    )
  );
--> statement-breakpoint
CREATE POLICY app_write_flag_resolutions ON "flag_resolutions" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach() AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE TRIGGER audit_flag_resolutions
  AFTER INSERT OR UPDATE OR DELETE ON "flag_resolutions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

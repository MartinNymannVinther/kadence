CREATE TABLE "rider_goals" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"target" numeric(7, 1) NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"min_hours" numeric(4, 1),
	"progress" smallint DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'own' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rider_goals_kind" CHECK ("rider_goals"."kind" in ('strength_sessions','bike_sessions','bike_hours','long_rides','manual')),
	CONSTRAINT "rider_goals_source" CHECK ("rider_goals"."source" in ('dcu','own')),
	CONSTRAINT "rider_goals_target" CHECK ("rider_goals"."target" > 0),
	CONSTRAINT "rider_goals_dates" CHECK ("rider_goals"."ends_on" >= "rider_goals"."starts_on"),
	CONSTRAINT "rider_goals_progress" CHECK ("rider_goals"."progress" >= 0)
);
--> statement-breakpoint
ALTER TABLE "rider_goals" ADD CONSTRAINT "rider_goals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_goals" ADD CONSTRAINT "rider_goals_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_goals" ADD CONSTRAINT "rider_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rider_goals_rider_idx" ON "rider_goals" USING btree ("org_id","rider_id","ends_on");--> statement-breakpoint
-- A rider's process goals (ADR 0024): the same security as every table
-- about a rider (drizzle/0003): the application role reads and writes,
-- RLS decides which rows — whoever may read the rider's training reads
-- them, the coach and the rider write — and every change is audited.
GRANT SELECT, INSERT, UPDATE, DELETE ON "rider_goals" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "rider_goals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rider_goals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_rider_goals ON "rider_goals" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_write_rider_goals ON "rider_goals" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_write_rider(rider_id))
  WITH CHECK (org_id = app_current_org_id() AND app_can_write_rider(rider_id));
--> statement-breakpoint
CREATE TRIGGER audit_rider_goals
  AFTER INSERT OR UPDATE OR DELETE ON "rider_goals"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

CREATE TABLE "club_champions" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"year" smallint NOT NULL,
	"class" text NOT NULL,
	"title" text NOT NULL,
	"rider_id" text,
	"name" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_champions_year" CHECK ("club_champions"."year" between 1900 and 2200),
	CONSTRAINT "club_champions_class" CHECK ("club_champions"."class" in ('U17','U19','U23','open')),
	CONSTRAINT "club_champions_title" CHECK (char_length("club_champions"."title") between 1 and 80),
	CONSTRAINT "club_champions_name" CHECK (char_length("club_champions"."name") between 1 and 120),
	CONSTRAINT "club_champions_note" CHECK (char_length("club_champions"."note") <= 300)
);
--> statement-breakpoint
CREATE TABLE "club_championship_entries" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"round_id" text NOT NULL,
	"rider_id" text,
	"name" text NOT NULL,
	"class" text NOT NULL,
	"time_ms" integer,
	"place" smallint,
	"status" text DEFAULT 'finished' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_entries_class" CHECK ("club_championship_entries"."class" in ('U17','U19','U23','open')),
	CONSTRAINT "club_entries_status" CHECK ("club_championship_entries"."status" in ('finished','dnf','dns')),
	CONSTRAINT "club_entries_name" CHECK (char_length("club_championship_entries"."name") between 1 and 120),
	CONSTRAINT "club_entries_time" CHECK ("club_championship_entries"."time_ms" is null or "club_championship_entries"."time_ms" between 1 and 86400000),
	CONSTRAINT "club_entries_place" CHECK ("club_championship_entries"."place" is null or "club_championship_entries"."place" between 1 and 999)
);
--> statement-breakpoint
CREATE TABLE "club_championship_rounds" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"championship_id" text NOT NULL,
	"held_on" date NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"measure" text NOT NULL,
	"event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_rounds_kind" CHECK ("club_championship_rounds"."kind" in ('tt','hill','road','crit','other')),
	CONSTRAINT "club_rounds_measure" CHECK ("club_championship_rounds"."measure" in ('time','place')),
	CONSTRAINT "club_rounds_title" CHECK (char_length("club_championship_rounds"."title") between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "club_championships" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"season" smallint NOT NULL,
	"title" text NOT NULL,
	"points" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_championships_season" CHECK ("club_championships"."season" between 1900 and 2200),
	CONSTRAINT "club_championships_title" CHECK (char_length("club_championships"."title") between 1 and 120)
);
--> statement-breakpoint
ALTER TABLE "team_settings" ADD COLUMN "club_championship" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "club_champions" ADD CONSTRAINT "club_champions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_champions" ADD CONSTRAINT "club_champions_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championship_entries" ADD CONSTRAINT "club_championship_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championship_entries" ADD CONSTRAINT "club_championship_entries_round_id_club_championship_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."club_championship_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championship_entries" ADD CONSTRAINT "club_championship_entries_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championship_rounds" ADD CONSTRAINT "club_championship_rounds_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championship_rounds" ADD CONSTRAINT "club_championship_rounds_championship_id_club_championships_id_fk" FOREIGN KEY ("championship_id") REFERENCES "public"."club_championships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championship_rounds" ADD CONSTRAINT "club_championship_rounds_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championships" ADD CONSTRAINT "club_championships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_championships" ADD CONSTRAINT "club_championships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_champions_org_idx" ON "club_champions" USING btree ("org_id","year");--> statement-breakpoint
CREATE INDEX "club_entries_round_idx" ON "club_championship_entries" USING btree ("org_id","round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "club_entries_round_rider_uq" ON "club_championship_entries" USING btree ("round_id","rider_id") WHERE "club_championship_entries"."rider_id" is not null;--> statement-breakpoint
CREATE INDEX "club_championship_rounds_idx" ON "club_championship_rounds" USING btree ("org_id","championship_id","held_on");--> statement-breakpoint
CREATE INDEX "club_championships_org_idx" ON "club_championships" USING btree ("org_id","season");--> statement-breakpoint
-- The club championship (ADR 0051). Everyone in the club reads it — the
-- standings are a board in the clubhouse, the one place riders and
-- parents see placings — and the coaches write it. A row names a rider
-- of this club only; an entry and a champion may also stand by name
-- alone, for a guest or a year before Kadence. Every change is audited.
GRANT SELECT, INSERT, UPDATE, DELETE ON "club_championships", "club_championship_rounds",
  "club_championship_entries", "club_champions" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "club_championships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_championships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_championship_rounds" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_championship_rounds" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_championship_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_championship_entries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_champions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_champions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_club_championships ON "club_championships" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_club_championships ON "club_championships" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint
CREATE POLICY app_read_club_championship_rounds ON "club_championship_rounds" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_club_championship_rounds ON "club_championship_rounds" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_is_coach()
    AND EXISTS (
      SELECT 1 FROM "club_championships" c
      WHERE c.id = club_championship_rounds.championship_id AND c.org_id = club_championship_rounds.org_id
    )
    AND (
      event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM "calendar_events" e
        WHERE e.id = club_championship_rounds.event_id AND e.org_id = club_championship_rounds.org_id
      )
    )
  );
--> statement-breakpoint
CREATE POLICY app_read_club_championship_entries ON "club_championship_entries" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_club_championship_entries ON "club_championship_entries" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_is_coach()
    AND EXISTS (
      SELECT 1 FROM "club_championship_rounds" r
      WHERE r.id = club_championship_entries.round_id AND r.org_id = club_championship_entries.org_id
    )
    AND (rider_id IS NULL OR app_can_write_rider(rider_id))
  );
--> statement-breakpoint
CREATE POLICY app_read_club_champions ON "club_champions" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_club_champions ON "club_champions" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_is_coach()
    AND (rider_id IS NULL OR app_can_write_rider(rider_id))
  );
--> statement-breakpoint
CREATE TRIGGER audit_club_championships
  AFTER INSERT OR UPDATE OR DELETE ON "club_championships"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_club_championship_rounds
  AFTER INSERT OR UPDATE OR DELETE ON "club_championship_rounds"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_club_championship_entries
  AFTER INSERT OR UPDATE OR DELETE ON "club_championship_entries"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_club_champions
  AFTER INSERT OR UPDATE OR DELETE ON "club_champions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

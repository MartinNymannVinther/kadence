CREATE TABLE "race_results" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"event_id" text NOT NULL,
	"source" text DEFAULT 'dcu' NOT NULL,
	"source_ref" text NOT NULL,
	"race" text NOT NULL,
	"discipline" text NOT NULL,
	"race_class" text NOT NULL,
	"raced_on" date NOT NULL,
	"place" smallint,
	"place_note" text DEFAULT '' NOT NULL,
	"result_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "race_results_source" CHECK ("race_results"."source" = 'dcu'),
	CONSTRAINT "race_results_ref" CHECK ("race_results"."source_ref" ~ '^[0-9]{1,10}:[0-9]{0,10}$'),
	CONSTRAINT "race_results_race" CHECK (char_length("race_results"."race") between 1 and 200),
	CONSTRAINT "race_results_discipline" CHECK (char_length("race_results"."discipline") between 1 and 40),
	CONSTRAINT "race_results_class" CHECK (char_length("race_results"."race_class") between 1 and 40),
	CONSTRAINT "race_results_place" CHECK ("race_results"."place" is null or "race_results"."place" between 1 and 9999),
	CONSTRAINT "race_results_place_note" CHECK (char_length("race_results"."place_note") <= 12),
	CONSTRAINT "race_results_url" CHECK ("race_results"."result_url" ~ '^https://www\.sportstiming\.dk/event/[0-9]{1,10}/results(\?round=[0-9]{1,10})?$')
);
--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "uci_id" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "races_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "races_error" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "race_results_rider_ref_uq" ON "race_results" USING btree ("rider_id","source","source_ref");--> statement-breakpoint
CREATE INDEX "race_results_rider_idx" ON "race_results" USING btree ("org_id","rider_id","raced_on");--> statement-breakpoint
CREATE INDEX "race_results_event_idx" ON "race_results" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "riders_org_uci_uq" ON "riders" USING btree ("org_id","uci_id") WHERE "riders"."uci_id" is not null;--> statement-breakpoint
ALTER TABLE "riders" ADD CONSTRAINT "riders_uci_id" CHECK ("riders"."uci_id" is null or "riders"."uci_id" ~ '^[0-9]{11}$');--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_source" CHECK ("calendar_events"."source" is null or "calendar_events"."source" = 'dcu');
--> statement-breakpoint
-- A rider's results from Cykling Danmark (ADR 0039). The race they hang
-- on is an ordinary calendar event and follows the calendar's rules; the
-- placing is for the coach. A coach reads and writes it — Kadence writes
-- it as the coach who asked, never as anyone else — and the rider reads
-- their own, because it is about them and belongs in their export
-- (ADR 0011). No guardian and no teammate sees one. A result names a
-- race in the same team that is the rider's own or the team's, never
-- another rider's and never another team's. Every change is audited.
GRANT SELECT, INSERT, UPDATE, DELETE ON "race_results" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "race_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "race_results" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_race_results ON "race_results" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND (app_is_coach() OR app_is_rider_self(rider_id)));
--> statement-breakpoint
CREATE POLICY app_write_race_results ON "race_results" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach() AND app_can_write_rider(rider_id))
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_is_coach()
    AND app_can_write_rider(rider_id)
    AND EXISTS (
      SELECT 1 FROM "calendar_events" e
      WHERE e.id = race_results.event_id
        AND e.org_id = race_results.org_id
        AND e.kind = 'race'
        AND (e.rider_id IS NULL OR e.rider_id = race_results.rider_id)
    )
  );
--> statement-breakpoint
CREATE TRIGGER audit_race_results
  AFTER INSERT OR UPDATE OR DELETE ON "race_results"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint

-- The UCI ID is the coach's to set, like the name and the class: a rider
-- changes their thresholds and their sharing and nothing else of their
-- own row (drizzle/0007). The same is true of when the races were last
-- read. The function is 0007's, with those three columns added.
CREATE OR REPLACE FUNCTION riders_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_user text := app_current_user_id();
  v_self boolean;
BEGIN
  IF v_user IS NULL THEN
    RETURN NEW;
  END IF;
  v_self := OLD.user_id IS NOT DISTINCT FROM v_user;
  IF (NEW.share_training IS DISTINCT FROM OLD.share_training
      OR NEW.share_wellbeing IS DISTINCT FROM OLD.share_wellbeing) AND NOT v_self THEN
    RAISE EXCEPTION 'riders: only the rider decides what the parents see' USING ERRCODE = '42501';
  END IF;
  IF v_self AND NOT app_is_coach() AND (
      NEW.name IS DISTINCT FROM OLD.name
      OR NEW.birth_year IS DISTINCT FROM OLD.birth_year
      OR NEW.sex IS DISTINCT FROM OLD.sex
      OR NEW.category_override IS DISTINCT FROM OLD.category_override
      OR NEW.archived IS DISTINCT FROM OLD.archived
      OR NEW.invitation_id IS DISTINCT FROM OLD.invitation_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.uci_id IS DISTINCT FROM OLD.uci_id
      OR NEW.races_checked_at IS DISTINCT FROM OLD.races_checked_at
      OR NEW.races_error IS DISTINCT FROM OLD.races_error) THEN
    RAISE EXCEPTION 'riders: a rider changes only thresholds and sharing' USING ERRCODE = '42501';
  END IF;
  IF NEW.birth_year IS DISTINCT FROM OLD.birth_year THEN
    UPDATE guardians SET confirmed_at = NULL, confirmed_as_adult = false WHERE rider_id = NEW.id;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- A UCI ID that is removed or changed takes what was read under it
-- along: the results, and the races Kadence put in the calendar for
-- them. A race a person put there stays; only its results go. Whoever
-- changed the ID could already delete all of it, so this runs as them.
CREATE OR REPLACE FUNCTION riders_drop_race_results() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.uci_id IS DISTINCT FROM OLD.uci_id THEN
    DELETE FROM race_results WHERE rider_id = NEW.id;
    DELETE FROM calendar_events WHERE rider_id = NEW.id AND source = 'dcu';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER riders_drop_race_results
  AFTER UPDATE OF uci_id ON "riders"
  FOR EACH ROW EXECUTE FUNCTION riders_drop_race_results();

ALTER TABLE "workout_templates" ADD COLUMN "rider_id" text;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "copied_from" text;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_copied_from_workout_templates_id_fk" FOREIGN KEY ("copied_from") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_templates_rider_idx" ON "workout_templates" USING btree ("org_id","rider_id");--> statement-breakpoint
-- A rider's own sessions (ADR 0050). The team's library is everyone's to
-- read and the coaches' to keep, as before. A session with a rider_id is
-- that rider's: read as the rider's training is read (the coaches, the
-- rider, and the parents when the rider shares training), written by the
-- rider or a coach. A rider cannot move one into the team's library, and
-- cannot make a DCU programme of their own; a coach takes a rider's
-- session into the library as a copy.
DROP POLICY app_read_workout_templates ON "workout_templates";
--> statement-breakpoint
DROP POLICY app_write_workout_templates ON "workout_templates";
--> statement-breakpoint
CREATE POLICY app_read_workout_templates ON "workout_templates" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND (rider_id IS NULL OR app_can_read_rider(rider_id, 'training'))
  );
--> statement-breakpoint
CREATE POLICY app_write_workout_templates ON "workout_templates" FOR ALL TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND CASE WHEN rider_id IS NULL THEN app_is_coach() ELSE app_can_write_rider(rider_id) END
  )
  WITH CHECK (
    org_id = app_current_org_id()
    AND CASE
      WHEN rider_id IS NULL THEN app_is_coach()
      ELSE app_can_write_rider(rider_id) AND source = 'own'
    END
  );

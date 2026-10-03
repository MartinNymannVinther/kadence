ALTER TABLE "flag_resolutions" DROP CONSTRAINT "flag_resolutions_kind";--> statement-breakpoint
ALTER TABLE "team_settings" ADD COLUMN "low_intensity_first" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "flag_resolutions" ADD CONSTRAINT "flag_resolutions_kind" CHECK ("flag_resolutions"."kind" in ('hours_above_corridor','hours_below_corridor','ramp','longest_ride','strength_spacing','compliance','wellbeing_talk','wellbeing_help','pain','sleep_short','sleep_below_minimum','mid_zone'));--> statement-breakpoint
-- "Mellemzonen fylder meget" (docs/adr/0053) is computed from the planned
-- sessions alone, so a resolution of it is read with the training scope,
-- like the other training kinds (drizzle/0013).
DROP POLICY app_read_flag_resolutions ON "flag_resolutions";
--> statement-breakpoint
CREATE POLICY app_read_flag_resolutions ON "flag_resolutions" FOR SELECT TO kadence_app
  USING (
    org_id = app_current_org_id()
    AND app_can_read_rider(
      rider_id,
      CASE WHEN kind IN ('hours_above_corridor', 'hours_below_corridor', 'ramp',
                         'longest_ride', 'strength_spacing', 'compliance', 'mid_zone')
        THEN 'training' ELSE 'wellbeing' END
    )
  );

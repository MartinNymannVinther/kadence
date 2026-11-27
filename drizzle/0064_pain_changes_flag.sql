ALTER TABLE "flag_resolutions" DROP CONSTRAINT "flag_resolutions_kind";--> statement-breakpoint
ALTER TABLE "flag_resolutions" ADD CONSTRAINT "flag_resolutions_kind" CHECK ("flag_resolutions"."kind" in ('hours_above_corridor','hours_below_corridor','ramp','longest_ride','strength_spacing','compliance','wellbeing_talk','wellbeing_help','pain','sleep_short','sleep_below_minimum','mid_zone','known_pain_lasting','changed_for_pain'));--> statement-breakpoint
-- Sessions moved or skipped for pain (docs/adr/0118) are read from the
-- changes, which a parent reads with the training scope (drizzle/0063), so
-- a resolution of the point is read the same way.
DROP POLICY app_read_flag_resolutions ON "flag_resolutions";
--> statement-breakpoint
CREATE POLICY app_read_flag_resolutions ON "flag_resolutions" FOR SELECT TO kadence_app
  USING (
    org_id = (SELECT app_current_org_id())
    AND app_can_read_rider(
      rider_id,
      CASE WHEN kind IN ('hours_above_corridor', 'hours_below_corridor', 'ramp',
                         'longest_ride', 'strength_spacing', 'compliance', 'mid_zone',
                         'changed_for_pain')
        THEN 'training' ELSE 'wellbeing' END
    )
  );

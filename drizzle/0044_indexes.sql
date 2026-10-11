-- The indexes the foreign keys and the policies were missing (docs/adr/0083,
-- backlog S-03, plan §5.0).
--
-- Postgres indexes the referenced side of a foreign key, never the
-- referencing one. Deleting a person checks every column that points at
-- users, and before this a deletion read some thirty tables from end to
-- end; deleting a workspace did the same for each table whose org_id had
-- no index of its own. The rest are columns the policies and the pages
-- look rows up by: a ride's comments, a session's comments, the rider
-- and guardian rows of the person signed in, a team's AI calls today.
--
-- Hand-written, like ai_calls_created_idx in drizzle/0001, and not in the
-- Drizzle schema: they serve the database's own lookups, no query in the
-- code names them, and the schema files stay what the code reads. IF NOT
-- EXISTS, so an installation that added one by hand is not stopped here.
-- Plain CREATE INDEX inside the migration's transaction: the tables are
-- small enough today that the short lock is the honest price.

-- A workspace's rows, for delete_workspace's cascade and the export.
CREATE INDEX IF NOT EXISTS "activity_files_org_idx" ON "activity_files" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_calls_org_created_idx" ON "ai_calls" USING btree ("org_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_links_org_idx" ON "device_links" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "season_plans_org_rider_idx" ON "season_plans" USING btree ("org_id", "rider_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_runs_org_idx" ON "push_runs" USING btree ("org_id");
--> statement-breakpoint
-- A ride's and a session's comments, and the cascade when either goes.
CREATE INDEX IF NOT EXISTS "comments_activity_idx" ON "comments" USING btree ("activity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_planned_session_idx" ON "comments" USING btree ("planned_session_id");
--> statement-breakpoint
-- Who the person signed in is: app_is_rider_self, app_is_guardian_of and
-- whoAmI find their rows by user, across teams.
CREATE INDEX IF NOT EXISTS "riders_user_idx" ON "riders" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardians_user_idx" ON "guardians" USING btree ("user_id");
--> statement-breakpoint
-- Every column that names a person, for the day a person is deleted.
CREATE INDEX IF NOT EXISTS "activities_created_by_idx" ON "activities" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planned_sessions_created_by_idx" ON "planned_sessions" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planned_sessions_updated_by_idx" ON "planned_sessions" USING btree ("updated_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_author_idx" ON "comments" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_created_by_idx" ON "calendar_events" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rider_measurements_created_by_idx" ON "rider_measurements" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rider_goals_created_by_idx" ON "rider_goals" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_templates_created_by_idx" ON "workout_templates" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_blocks_created_by_idx" ON "training_blocks" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flag_resolutions_resolved_by_idx" ON "flag_resolutions" USING btree ("resolved_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_settings_updated_by_idx" ON "team_settings" USING btree ("updated_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "week_plan_drafts_updated_by_idx" ON "week_plan_drafts" USING btree ("updated_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_exercises_created_by_idx" ON "team_exercises" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_programs_created_by_idx" ON "team_programs" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upload_keys_created_by_idx" ON "upload_keys" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_llm_settings_updated_by_idx" ON "workspace_llm_settings" USING btree ("updated_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_championships_created_by_idx" ON "club_championships" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planned_session_deletions_deleted_by_idx" ON "planned_session_deletions" USING btree ("deleted_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_user_idx" ON "password_resets" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_resets_created_by_idx" ON "password_resets" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_threads_author_user_idx" ON "community_threads" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_posts_author_user_idx" ON "community_posts" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_reports_reporter_user_idx" ON "community_reports" USING btree ("reporter_user_id");
--> statement-breakpoint
-- The installation's admission tables, which name the owner who decided
-- and the person who came in.
CREATE INDEX IF NOT EXISTS "invitations_inviter_idx" ON "invitations" USING btree ("inviter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_requests_decided_by_idx" ON "access_requests" USING btree ("decided_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_invitations_invited_by_idx" ON "access_invitations" USING btree ("invited_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "access_invitations_used_by_idx" ON "access_invitations" USING btree ("used_by_user_id");

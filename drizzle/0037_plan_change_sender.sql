CREATE TABLE "planned_session_deletions" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"on_date" date NOT NULL,
	"title" text NOT NULL,
	"deleted_by" text,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "planned_session_deletions" ADD CONSTRAINT "planned_session_deletions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_session_deletions" ADD CONSTRAINT "planned_session_deletions_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_session_deletions" ADD CONSTRAINT "planned_session_deletions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planned_session_deletions_rider_idx" ON "planned_session_deletions" USING btree ("org_id","rider_id","deleted_at");--> statement-breakpoint
CREATE INDEX "planned_session_deletions_at_idx" ON "planned_session_deletions" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Plan changes know who made them (docs/adr/0060, backlog P2-12). A rider's
-- "Planen er ændret" reminder is about a change somebody else made to a
-- session in the next seven days. Kadence knew who laid a session, not who
-- changed it last, and a session that was deleted left nothing to tell.
--
-- updated_by is stamped by the database, not by the services: every path
-- that writes a session (create, edit, move, copy, group, series, copy
-- week, block apply, programme, done and undone, a ride matched on import)
-- goes through drizzle, which moves updated_at on every update, and this
-- trigger takes the caller from the transaction's context then. So no path
-- can leave it out and no caller can name somebody else. Without a context
-- (a migration, a fixture) the row's own value stands. An update that does
-- not move updated_at leaves it alone: that is the database itself, a
-- template or a ride removed (ON DELETE SET NULL), or an account deleted,
-- whose SET NULL on this very column must stay null. No backfill: a
-- session last written before this has none, and who laid it stands in
-- (src/modules/push/facts.ts), which is what the reminder went by until now.
CREATE OR REPLACE FUNCTION planned_sessions_stamp_updated_by() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.updated_by := coalesce(app_current_user_id(), NEW.updated_by, NEW.created_by);
  ELSIF NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    NEW.updated_by := coalesce(app_current_user_id(), NEW.updated_by);
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER planned_sessions_updated_by
  BEFORE INSERT OR UPDATE ON "planned_sessions"
  FOR EACH ROW EXECUTE FUNCTION planned_sessions_stamp_updated_by();
--> statement-breakpoint
-- A deleted session in a rider's next days, kept for seven days so the
-- rider can be told (src/modules/training/deletions.ts). It is the rider's
-- training: read by whoever may read the rider's training (the coaches,
-- the rider, a confirmed parent while the rider shares it), written by
-- whoever may write it, and only in the writer's own name. Nobody changes
-- or removes a row: the rider's own record of what was taken away does not
-- go away because somebody would rather it did. It leaves with the rider
-- (erase_rider, by cascade) and the workspace, and when it is seven days
-- old, by planned_session_deletions_sweep() below. Every row is audited.
GRANT SELECT, INSERT ON "planned_session_deletions" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "planned_session_deletions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "planned_session_deletions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_planned_session_deletions ON "planned_session_deletions"
  FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND app_can_read_rider(rider_id, 'training'));
--> statement-breakpoint
CREATE POLICY app_insert_planned_session_deletions ON "planned_session_deletions"
  FOR INSERT TO kadence_app
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_can_write_rider(rider_id)
    AND deleted_by = app_current_user_id()
  );
--> statement-breakpoint
CREATE TRIGGER audit_planned_session_deletions
  AFTER INSERT OR UPDATE OR DELETE ON "planned_session_deletions"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The reminder job runs with nobody signed in, and a row's seven days end
-- whether or not anybody on its team has reminders. This removes the rows
-- past seven days, across workspaces, and nothing else: no argument, no
-- row returned, only how many went.
CREATE OR REPLACE FUNCTION planned_session_deletions_sweep() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  WITH gone AS (
    DELETE FROM planned_session_deletions
    WHERE deleted_at < now() - interval '7 days'
    RETURNING 1
  )
  SELECT count(*)::int FROM gone
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION planned_session_deletions_sweep() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION planned_session_deletions_sweep() TO kadence_app;

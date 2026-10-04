ALTER TABLE "community_threads" ADD COLUMN "demo_org_id" text;--> statement-breakpoint
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_demo_org_id_organizations_id_fk" FOREIGN KEY ("demo_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_threads_demo_idx" ON "community_threads" USING btree ("demo_org_id");--> statement-breakpoint
-- Trænerrummet and the demo (docs/adr/0054). A demo visitor coaches the
-- demo workspace, and until now that made them a coach "somewhere" and
-- let them into the installation's room. From here on the installation's
-- room is for coaches of real workspaces only, and each demo has a room
-- of its own, which goes with the demo.
--
-- Whether the active workspace is a demo: its id when it is, else null.
-- demo_workspaces is installation state the application role never reads
-- (src/core/db/schema/demo.ts), so this answers the one question and
-- returns nothing but the caller's own active workspace id.
CREATE OR REPLACE FUNCTION app_demo_room() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT d.organization_id FROM demo_workspaces d WHERE d.organization_id = app_current_org_id()
$$;
--> statement-breakpoint
-- A coach of a real workspace: a demo's membership no longer counts.
CREATE OR REPLACE FUNCTION app_is_coach_somewhere() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = app_current_user_id() AND m.role IN ('owner', 'admin')
      AND NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = m.organization_id)
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_demo_room() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_demo_room() TO kadence_app;
--> statement-breakpoint
-- Whether the session may be in the room a thread belongs to: the
-- installation's (demo_org_id null) for a coach of a real workspace who is
-- not in a demo right now, a demo's for that demo's coach.
CREATE OR REPLACE FUNCTION app_in_room(p_demo text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT CASE
    WHEN p_demo IS NULL THEN app_demo_room() IS NULL AND app_is_coach_somewhere()
    ELSE p_demo = app_demo_room() AND app_is_coach()
  END
$$;
--> statement-breakpoint
-- The room the session is in, for the services: may it use it at all.
CREATE OR REPLACE FUNCTION app_can_use_room() RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT app_in_room(app_demo_room())
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_in_room(text), app_can_use_room() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_in_room(text), app_can_use_room() TO kadence_app;
--> statement-breakpoint
-- Anything a demo visitor already wrote in the installation's room goes.
DELETE FROM "community_posts" p
  WHERE EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = p.author_org_id);
--> statement-breakpoint
DELETE FROM "community_threads" t
  WHERE EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = t.author_org_id);
--> statement-breakpoint
DROP POLICY app_read_community_threads ON "community_threads";
--> statement-breakpoint
DROP POLICY app_insert_community_threads ON "community_threads";
--> statement-breakpoint
DROP POLICY app_update_community_threads ON "community_threads";
--> statement-breakpoint
DROP POLICY app_read_community_posts ON "community_posts";
--> statement-breakpoint
DROP POLICY app_insert_community_posts ON "community_posts";
--> statement-breakpoint
DROP POLICY app_update_community_posts ON "community_posts";
--> statement-breakpoint
DROP POLICY app_insert_community_reports ON "community_reports";
--> statement-breakpoint
DROP POLICY app_own_community_reads ON "community_reads";
--> statement-breakpoint
-- A thread is read in its own room; what is hidden, by its author and the owner.
CREATE POLICY app_read_community_threads ON "community_threads" FOR SELECT TO kadence_app
  USING (
    app_in_room(demo_org_id)
    AND (hidden_at IS NULL OR author_user_id = app_current_user_id() OR app_is_platform_owner())
  );
--> statement-breakpoint
-- A coach writes as the club of the active workspace. In a demo's room the
-- demo's example coaches are made up and signed with no account and no
-- club (community_stamp below); nowhere else can a post be unsigned.
CREATE POLICY app_insert_community_threads ON "community_threads" FOR INSERT TO kadence_app
  WITH CHECK (
    app_in_room(demo_org_id) AND app_is_coach() AND hidden_at IS NULL AND NOT locked
    AND (
      (author_user_id = app_current_user_id() AND author_org_id = app_current_org_id())
      OR (demo_org_id IS NOT NULL AND author_user_id IS NULL AND author_org_id IS NULL)
    )
  );
--> statement-breakpoint
-- Any coach in the room may touch a thread, because a reply moves its
-- last_post_at; which columns each may change is community_guard's to say.
CREATE POLICY app_update_community_threads ON "community_threads" FOR UPDATE TO kadence_app
  USING (app_in_room(demo_org_id))
  WITH CHECK (app_in_room(demo_org_id));
--> statement-breakpoint
-- A reply is read where its thread is: the subquery runs under the
-- threads' own policy, so the room and the thread's hiding both apply.
CREATE POLICY app_read_community_posts ON "community_posts" FOR SELECT TO kadence_app
  USING (
    EXISTS (SELECT 1 FROM "community_threads" t WHERE t.id = community_posts.thread_id)
    AND (hidden_at IS NULL OR author_user_id = app_current_user_id() OR app_is_platform_owner())
  );
--> statement-breakpoint
CREATE POLICY app_insert_community_posts ON "community_posts" FOR INSERT TO kadence_app
  WITH CHECK (
    app_is_coach() AND hidden_at IS NULL
    AND EXISTS (
      SELECT 1 FROM "community_threads" t
      WHERE t.id = community_posts.thread_id AND t.hidden_at IS NULL AND NOT t.locked
        AND (
          (community_posts.author_user_id = app_current_user_id()
            AND community_posts.author_org_id = app_current_org_id())
          OR (t.demo_org_id IS NOT NULL AND community_posts.author_user_id IS NULL
            AND community_posts.author_org_id IS NULL)
        )
    )
  );
--> statement-breakpoint
CREATE POLICY app_update_community_posts ON "community_posts" FOR UPDATE TO kadence_app
  USING (
    EXISTS (SELECT 1 FROM "community_threads" t WHERE t.id = community_posts.thread_id)
    AND (app_is_platform_owner() OR author_user_id = app_current_user_id())
  )
  WITH CHECK (EXISTS (SELECT 1 FROM "community_threads" t WHERE t.id = community_posts.thread_id));
--> statement-breakpoint
-- Reports go to the installation's owner, about the installation's room;
-- a demo has nobody to report to.
CREATE POLICY app_insert_community_reports ON "community_reports" FOR INSERT TO kadence_app
  WITH CHECK (
    app_demo_room() IS NULL AND app_is_coach_somewhere()
    AND reporter_user_id = app_current_user_id() AND handled_at IS NULL
  );
--> statement-breakpoint
CREATE POLICY app_own_community_reads ON "community_reads" FOR ALL TO kadence_app
  USING (
    user_id = app_current_user_id()
    AND EXISTS (SELECT 1 FROM "community_threads" t WHERE t.id = community_reads.thread_id)
  )
  WITH CHECK (
    user_id = app_current_user_id()
    AND EXISTS (SELECT 1 FROM "community_threads" t WHERE t.id = community_reads.thread_id)
  );
--> statement-breakpoint
-- The stamp now also puts a thread in the session's room. And in a demo
-- only, while the demo's own seed runs (src/modules/demo/coaches-room.ts),
-- the example coaches keep the made-up names the seed gives them and
-- carry no account and no club. The setting is the seed's; outside a demo
-- it changes nothing, and inside one it can only write that demo's room.
CREATE OR REPLACE FUNCTION community_stamp() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_demo text := app_demo_room();
BEGIN
  IF TG_TABLE_NAME = 'community_threads' THEN
    NEW.demo_org_id := v_demo;
  END IF;
  IF v_demo IS NOT NULL AND current_setting('app.demo_seed', true) = 'on' THEN
    NEW.author_user_id := NULL;
    NEW.author_org_id := NULL;
    RETURN NEW;
  END IF;
  NEW.author_user_id := app_current_user_id();
  NEW.author_org_id := app_current_org_id();
  NEW.author_name := coalesce((SELECT name FROM users WHERE id = app_current_user_id()), '');
  NEW.club_name := coalesce((SELECT name FROM organizations WHERE id = app_current_org_id()), '');
  RETURN NEW;
END
$$;

--> statement-breakpoint
-- The guard of drizzle/0023, and a thread never moves between rooms.
CREATE OR REPLACE FUNCTION community_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_owner boolean := app_is_platform_owner();
  v_author boolean := OLD.author_user_id IS NOT NULL AND OLD.author_user_id = app_current_user_id();
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF NEW.author_user_id IS NULL AND OLD.author_user_id IS NOT NULL THEN
      NEW := OLD;
      NEW.author_user_id := NULL;
      NEW.author_name := '';
      NEW.club_name := '';
      RETURN NEW;
    END IF;
    IF NEW.author_org_id IS NULL AND OLD.author_org_id IS NOT NULL THEN
      NEW := OLD;
      NEW.author_org_id := NULL;
      NEW.club_name := '';
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'a post keeps its id and its time' USING ERRCODE = '42501';
  END IF;
  -- Nested, because a reply's record has no demo_org_id to compare.
  IF TG_TABLE_NAME = 'community_threads' THEN
    IF NEW.demo_org_id IS DISTINCT FROM OLD.demo_org_id THEN
      RAISE EXCEPTION 'a thread stays in its room' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
     OR NEW.author_org_id IS DISTINCT FROM OLD.author_org_id
     OR NEW.author_name IS DISTINCT FROM OLD.author_name
     OR NEW.club_name IS DISTINCT FROM OLD.club_name THEN
    RAISE EXCEPTION 'who wrote a post does not change' USING ERRCODE = '42501';
  END IF;
  IF (NEW.hidden_at IS DISTINCT FROM OLD.hidden_at OR NEW.hidden_by IS DISTINCT FROM OLD.hidden_by)
     AND NOT v_owner THEN
    RAISE EXCEPTION 'only the installation owner moderates' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'community_threads' THEN
    IF NEW.locked IS DISTINCT FROM OLD.locked AND NOT v_owner THEN
      RAISE EXCEPTION 'only the installation owner moderates' USING ERRCODE = '42501';
    END IF;
    -- A reply moves last_post_at to the moment it is written, never further,
    -- so nobody pins a thread to the top or buries another's.
    IF NEW.last_post_at IS DISTINCT FROM OLD.last_post_at THEN
      NEW.last_post_at := greatest(OLD.last_post_at, now());
    END IF;
    -- The words are the author's.
    IF (NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body
        OR NEW.workout IS DISTINCT FROM OLD.workout OR NEW.category IS DISTINCT FROM OLD.category)
       AND NOT v_author THEN
      RAISE EXCEPTION 'only the author changes the words' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.thread_id IS DISTINCT FROM OLD.thread_id THEN
      RAISE EXCEPTION 'a reply stays in its thread' USING ERRCODE = '42501';
    END IF;
    IF NEW.body IS DISTINCT FROM OLD.body AND NOT v_author THEN
      RAISE EXCEPTION 'only the author changes the words' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

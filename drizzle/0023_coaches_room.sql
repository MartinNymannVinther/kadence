CREATE TABLE "community_posts" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"thread_id" text NOT NULL,
	"body" text NOT NULL,
	"author_user_id" text,
	"author_org_id" text,
	"author_name" text DEFAULT '' NOT NULL,
	"club_name" text DEFAULT '' NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_posts_body" CHECK (char_length("community_posts"."body") between 1 and 8000)
);
--> statement-breakpoint
CREATE TABLE "community_reads" (
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_reads_user_id_thread_id_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone,
	"handled_by" text,
	CONSTRAINT "community_reports_kind" CHECK ("community_reports"."target_kind" in ('thread','post')),
	CONSTRAINT "community_reports_reason" CHECK (char_length("community_reports"."reason") <= 500)
);
--> statement-breakpoint
CREATE TABLE "community_threads" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"workout" jsonb,
	"locked" boolean DEFAULT false NOT NULL,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_user_id" text,
	"author_org_id" text,
	"author_name" text DEFAULT '' NOT NULL,
	"club_name" text DEFAULT '' NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_threads_category" CHECK ("community_threads"."category" in ('training','strength','wellbeing','races','equipment','dcu')),
	CONSTRAINT "community_threads_title" CHECK (char_length("community_threads"."title") between 1 and 160),
	CONSTRAINT "community_threads_body" CHECK (char_length("community_threads"."body") between 1 and 8000)
);
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_thread_id_community_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."community_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_org_id_organizations_id_fk" FOREIGN KEY ("author_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reads" ADD CONSTRAINT "community_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reads" ADD CONSTRAINT "community_reads_thread_id_community_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."community_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_threads" ADD CONSTRAINT "community_threads_author_org_id_organizations_id_fk" FOREIGN KEY ("author_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_posts_thread_idx" ON "community_posts" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "community_reports_open_idx" ON "community_reports" USING btree ("handled_at");--> statement-breakpoint
CREATE INDEX "community_threads_recent_idx" ON "community_threads" USING btree ("last_post_at");--> statement-breakpoint
-- Trænerrummet (ADR 0052): the installation's room for coaches, across
-- clubs. Who coaches somewhere, and who owns the installation, are asked
-- of memberships and users, which the policies cannot read across
-- workspaces; so two narrow SECURITY DEFINER functions answer true or
-- false about the caller and nothing else.
CREATE OR REPLACE FUNCTION app_is_coach_somewhere() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = app_current_user_id() AND m.role IN ('owner', 'admin')
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_is_platform_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_is_coach_somewhere(), app_is_platform_owner() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_is_coach_somewhere(), app_is_platform_owner() TO kadence_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "community_threads", "community_posts", "community_reports" TO kadence_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "community_reads" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "community_threads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_threads" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_posts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_reports" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_reads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_reads" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Coaches read what is not hidden; the author and the owner also what is.
CREATE POLICY app_read_community_threads ON "community_threads" FOR SELECT TO kadence_app
  USING (
    app_is_coach_somewhere()
    AND (hidden_at IS NULL OR author_user_id = app_current_user_id() OR app_is_platform_owner())
  );
--> statement-breakpoint
-- A coach writes as the club they coach in the active workspace.
CREATE POLICY app_insert_community_threads ON "community_threads" FOR INSERT TO kadence_app
  WITH CHECK (
    app_is_coach() AND author_user_id = app_current_user_id() AND author_org_id = app_current_org_id()
    AND hidden_at IS NULL AND NOT locked
  );
--> statement-breakpoint
-- Any coach may touch a thread they can see, because a reply moves its
-- last_post_at; which columns each may change is community_guard's to say.
CREATE POLICY app_update_community_threads ON "community_threads" FOR UPDATE TO kadence_app
  USING (app_is_coach_somewhere())
  WITH CHECK (app_is_coach_somewhere());
--> statement-breakpoint
CREATE POLICY app_read_community_posts ON "community_posts" FOR SELECT TO kadence_app
  USING (
    app_is_coach_somewhere()
    AND (hidden_at IS NULL OR author_user_id = app_current_user_id() OR app_is_platform_owner())
  );
--> statement-breakpoint
CREATE POLICY app_insert_community_posts ON "community_posts" FOR INSERT TO kadence_app
  WITH CHECK (
    app_is_coach() AND author_user_id = app_current_user_id() AND author_org_id = app_current_org_id()
    AND hidden_at IS NULL
    AND EXISTS (
      SELECT 1 FROM "community_threads" t
      WHERE t.id = community_posts.thread_id AND t.hidden_at IS NULL AND NOT t.locked
    )
  );
--> statement-breakpoint
CREATE POLICY app_update_community_posts ON "community_posts" FOR UPDATE TO kadence_app
  USING (
    app_is_platform_owner() OR (app_is_coach_somewhere() AND author_user_id = app_current_user_id())
  )
  WITH CHECK (app_is_coach_somewhere());
--> statement-breakpoint
CREATE POLICY app_insert_community_reports ON "community_reports" FOR INSERT TO kadence_app
  WITH CHECK (app_is_coach_somewhere() AND reporter_user_id = app_current_user_id() AND handled_at IS NULL);
--> statement-breakpoint
CREATE POLICY app_read_community_reports ON "community_reports" FOR SELECT TO kadence_app
  USING (app_is_platform_owner() OR reporter_user_id = app_current_user_id());
--> statement-breakpoint
CREATE POLICY app_update_community_reports ON "community_reports" FOR UPDATE TO kadence_app
  USING (app_is_platform_owner()) WITH CHECK (app_is_platform_owner());
--> statement-breakpoint
CREATE POLICY app_own_community_reads ON "community_reads" FOR ALL TO kadence_app
  USING (user_id = app_current_user_id() AND app_is_coach_somewhere())
  WITH CHECK (user_id = app_current_user_id() AND app_is_coach_somewhere());
--> statement-breakpoint
-- Who wrote a post, and as which club, is the database's to say: taken
-- from the session on insert, never from the request.
CREATE OR REPLACE FUNCTION community_stamp() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  NEW.author_user_id := app_current_user_id();
  NEW.author_org_id := app_current_org_id();
  NEW.author_name := coalesce((SELECT name FROM users WHERE id = app_current_user_id()), '');
  NEW.club_name := coalesce((SELECT name FROM organizations WHERE id = app_current_org_id()), '');
  RETURN NEW;
END
$$;
--> statement-breakpoint
-- After that: the author changes the words; only the installation's owner
-- hides, shows or locks; nobody changes who wrote it. When an account or a
-- club is deleted, the foreign key cuts the link and the name goes with it.
-- That SET NULL runs from the delete's own referential trigger, so this
-- guard sees it one level down (pg_trigger_depth() > 1); an UPDATE written
-- by hand is at depth 1 and falls through to the checks below. Only the
-- link and the names change on that path; the rest stays as it was.
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
--> statement-breakpoint
CREATE TRIGGER community_threads_stamp BEFORE INSERT ON "community_threads"
  FOR EACH ROW EXECUTE FUNCTION community_stamp();
--> statement-breakpoint
CREATE TRIGGER community_posts_stamp BEFORE INSERT ON "community_posts"
  FOR EACH ROW EXECUTE FUNCTION community_stamp();
--> statement-breakpoint
CREATE TRIGGER community_threads_guard BEFORE UPDATE ON "community_threads"
  FOR EACH ROW EXECUTE FUNCTION community_guard();
--> statement-breakpoint
CREATE TRIGGER community_posts_guard BEFORE UPDATE ON "community_posts"
  FOR EACH ROW EXECUTE FUNCTION community_guard();
--> statement-breakpoint
CREATE TRIGGER audit_community_threads
  AFTER INSERT OR UPDATE OR DELETE ON "community_threads"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_community_posts
  AFTER INSERT OR UPDATE OR DELETE ON "community_posts"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
CREATE TRIGGER audit_community_reports
  AFTER INSERT OR UPDATE OR DELETE ON "community_reports"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();

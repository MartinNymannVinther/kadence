CREATE TABLE "org_images" (
	"org_id" text NOT NULL,
	"kind" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"width" smallint NOT NULL,
	"height" smallint NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_images_org_id_kind_pk" PRIMARY KEY("org_id","kind"),
	CONSTRAINT "org_images_kind" CHECK ("org_images"."kind" in ('logo', 'cover')),
	CONSTRAINT "org_images_mime" CHECK ("org_images"."mime" in ('image/png', 'image/jpeg', 'image/webp')),
	CONSTRAINT "org_images_size" CHECK (octet_length("org_images"."bytes") <= case when "org_images"."kind" = 'logo' then 307200 else 2097152 end),
	CONSTRAINT "org_images_dimensions" CHECK ("org_images"."width" between 1 and 4096 and "org_images"."height" between 1 and 4096)
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org_images" ADD CONSTRAINT "org_images_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- A club's logo and picture (ADR 0048). Everyone in the team reads them;
-- the coaches change them. The image bytes are kept out of the audit log
-- by audit_redact ('bytes', drizzle/0003); who changed what and when is
-- still recorded.
GRANT SELECT, INSERT, UPDATE, DELETE ON "org_images" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "org_images" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "org_images" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_org_images ON "org_images" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id());
--> statement-breakpoint
CREATE POLICY app_write_org_images ON "org_images" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach())
  WITH CHECK (org_id = app_current_org_id() AND app_is_coach() AND updated_by = app_current_user_id());
--> statement-breakpoint
CREATE TRIGGER audit_org_images
  AFTER INSERT OR UPDATE OR DELETE ON "org_images"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint

-- The installation's overview (ADR 0048): one row per workspace with
-- counts only — never a rider's name, training or check-in. It reads
-- across every workspace, so it is SECURITY DEFINER, and it refuses
-- everyone but the installation's owner, read from the caller's
-- app.user_id (set by the application, never by a request). Demo
-- workspaces are left out; they are throwaway by definition.
CREATE OR REPLACE FUNCTION platform_overview()
RETURNS TABLE (
  org_id text,
  name text,
  created_at timestamptz,
  coaches bigint,
  riders bigint,
  parents bigint,
  members bigint,
  last_seen timestamptz,
  file_bytes bigint,
  ai_calls_day bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = app_current_user_id() AND u.platform_role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only the installation owner sees the overview' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    (SELECT count(*) FROM memberships m WHERE m.organization_id = o.id AND m.role IN ('owner', 'admin')),
    (SELECT count(*) FROM riders r WHERE r.org_id = o.id AND NOT r.archived),
    (SELECT count(DISTINCT g.user_id) FROM guardians g WHERE g.org_id = o.id AND g.confirmed_at IS NOT NULL),
    (SELECT count(*) FROM memberships m WHERE m.organization_id = o.id),
    (SELECT max(s.updated_at) FROM sessions s JOIN memberships m ON m.user_id = s.user_id WHERE m.organization_id = o.id),
    (SELECT coalesce(sum(octet_length(f.bytes)), 0)::bigint FROM activity_files f WHERE f.org_id = o.id),
    (SELECT count(*) FROM ai_calls a WHERE a.org_id = o.id AND a.created_at > now() - interval '1 day')
  FROM organizations o
  WHERE NOT EXISTS (SELECT 1 FROM demo_workspaces d WHERE d.organization_id = o.id)
  ORDER BY o.created_at;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION platform_overview() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION platform_overview() TO kadence_app;

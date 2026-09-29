CREATE TABLE "upload_keys" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"rider_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"hint" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_error" text DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_keys_name" CHECK (char_length("upload_keys"."name") between 1 and 60),
	CONSTRAINT "upload_keys_hash" CHECK ("upload_keys"."key_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "upload_keys_hint" CHECK (char_length("upload_keys"."hint") = 4)
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "upload_key_id" text;--> statement-breakpoint
ALTER TABLE "upload_keys" ADD CONSTRAINT "upload_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_keys" ADD CONSTRAINT "upload_keys_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_keys" ADD CONSTRAINT "upload_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "upload_keys_hash_uq" ON "upload_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "upload_keys_rider_idx" ON "upload_keys" USING btree ("org_id","rider_id");--> statement-breakpoint
-- A rider's upload keys (ADR 0029): the same security as a device link
-- (drizzle/0003). The rider makes and removes their own; a coach sees
-- that a key exists and how it is doing, and can remove it; nobody else,
-- no guardian and no teammate, sees one at all.
--
-- The key itself is never stored, only its hash, and the application
-- role cannot read even that: it is granted every column but key_hash.
-- It writes the hash when a key is made and never sees it again; whose
-- key a hash is, is asked of upload_key_owner below. The audit trail
-- already drops a column called key_hash (audit_redact, drizzle/0003).
GRANT INSERT, UPDATE, DELETE ON "upload_keys" TO kadence_app;
--> statement-breakpoint
GRANT SELECT ("id", "org_id", "rider_id", "name", "hint", "last_used_at", "last_error",
  "created_by", "created_at", "updated_at") ON "upload_keys" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "upload_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "upload_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_upload_keys ON "upload_keys" FOR SELECT TO kadence_app
  USING (org_id = app_current_org_id() AND (app_is_coach() OR app_is_rider_self(rider_id)));
--> statement-breakpoint
CREATE POLICY app_write_upload_keys ON "upload_keys" FOR ALL TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_rider_self(rider_id))
  WITH CHECK (
    org_id = app_current_org_id()
    AND app_is_rider_self(rider_id)
    AND created_by = app_current_user_id()
  );
--> statement-breakpoint
CREATE POLICY app_delete_upload_keys_coach ON "upload_keys" FOR DELETE TO kadence_app
  USING (org_id = app_current_org_id() AND app_is_coach());
--> statement-breakpoint

-- A key is what it was made as. The hash, the hint, the rider, the team
-- and who made it never change: a new key is a new row, and what a key
-- may become is a new name and a note of when it was last used. A policy
-- cannot compare a row before and after; a trigger can. It reads no
-- other table, so it runs as the caller.
CREATE OR REPLACE FUNCTION upload_keys_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.key_hash IS DISTINCT FROM OLD.key_hash
    OR NEW.hint IS DISTINCT FROM OLD.hint
    OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
    OR NEW.org_id IS DISTINCT FROM OLD.org_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'upload_keys: a key is renamed or removed, never changed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER upload_keys_guard
  BEFORE UPDATE ON "upload_keys"
  FOR EACH ROW EXECUTE FUNCTION upload_keys_guard();
--> statement-breakpoint
CREATE TRIGGER audit_upload_keys
  AFTER INSERT OR UPDATE OR DELETE ON "upload_keys"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint

-- A rider who is archived, or whose row passes to another account, takes
-- no keys along: they are removed there and then, whoever made the
-- change and by whichever road, so a key never wakes again when a rider
-- comes back, and never works for the next person to hold the row.
CREATE OR REPLACE FUNCTION riders_drop_upload_keys() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF (NEW.archived AND NOT OLD.archived) OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    DELETE FROM upload_keys WHERE rider_id = NEW.id;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER riders_drop_upload_keys
  AFTER UPDATE ON "riders"
  FOR EACH ROW EXECUTE FUNCTION riders_drop_upload_keys();
--> statement-breakpoint

-- Whose key this is, for a file that arrives with nobody signed in
-- (src/modules/devices/ingest.ts). It is device_link_owner's question
-- (drizzle/0005) asked of a key: the application role sees no key
-- without a context, and never a hash, so this one thing is answered by
-- a definer, and everything after it — the import, the note on the key —
-- runs as the rider under the ordinary policies. It answers with four
-- ids for the exact hash of a key and nothing else: no name, no hint, no
-- row it was not asked about, and nothing at all for a rider without an
-- account, a rider who is archived, a person who is no longer a member
-- of the team, or a key made by another account than the one that holds
-- the rider row today. It cannot enumerate: without the key, which only
-- its holder has, there is nothing to ask for.
CREATE OR REPLACE FUNCTION upload_key_owner(p_key_hash text)
RETURNS TABLE (key_id text, org_id text, rider_id text, rider_user_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT k.id, k.org_id, k.rider_id, r.user_id
  FROM upload_keys k
  JOIN riders r ON r.id = k.rider_id AND r.org_id = k.org_id
  WHERE k.key_hash = p_key_hash
    AND r.user_id IS NOT NULL
    AND r.user_id = k.created_by
    AND NOT r.archived
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = k.org_id AND m.user_id = r.user_id
    )
  LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION upload_key_owner(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION upload_key_owner(text) TO kadence_app;

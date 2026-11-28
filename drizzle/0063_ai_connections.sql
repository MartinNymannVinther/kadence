CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"alg" text,
	"crv" text
);
--> statement-breakpoint
CREATE TABLE "oauth_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"refresh_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"revoked" timestamp with time zone,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL,
	CONSTRAINT "oauth_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "oauth_client_assertions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_client_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"client_discovery_id" text,
	"disabled" boolean DEFAULT false,
	"skip_consent" boolean,
	"enable_end_session" boolean,
	"subject_type" text,
	"scopes" text[],
	"client_credentials_scopes" text[] DEFAULT '{}',
	"user_id" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" text[],
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" text[] NOT NULL,
	"post_logout_redirect_uris" text[],
	"backchannel_logout_uri" text,
	"backchannel_logout_session_required" boolean,
	"token_endpoint_auth_method" text,
	"application_type" text,
	"jwks" text,
	"jwks_uri" text,
	"grant_types" text[],
	"response_types" text[],
	"require_pkce" boolean,
	"dpop_bound_access_tokens" boolean DEFAULT false,
	"reference_id" text,
	"metadata" jsonb,
	CONSTRAINT "oauth_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"reference_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "oauth_refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"revoked" timestamp with time zone,
	"rotated_at" timestamp with time zone,
	"rotation_replay_response" text,
	"rotation_replay_expires_at" timestamp with time zone,
	"auth_time" timestamp with time zone,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL,
	CONSTRAINT "oauth_refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "oauth_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"name" text NOT NULL,
	"access_token_ttl" integer,
	"refresh_token_ttl" integer,
	"signing_algorithm" text,
	"signing_key_id" text,
	"allowed_scopes" text[],
	"custom_claims" jsonb,
	"dpop_bound_access_tokens_required" boolean DEFAULT false,
	"disabled" boolean DEFAULT false,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"policy_version" integer DEFAULT 1,
	"metadata" jsonb,
	CONSTRAINT "oauth_resources_identifier_unique" UNIQUE("identifier")
);
--> statement-breakpoint
CREATE TABLE "ai_connections" (
	"id" text PRIMARY KEY DEFAULT (gen_random_uuid())::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"client_name" text NOT NULL,
	"client_host" text NOT NULL,
	"scopes" text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_connections_name" CHECK (char_length("ai_connections"."client_name") between 1 and 80),
	CONSTRAINT "ai_connections_host" CHECK (char_length("ai_connections"."client_host") between 1 and 255),
	CONSTRAINT "ai_connections_scopes" CHECK ("ai_connections"."scopes" <@ array['kadence:read','kadence:checkin','kadence:draft']::text[])
);
--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_refresh_id_oauth_refresh_tokens_id_fk" FOREIGN KEY ("refresh_id") REFERENCES "public"."oauth_refresh_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_client_resources" ADD CONSTRAINT "oauth_client_resources_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_client_resources" ADD CONSTRAINT "oauth_client_resources_resource_id_oauth_resources_identifier_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."oauth_resources"("identifier") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD CONSTRAINT "oauth_clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_connections" ADD CONSTRAINT "ai_connections_client_id_oauth_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oauth_access_tokens_client_idx" ON "oauth_access_tokens" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_access_tokens_session_idx" ON "oauth_access_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "oauth_access_tokens_user_idx" ON "oauth_access_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_access_tokens_code_idx" ON "oauth_access_tokens" USING btree ("authorization_code_id");--> statement-breakpoint
CREATE INDEX "oauth_access_tokens_refresh_idx" ON "oauth_access_tokens" USING btree ("refresh_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_client_resources_uq" ON "oauth_client_resources" USING btree ("client_id","resource_id");--> statement-breakpoint
CREATE INDEX "oauth_client_resources_resource_idx" ON "oauth_client_resources" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "oauth_clients_user_idx" ON "oauth_clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_consents_client_idx" ON "oauth_consents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_consents_user_idx" ON "oauth_consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_tokens_client_idx" ON "oauth_refresh_tokens" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_tokens_session_idx" ON "oauth_refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_tokens_user_idx" ON "oauth_refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_tokens_code_idx" ON "oauth_refresh_tokens" USING btree ("authorization_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_connections_uq" ON "ai_connections" USING btree ("org_id","user_id","client_id");--> statement-breakpoint
CREATE INDEX "ai_connections_user_idx" ON "ai_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_connections_client_idx" ON "ai_connections" USING btree ("client_id");
--> statement-breakpoint
-- A person's own assistant talking to Kadence over MCP (docs/adr/0118).
--
-- Better Auth's OAuth tables (above) are owned like the other auth tables
-- (drizzle/0001): the auth role reads and writes them in full, and the
-- application role has no grant at all, so domain code can never touch a
-- token, a client secret or a signing key. Forced RLS with one policy for
-- the auth role, as for sessions and passkeys.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "jwks", "oauth_clients", "oauth_resources", "oauth_client_resources", "oauth_refresh_tokens", "oauth_access_tokens", "oauth_consents", "oauth_client_assertions"
TO kadence_auth;
--> statement-breakpoint
ALTER TABLE "jwks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "jwks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_jwks ON "jwks" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "oauth_clients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_clients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_oauth_clients ON "oauth_clients" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "oauth_resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_resources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_oauth_resources ON "oauth_resources" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "oauth_client_resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_client_resources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_oauth_client_resources ON "oauth_client_resources" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_refresh_tokens" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_oauth_refresh_tokens ON "oauth_refresh_tokens" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_access_tokens" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_oauth_access_tokens ON "oauth_access_tokens" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "oauth_consents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_consents" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_oauth_consents ON "oauth_consents" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "oauth_client_assertions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_client_assertions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY auth_all_oauth_client_assertions ON "oauth_client_assertions" FOR ALL TO kadence_auth USING (true) WITH CHECK (true);
--> statement-breakpoint
-- ai_connections: one person's assistant in one workspace. Only the person
-- sees, makes and removes their own: not a coach, not a parent, not a
-- teammate (Martin's answer of 27 November 2026). /api/mcp reads it on
-- every call, as the person, under these same policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON "ai_connections" TO kadence_app;
--> statement-breakpoint
ALTER TABLE "ai_connections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_connections" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_ai_connections ON "ai_connections" FOR ALL TO kadence_app
  USING (org_id = (SELECT app_current_org_id()) AND user_id = (SELECT app_current_user_id()))
  WITH CHECK (org_id = (SELECT app_current_org_id()) AND user_id = (SELECT app_current_user_id()));
--> statement-breakpoint
CREATE TRIGGER audit_ai_connections
  AFTER INSERT OR UPDATE OR DELETE ON "ai_connections"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint
-- The trail as in drizzle/0061, with one change: a row written while the
-- transaction says it came through an assistant (`app.channel = 'mcp'`,
-- set by withOrgContext for /api/mcp) is the person's, marked
-- 'ai_connection' instead of 'user', so a check-in or a draft that came
-- through an assistant can be told apart in the trail.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org text := nullif(current_setting('app.org_id', true), '');
  v_actor text := nullif(current_setting('app.user_id', true), '');
  v_before jsonb;
  v_after jsonb;
  v_entity_id text;
  v_row_org text;
BEGIN
  -- The heavy columns, emptied on the trigger's copy of the row before it
  -- becomes jsonb. Each name is only resolved on its own table.
  IF TG_TABLE_NAME IN ('activity_files', 'org_images', 'device_inbox') THEN
    IF TG_OP <> 'DELETE' THEN NEW.bytes := NULL; END IF;
    IF TG_OP <> 'INSERT' THEN OLD.bytes := NULL; END IF;
  ELSIF TG_TABLE_NAME = 'activities' THEN
    IF TG_OP <> 'DELETE' THEN NEW.streams := NULL; END IF;
    IF TG_OP <> 'INSERT' THEN OLD.streams := NULL; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  ELSE
    v_before := to_jsonb(OLD);
    -- A row going with its workspace: the workspace's deletion is the
    -- event, recorded once by whoever deleted it.
    IF TG_TABLE_NAME <> 'organizations' THEN
      v_row_org := coalesce(v_before ->> 'org_id', v_before ->> 'organization_id');
      IF v_row_org IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_row_org) THEN
        RETURN OLD;
      END IF;
    END IF;
  END IF;

  IF v_org IS NULL THEN
    v_org := coalesce(
      v_after ->> 'org_id',
      v_before ->> 'org_id',
      v_after ->> 'organization_id',
      v_before ->> 'organization_id'
    );
    IF v_org IS NULL AND TG_TABLE_NAME = 'organizations' THEN
      v_org := coalesce(v_after ->> 'id', v_before ->> 'id');
    END IF;
  END IF;

  v_entity_id := coalesce(v_after ->> 'id', v_before ->> 'id');

  INSERT INTO audit_log (
    org_id, actor_user_id, actor_type, action,
    entity_type, entity_id, before_data, after_data
  )
  VALUES (
    v_org,
    v_actor,
    CASE
      WHEN v_actor IS NULL THEN 'system'
      WHEN current_setting('app.channel', true) = 'mcp' THEN 'ai_connection'
      ELSE 'user'
    END,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    audit_redact(v_before),
    audit_redact(v_after)
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

ALTER TABLE "demo_workspaces" ADD COLUMN "accounts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- The demo's other accounts are recorded after they exist (src/modules/demo/roles.ts).
GRANT UPDATE ON TABLE demo_workspaces TO kadence_auth;

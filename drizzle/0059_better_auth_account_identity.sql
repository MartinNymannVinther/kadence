-- Better Auth 1.7.1 -> 1.7.14 (docs/adr/0111). Versions 1.7.0 to 1.7.2
-- scoped an account by an "issuer" ("local:credential" for a password) with
-- a unique index on (issuer, account_id). 1.7.3 went back to 1.6's
-- identity: an account is known by (provider_id, account_id), and Better
-- Auth never writes the issuer again. Its upgrade guide asks for the column
-- to be relaxed and its index dropped; dropping the column is optional.
-- Since 1.7.3 Better Auth also refuses every request while a column it
-- never writes is NOT NULL without a default.
--
-- Nothing is dropped: every issuer stays where it is. Version 1.7.1 signs a
-- password in only when the row says "local:credential", so a rollback to
-- it must find that value on rows the new version made too — the trigger
-- at the end writes it. The column and the trigger go together in a later
-- migration, once nobody needs to roll back.
--
-- Safe for the old app while it runs on the migrated database: it keeps
-- writing and reading the issuer, and it never relied on the index.
--
-- Better Auth refuses a lookup that finds two accounts for one provider and
-- id. The old index made that impossible for passwords (one issuer per
-- provider); say so plainly if a row slipped past it, and change nothing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "accounts" GROUP BY "provider_id", "account_id" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'accounts: two rows share a provider and account id, and Better Auth 1.7.3 and later cannot sign that person in. Merge them by hand, then migrate again (docs/adr/0111).';
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX "accounts_issuer_account_uq";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "issuer" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_uq" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
-- What 1.7.1 wrote for a password account (createLocalAccountIssuer in
-- @better-auth/core), for the rows the new version leaves without one.
-- Only the password provider: it is the only one Kadence signs in with,
-- and the only one whose value 1.7.1 derived from the provider alone.
CREATE FUNCTION accounts_fill_issuer() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NEW.issuer IS NULL AND NEW.provider_id = 'credential' THEN
    NEW.issuer := 'local:credential';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER accounts_fill_issuer
  BEFORE INSERT ON "accounts"
  FOR EACH ROW EXECUTE FUNCTION accounts_fill_issuer();

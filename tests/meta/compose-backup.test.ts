import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * docker-compose.backup.yml (docs/adr/0089) replaces the database's
 * command, because compose cannot add to one. These keep it honest: every
 * Postgres flag docker-compose.yml sets is set again there with the same
 * value, the archive settings are only there, nothing secret has a
 * default, and the plain compose file is untouched by the backup.
 */

const base = readFileSync("docker-compose.yml", "utf8");
const backup = readFileSync("docker-compose.backup.yml", "utf8");
const conf = readFileSync("docker/pgbackrest/pgbackrest.conf", "utf8");

/** The `-c key=value` flags in the db service's command, in order. */
function dbFlags(compose: string): Map<string, string> {
  const db = compose.slice(compose.indexOf("\n  db:\n"));
  const command = db.slice(db.indexOf("    command:\n"));
  const flags = new Map<string, string>();
  for (const line of command.split("\n").slice(1)) {
    const item = /^ {6}- (.*)$/.exec(line);
    if (!item) break;
    const [key, ...value] = item[1]!.split("=");
    if (value.length > 0) flags.set(key!, value.join("="));
  }
  return flags;
}

describe("the backup overlay", () => {
  it("keeps every Postgres setting of the plain compose file", () => {
    const plain = dbFlags(base);
    const withBackup = dbFlags(backup);
    expect(plain.size).toBeGreaterThan(5);
    for (const [key, value] of plain) expect(withBackup.get(key), key).toBe(value);
  });

  it("archives WAL to pgBackRest at least once a minute, and only there", () => {
    const withBackup = dbFlags(backup);
    expect(withBackup.get("archive_mode")).toBe("on");
    expect(withBackup.get("wal_level")).toBe("replica");
    expect(withBackup.get("archive_timeout")).toBe("60");
    expect(withBackup.get("archive_command")).toBe("pgbackrest --stanza=kadence archive-push %p");
    expect(dbFlags(base).has("archive_mode")).toBe(false);
    expect(base).not.toContain("pgbackrest");
  });

  it("takes every repository setting and secret from the environment, with no default", () => {
    for (const name of [
      "S3_BACKUP_BUCKET",
      "S3_BACKUP_ENDPOINT",
      "S3_BACKUP_REGION",
      "S3_BACKUP_ACCESS_KEY",
      "S3_BACKUP_SECRET_KEY",
      "PGBACKREST_REPO_CIPHER_PASS",
    ]) {
      expect(backup, name).toMatch(new RegExp(`\\$\\{${name}:\\?`));
    }
    expect(conf).not.toMatch(/^repo1-(s3-(bucket|endpoint|region|key|key-secret)|cipher-pass)=/m);
  });

  it("encrypts, and keeps no more than the thirty days the terms promise", () => {
    expect(conf).toMatch(/^repo1-cipher-type=aes-256-cbc$/m);
    expect(conf).toMatch(/^repo1-retention-full-type=time$/m);
    // Time-based retention keeps the newest full backup older than the
    // window, so 29 days of window is at most 30 days of data.
    expect(conf).toMatch(/^repo1-retention-full=29$/m);
  });
});

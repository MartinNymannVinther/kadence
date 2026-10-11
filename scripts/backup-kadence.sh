#!/usr/bin/env bash
#
# Nightly encrypted backup of the Kadence database to EU object storage.
#
# Runs on the VPS, not in the container. Install as /root/backup-kadence.sh
# (chmod 700) and schedule it from cron; see docs/deploy.md.
#
# The dump is encrypted before it ever leaves the machine, with a public
# key. The matching private key belongs in your password manager and
# nowhere else: a backup an attacker on the server can read is a copy of
# every project, plan and decision you have.
#
# BACKUP_PING_URL, if set, is an Uptime Kuma push monitor's URL (or
# anything that answers the same convention): hit plain on success, with
# `?status=down&msg=<why>` on failure, so a backup that stops running
# quietly becomes a loud alert instead (docs/deploy.md, "Monitoring").
# Optional; the backup runs exactly the same without it.
#
# Requires: docker, age, rclone (with an EU remote configured), curl
# when BACKUP_PING_URL is set.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
RECIPIENT_FILE="${RECIPIENT_FILE:-/root/kadence-backup.pub}"
REMOTE="${REMOTE:-eu-storage:kadence-backups}"
# What the terms page promises a workspace: thirty days, here and in the
# bucket. Both ends are applied below, because a retention policy that
# only prunes the copy you can see is not a retention policy.
KEEP_DAYS="${KEEP_DAYS:-30}"
# On a server that also runs Haij there is more than one "db" container,
# so name Kadence's explicitly (docker ps, then DB_CONTAINER=<id> in cron).
DB_CONTAINER="${DB_CONTAINER:-$(docker ps -qf name=db | head -1)}"
BACKUP_PING_URL="${BACKUP_PING_URL:-}"

# Never lets a monitoring hiccup fail the backup itself: a push that
# never arrives is the monitor's job to notice (it alerts on silence),
# not this script's job to insist on delivering.
ping_backup() {
  [[ -z "$BACKUP_PING_URL" ]] && return 0
  local url="$BACKUP_PING_URL"
  if [[ "${1:-}" == "down" ]]; then
    local msg="${2:-failed}"
    url="${url}?status=down&msg=${msg// /%20}"
  fi
  curl -fsS -m 10 "$url" >/dev/null 2>&1 || true
}

# `exit` does not itself trigger the ERR trap (only a failing command
# does), so the two checks below ping explicitly; everything from the
# dump onward is covered by the trap.
trap 'ping_backup down "backup-kadence failed at line $LINENO"' ERR

if [[ -z "$DB_CONTAINER" ]]; then
  echo "backup-kadence: no database container found" >&2
  ping_backup down "no database container found"
  exit 1
fi
if [[ ! -r "$RECIPIENT_FILE" ]]; then
  echo "backup-kadence: no age recipient at $RECIPIENT_FILE" >&2
  ping_backup down "no age recipient at $RECIPIENT_FILE"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%F-%H%M)
TARGET="$BACKUP_DIR/kadence-$STAMP.dump.age"

# Write to a temporary name first: a half-written file that looks like a
# backup is worse than no file at all, because you will trust it.
# The counters (app_rate_limits, docs/adr/0083) are unlogged and
# throwaway, and some of their keys are addresses: their table is in the
# dump, their rows are not.
docker exec "$DB_CONTAINER" pg_dump -U postgres -Fc --no-unlogged-table-data kadence \
  | age -r "$(cat "$RECIPIENT_FILE")" \
  > "$TARGET.partial"
mv "$TARGET.partial" "$TARGET"

rclone copy "$TARGET" "$REMOTE/"

find "$BACKUP_DIR" -name 'kadence-*.dump.age' -mtime "+$KEEP_DAYS" -delete
rclone delete --min-age "${KEEP_DAYS}d" "$REMOTE/"

echo "backup-kadence: $TARGET ($(stat -c %s "$TARGET") bytes) -> $REMOTE/"
ping_backup up

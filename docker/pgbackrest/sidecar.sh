#!/usr/bin/env bash
#
# The pgBackRest sidecar (docker-compose.backup.yml, docs/deploy.md §7).
#
# Waits for the database, creates the stanza (a no-op when it exists),
# checks that WAL reaches the repository, takes a first full backup when
# the repository has none, and then one full backup every night at
# BACKUP_PGBACKREST_AT, Copenhagen time. pgBackRest expires what the
# retention in pgbackrest.conf no longer needs after each backup.
#
# The WAL itself never passes through here: Postgres hands each segment
# to `pgbackrest archive-push` in its own container, at least once a
# minute while anything is written (archive_timeout=60).
#
# BACKUP_PGBACKREST_PING_URL, when set, is an Uptime Kuma push monitor's
# URL, hit plain after a backup that worked and with ?status=down after
# one that did not, as scripts/backup-kadence.sh does for the dump.

set -uo pipefail

STANZA=kadence
# 03:40 exists on every day of the year in Copenhagen; 02:xx does not on
# the night the clocks go forward. Not PGBACKREST_*: pgBackRest reads
# every variable by that name as one of its own options.
AT="${BACKUP_PGBACKREST_AT:-03:40}"
PING_URL="${BACKUP_PGBACKREST_PING_URL:-}"

say() { echo "kadence-pgbackrest: $*"; }

ping_monitor() {
  [[ -z "$PING_URL" ]] && return 0
  local url="$PING_URL"
  [[ "${1:-}" == "down" ]] && url="${url}?status=down&msg=${2// /%20}"
  curl -fsS -m 10 "$url" >/dev/null 2>&1 || true
}

full_backup() {
  say "full backup starting"
  if pgbackrest --stanza="$STANZA" --type=full backup; then
    say "full backup done"
    ping_monitor up
  else
    say "full backup FAILED"
    ping_monitor down "pgbackrest full backup failed"
  fi
}

until pg_isready -q -h /var/run/postgresql -U postgres; do
  say "waiting for the database"
  sleep 5
done

until pgbackrest --stanza="$STANZA" stanza-create; do
  say "stanza-create failed; trying again in a minute"
  ping_monitor down "pgbackrest stanza-create failed"
  sleep 60
done

# Proves the whole path: a WAL switch, archive-push from the database's
# container, and the segment arriving in the repository.
if ! pgbackrest --stanza="$STANZA" check; then
  say "check FAILED: WAL is not reaching the repository"
  ping_monitor down "pgbackrest check failed"
fi

if ! pgbackrest --stanza="$STANZA" --output=json info | grep -q '"type":"full"'; then
  full_backup
fi

while true; do
  now=$(date +%s)
  next=$(date -d "today $AT" +%s)
  ((next <= now)) && next=$(date -d "tomorrow $AT" +%s)
  say "next full backup at $(date -d "@$next" '+%F %R %Z')"
  sleep $((next - now))
  full_backup
done

#!/usr/bin/env bash
#
# The restore drill, inside a throwaway container of the pgBackRest image
# (scripts/restore-drill.sh starts it; docs/deploy.md §7).
#
#   kadence-restore-drill                         the latest point there is
#   kadence-restore-drill --target "<timestamp>"  a point in time, e.g.
#                                                 "2026-10-11 14:05:00+02"
#
# Restores the repository into /tmp/drill, starts Postgres on a socket
# nobody else can reach with archiving off — the drill must never push a
# WAL segment of its own into the repository it is testing — waits for
# recovery to finish, asks Kadence's own questions, prints the point it
# recovered to, and stops. The container is removed by whoever started it.

set -euo pipefail

STANZA=kadence
DIR=/tmp/drill
DATA="$DIR/data"
target=()
if [[ "${1:-}" == "--target" && -n "${2:-}" ]]; then
  target=(--type=time "--target=$2" --target-action=promote)
fi

say() { echo "restore-drill: $*"; }

say "what the repository holds"
pgbackrest --stanza="$STANZA" info

mkdir -p "$DATA"
chmod 700 "$DATA"
say "restoring${2:+ to $2}"
pgbackrest --stanza="$STANZA" --pg1-path="$DATA" --archive-mode=off "${target[@]}" restore

postgres -D "$DATA" \
  -c listen_addresses='' \
  -c unix_socket_directories="$DIR" \
  -c archive_mode=off \
  -c shared_preload_libraries='' \
  >"$DIR/postgres.log" 2>&1 &

ask() { psql -X -q -h "$DIR" -U postgres -d kadence -tA -c "$1"; }

for _ in $(seq 1 600); do
  if pg_isready -q -h "$DIR" -U postgres && [[ "$(ask 'select pg_is_in_recovery()' 2>/dev/null)" == "f" ]]; then
    break
  fi
  sleep 1
done
if [[ "$(ask 'select pg_is_in_recovery()' 2>/dev/null || true)" != "f" ]]; then
  say "the restored database did not finish recovery; its log:"
  tail -40 "$DIR/postgres.log"
  exit 1
fi

say "users:          $(ask 'select count(*) from users')"
say "workspaces:     $(ask 'select count(*) from organizations')"
say "riders:         $(ask 'select count(*) from riders')"
say "rides:          $(ask 'select count(*) from activities')"
say "migrations:     $(ask 'select count(*) from drizzle.__drizzle_migrations')"
say "last change:    $(ask 'select max(created_at) from audit_log')"
say "recovery point: $(ask 'select pg_last_xact_replay_timestamp()')"

pg_ctl -D "$DATA" -m fast -w stop >/dev/null
say "ok"

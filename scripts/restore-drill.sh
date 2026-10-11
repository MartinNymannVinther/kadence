#!/usr/bin/env bash
#
# The quarterly restore drill for pgBackRest (docs/deploy.md §7).
#
#   scripts/restore-drill.sh                         the latest point there is
#   scripts/restore-drill.sh --target "<timestamp>"  a point in time, e.g.
#                                                    "2026-10-11 14:05:00+02"
#
# Runs on the VPS next to the stack started with docker-compose.backup.yml.
# Starts a throwaway container from the sidecar's own image, with the
# sidecar's own repository settings, restores the backup into that
# container's scratch space, starts Postgres there with archiving off,
# counts users and asks Kadence's other health questions, prints the
# point it recovered to, and removes the container. The running database
# and its files are never touched, and nothing is written to the
# repository. It needs free disk about the size of the database.
#
# The settings and keys are read from the running sidecar and handed to
# the scratch container on a pipe, so no secret is written to a file or
# shown on a command line.
#
# PGBACKREST_CONTAINER names the sidecar when `docker ps` would find more
# than one; DRILL_DOCKER_ARGS adds arguments to `docker run` (a local test
# with a file repository mounts its volume that way).

set -euo pipefail

SIDECAR="${PGBACKREST_CONTAINER:-$(docker ps -qf name=pgbackrest | head -1)}"
if [[ -z "$SIDECAR" ]]; then
  echo "restore-drill: no pgbackrest container is running (docker-compose.backup.yml)" >&2
  exit 1
fi

IMAGE=$(docker inspect -f '{{.Config.Image}}' "$SIDECAR")
NAME="kadence-restore-drill-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

# shellcheck disable=SC2086 # DRILL_DOCKER_ARGS is a list of arguments on purpose.
docker run --rm --name "$NAME" --user postgres \
  --env-file <(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$SIDECAR" |
    grep -E '^(PGBACKREST_REPO1_|TZ=)') \
  ${DRILL_DOCKER_ARGS:-} \
  --entrypoint /usr/local/bin/kadence-restore-drill \
  "$IMAGE" "$@"

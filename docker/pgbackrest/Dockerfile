# Postgres with pgBackRest beside it (docs/adr/0089, docs/deploy.md §7).
#
# One image for two services in docker-compose.backup.yml: the database,
# whose archive_command hands every finished WAL segment to pgBackRest,
# and the sidecar that takes the nightly full backup. Postgres runs
# archive_command inside its own container, so the binary has to be in
# the database's image whatever the sidecar is; building both from this
# file is what keeps the two on the same pgBackRest version, which the
# repository format asks for.
#
# pgBackRest comes from apt.postgresql.org (PGDG), the repository the
# official postgres image is itself built from and already trusts, so no
# third party joins the chain. The version is pinned: a new pgBackRest is
# a change somebody reads the release notes for, not something a rebuild
# picks up. When the base image moves to a Debian release where this
# version is not published, the build fails and says so.
FROM postgres:16

ARG PGBACKREST_VERSION=2.59.3

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    "pgbackrest=${PGBACKREST_VERSION}-*" \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/* \
  && install -d -o postgres -g postgres -m 0750 \
    /var/lib/pgbackrest /var/log/pgbackrest /var/spool/pgbackrest /tmp/pgbackrest

COPY pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
COPY sidecar.sh /usr/local/bin/kadence-pgbackrest-sidecar
COPY drill.sh /usr/local/bin/kadence-restore-drill
RUN chmod 0644 /etc/pgbackrest/pgbackrest.conf \
  && chmod 0755 /usr/local/bin/kadence-pgbackrest-sidecar /usr/local/bin/kadence-restore-drill

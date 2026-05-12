#!/usr/bin/env bash
# scripts/graalvm-pgo/pgo-reset-db.sh
#
# Truncates the application tables in the running Postgres container so each
# load test in the native-release-pgo comparison starts from an equivalent
# empty-app state. Called from the `native-release-pgo` profile between tests:
#   test-normal       → reset-db-after-normal       → build-instrumented
#   test-instrumented → reset-db-after-instrumented → build-optimized
#
# Why TRUNCATE (vs `docker compose down -v && up -d`):
#   - <1 second per call instead of 30-60+ seconds
#   - Keeps the container running, preserving Postgres page cache + autovacuum
#     state across tests (each test sees a hot PG, removing cold-cache bias)
#   - Schema stays — Flyway migrations don't re-run
#
# `TRUNCATE user_account CASCADE` alone would suffice (the FK graph cascades
# through every app table), but listing tables explicitly makes the intent
# obvious and protects against future schema changes that might break the
# cascade chain.

set -euo pipefail

CONTAINER="$(docker ps --filter ancestor=postgres:18 --format '{{.Names}}' | head -1)"
[ -n "$CONTAINER" ] || { echo "pgo-reset-db: no postgres:18 container running" >&2; exit 1; }

echo "===== Truncating application tables in $CONTAINER ====="
docker exec "$CONTAINER" psql -U postgres -d oppshan_pgo -v ON_ERROR_STOP=1 -c "
    TRUNCATE
        user_account,
        idp_account,
        google_account,
        user_storage,
        file_node
    CASCADE;
"
echo "pgo-reset-db: done"

#!/usr/bin/env bash
# scripts/graalvm-pgo/pgo-test-binary.sh <label>
#
# Launches the native binary at target/runners/<label>-runner, drives the
# workload against it via parallel-workload.sh, stops the binary, and writes
# a metrics file to target/comparison/<label>.metrics. The pom.xml `pgo`
# profile invokes this three times in lifecycle phases — once per native
# binary (normal / instrumented / optimized).
#
# For the instrumented run, the captured default.iprof is also copied to
# target/pgo-run/default.iprof so the subsequent build-optimized quarkus:build
# execution can find it at the default path baked into
# --pgo=${project.build.directory}/pgo-run/default.iprof.

set -euo pipefail

LABEL="${1:?usage: pgo-test-binary.sh <normal|instrumented|optimized>}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

RUNNER="$PROJECT_DIR/target/runners/${LABEL}-runner"
RUN_DIR="$PROJECT_DIR/target/pgo-run-${LABEL}"
COMPARISON_DIR="$PROJECT_DIR/target/comparison"
BINARY_LOG="$COMPARISON_DIR/${LABEL}.binary.log"
METRICS_FILE="$COMPARISON_DIR/${LABEL}.metrics"
SHARED_IPROF_DIR="$PROJECT_DIR/target/pgo-run"

mkdir -p "$RUN_DIR" "$COMPARISON_DIR" "$SHARED_IPROF_DIR"

# Host ports + Quarkus runtime env.
PG_HOST_PORT="${PG_HOST_PORT:-55432}"
KC_HOST_PORT="${KC_HOST_PORT:-8180}"
export PG_HOST_PORT KC_HOST_PORT

export QUARKUS_DATASOURCE_JDBC_URL="jdbc:postgresql://localhost:${PG_HOST_PORT}/oppshan_pgo"
export QUARKUS_DATASOURCE_USERNAME=postgres
export QUARKUS_DATASOURCE_PASSWORD=postgres
export QUARKUS_OIDC_GOOGLE_AUTH_SERVER_URL="http://localhost:${KC_HOST_PORT}/realms/oppshan-pgo"

: "${PGO_OIDC_CLIENT_SECRET:=pgo-client-secret-change-me}"
: "${TOKEN_ENCRYPTION_SECRET:=$(openssl rand -hex 32)}"
: "${APP_STORAGE_ENCRYPTION_PASSPHRASE:=$(openssl rand -hex 32)}"
export PGO_OIDC_CLIENT_SECRET TOKEN_ENCRYPTION_SECRET APP_STORAGE_ENCRYPTION_PASSPHRASE
export APP_STORAGE_USER_MAX_BYTES=1073741824

WORKER_COUNT="${WORKER_COUNT:-10}"
LOOP_SECONDS="${LOOP_SECONDS:-300}"
export WORKER_COUNT LOOP_SECONDS

PGO_PID=""
cleanup() {
    local rc=$?
    if [ -n "$PGO_PID" ]; then
        kill -TERM "$PGO_PID" 2>/dev/null || true
        local i=0
        while [ $i -lt 15 ] && kill -0 "$PGO_PID" 2>/dev/null; do sleep 1; i=$((i+1)); done
        kill -KILL "$PGO_PID" 2>/dev/null || true
    fi
    # docker compose teardown is owned by pgo-build.sh's EXIT/INT/TERM trap.
    # The wrapper covers all build-level exit paths; per-script teardown here
    # would break the multi-test orchestration (tests 2 and 3 need the stack
    # still up after test 1 in the same Maven build).
    return $rc
}
trap cleanup EXIT INT TERM

echo "===== Testing '${LABEL}' binary ====="
[ -x "$RUNNER" ] || { echo "runner not found at $RUNNER" >&2; exit 1; }
RUNNER_SIZE="$(wc -c < "$RUNNER" | tr -d ' ')"
echo "Runner: $RUNNER ($RUNNER_SIZE bytes)"

# Launch binary with prod-matched flags. Instrumented binary will write
# default.iprof to its cwd on shutdown.
(cd "$RUN_DIR" && QUARKUS_PROFILE=pgo "$RUNNER" \
    -Djdk.virtualThreadScheduler.parallelism="$(nproc)" \
    > "$BINARY_LOG" 2>&1) &
PGO_PID=$!

# Wait for readiness.
i=0
until (echo > /dev/tcp/localhost/8080) 2>/dev/null; do
    i=$((i+1)); [ $i -ge 90 ] && { echo "binary did not open :8080 in 90s" >&2; exit 1; }
    sleep 1
done
i=0
until [ "$(curl --silent --output /dev/null --write-out '%{http_code}' http://localhost:8080/api/auth/me)" = "401" ]; do
    i=$((i+1)); [ $i -ge 30 ] && { echo "binary not serving /api/auth/me 401 in 30s" >&2; exit 1; }
    sleep 1
done
echo "Binary ready."

# Drive workload.
WORKLOAD_START=$(date +%s)
WORKERS_LOG_DIR_BEFORE="$(ls -dt /tmp/pgo-workers-*/ 2>/dev/null | head -1 || echo none)"
bash "$PROJECT_DIR/scripts/graalvm-pgo/parallel-workload.sh"
WORKLOAD_END=$(date +%s)

# Stop binary (instrumented needs a clean SIGTERM so it flushes default.iprof).
kill -TERM "$PGO_PID" 2>/dev/null || true
i=0
while [ $i -lt 15 ] && kill -0 "$PGO_PID" 2>/dev/null; do sleep 1; i=$((i+1)); done
kill -KILL "$PGO_PID" 2>/dev/null || true
PGO_PID=""

# For instrumented, hand the iprof to the next quarkus:build execution by
# copying it to the shared path baked into the pom's --pgo= argument.
if [ "$LABEL" = "instrumented" ]; then
    if [ -s "$RUN_DIR/default.iprof" ]; then
        cp "$RUN_DIR/default.iprof" "$SHARED_IPROF_DIR/default.iprof"
        echo "Captured iprof: $(wc -c < "$SHARED_IPROF_DIR/default.iprof" | tr -d ' ') bytes at $SHARED_IPROF_DIR/default.iprof"
    else
        echo "WARNING: instrumented binary produced no default.iprof — optimized build will use empty/stale profile" >&2
    fi
fi

# Locate the worker-log directory parallel-workload.sh just created (newer than
# the snapshot we took before invocation).
WORKERS_LOG_DIR="$(ls -dt /tmp/pgo-workers-*/ | head -1)"

# Parse metrics.
WORKERS_OK=0
TOTAL_ITERS=0
for n in $(seq 1 "$WORKER_COUNT"); do
    log="$WORKERS_LOG_DIR/worker-$n.log"
    if grep -q ": done" "$log" 2>/dev/null; then
        WORKERS_OK=$((WORKERS_OK + 1))
        iter=$(grep 'completed' "$log" | grep -oE '[0-9]+ iterations' | head -1 | grep -oE '[0-9]+' || echo 0)
        TOTAL_ITERS=$((TOTAL_ITERS + iter))
    fi
done
# grep -c prints the count (including "0") on stdout AND exits non-zero when
# nothing matched. `|| echo 0` would append an extra "0" — captured value
# becomes "0\n0", which then writes a stray "0" line into the metrics file
# and explodes when pgo-compare.sh tries to source it. Use `|| true` to swallow
# the exit code; the count grep already printed is what we want.
SLOW_COUNT="$(grep -c 'Slow query took' "$BINARY_LOG" 2>/dev/null || true)"
SLOW_COUNT="${SLOW_COUNT:-0}"
SLOW_WORST="$(grep -oE 'took [0-9]+ milliseconds' "$BINARY_LOG" 2>/dev/null \
    | grep -oE '[0-9]+' | sort -n | tail -1 || true)"
SLOW_WORST="${SLOW_WORST:-0}"
DURATION=$((WORKLOAD_END - WORKLOAD_START))

cat > "$METRICS_FILE" <<EOF
LABEL=$LABEL
RUNNER_SIZE=$RUNNER_SIZE
WORKERS_OK=$WORKERS_OK
WORKER_COUNT=$WORKER_COUNT
TOTAL_ITERS=$TOTAL_ITERS
SLOW_COUNT=$SLOW_COUNT
SLOW_WORST_MS=$SLOW_WORST
DURATION_S=$DURATION
EOF

echo "'${LABEL}' metrics:"
sed 's/^/  /' "$METRICS_FILE"
echo "pgo-test-binary.sh: done"

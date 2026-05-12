#!/usr/bin/env bash
# scripts/graalvm-pgo/parallel-workload.sh
#
# Spawns WORKER_COUNT (default 10) workload.sh instances in parallel, each
# driving a distinct Keycloak user. Each worker has its own cookie jar so
# session state is isolated; storage is partitioned by user so file ops
# can't collide across workers.
#
# Logs are written per-worker to /tmp/pgo-workers-$$/worker-N.log so the
# parent log (tee'd by the Maven exec) stays readable. On exit
# the script prints a per-worker status table and tails any failed logs.

set -uo pipefail

WORKER_COUNT="${WORKER_COUNT:-10}"
LOOP_SECONDS="${LOOP_SECONDS:-300}"
KC_USER="${KC_USER:-tester}"
KC_USER_PASSWORD="${KC_USER_PASSWORD:-tester-password}"
# Minimum number of workers that must succeed for the script to exit 0. Any
# successful worker contributes real samples to the iprof, so by default we
# accept the run as long as at least 1 worker completed. Override e.g.
# WORKER_SUCCESS_MIN=8 if you want stricter gating in CI.
WORKER_SUCCESS_MIN="${WORKER_SUCCESS_MIN:-1}"

WORKER_LOG_DIR="/tmp/pgo-workers-$$"
mkdir -p "$WORKER_LOG_DIR"

cleanup_parent() {
    # If we're exiting while workers are still running (e.g., parent killed by
    # pgo-resume.sh cleanup trap), signal them so they tear down gracefully.
    pkill -P $$ 2>/dev/null || true
    wait 2>/dev/null || true
}
trap cleanup_parent EXIT INT TERM

echo "parallel-workload: spawning $WORKER_COUNT workers, LOOP_SECONDS=$LOOP_SECONDS"
echo "parallel-workload: per-worker logs in $WORKER_LOG_DIR"

declare -a PIDS=()
# Stagger worker spawns by WORKER_SPAWN_DELAY seconds to spread the bootstrap
# burst. Without this, 10 workers all racing through sign-in + 5 folder creates
# + 4 seed uploads simultaneously saturates the instrumented binary's contended
# code paths and tail-latency requests time out.
WORKER_SPAWN_DELAY="${WORKER_SPAWN_DELAY:-2}"
for n in $(seq 1 "$WORKER_COUNT"); do
    KC_USER="${KC_USER}-${n}" \
    KC_USER_EMAIL="${KC_USER}-${n}@example.com" \
    KC_USER_PASSWORD="$KC_USER_PASSWORD" \
    COOKIE_JAR="/tmp/pgo-cookies-$$-${n}.txt" \
    LOOP_SECONDS="$LOOP_SECONDS" \
        bash "$(dirname "$0")/workload.sh" > "$WORKER_LOG_DIR/worker-${n}.log" 2>&1 &
    PIDS+=("$!")
    if [ "$n" -lt "$WORKER_COUNT" ]; then
        sleep "$WORKER_SPAWN_DELAY"
    fi
done

for n in $(seq 1 "$WORKER_COUNT"); do
    echo "  worker $n: pid ${PIDS[$((n-1))]}"
done

echo "parallel-workload: waiting for $WORKER_COUNT workers (up to ${LOOP_SECONDS}s + bootstrap/teardown)"

FAILED=0
for n in $(seq 1 "$WORKER_COUNT"); do
    pid="${PIDS[$((n-1))]}"
    if wait "$pid"; then
        echo "  worker $n (pid $pid): ok"
    else
        rc=$?
        echo "  worker $n (pid $pid): FAILED (rc=$rc)"
        FAILED=$((FAILED + 1))
    fi
done

SUCCEEDED=$((WORKER_COUNT - FAILED))

if [ "$FAILED" -gt 0 ]; then
    echo "parallel-workload: $FAILED of $WORKER_COUNT workers failed"
    echo "parallel-workload: tail of failed-worker logs:"
    for n in $(seq 1 "$WORKER_COUNT"); do
        log="$WORKER_LOG_DIR/worker-${n}.log"
        if ! grep -q "workload\[.*\]: done" "$log" 2>/dev/null; then
            echo "--- worker $n (last 30 lines of $log) ---"
            tail -30 "$log"
        fi
    done
fi

if [ "$SUCCEEDED" -lt "$WORKER_SUCCESS_MIN" ]; then
    echo "parallel-workload: only $SUCCEEDED of $WORKER_COUNT workers succeeded (minimum $WORKER_SUCCESS_MIN) — aborting"
    exit 1
fi

echo "parallel-workload: $SUCCEEDED of $WORKER_COUNT workers completed — iprof has real samples from $SUCCEEDED concurrent users"
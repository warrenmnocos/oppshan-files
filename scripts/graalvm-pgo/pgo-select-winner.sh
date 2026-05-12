#!/usr/bin/env bash
# scripts/graalvm-pgo/pgo-select-winner.sh
#
# Picks between the normal and optimized native binaries by total-iterations
# (higher = more throughput on the same workload). Copies the winner back to
# the canonical target/oppshan-files-*-runner location so the rest of the
# build (deploy.yml S3 upload, etc.) finds the better artifact at the standard
# path. Deletes the instrumented binary — it's a throwaway used only to
# capture the profile.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNNERS_DIR="$PROJECT_DIR/target/runners"
COMPARISON_DIR="$PROJECT_DIR/target/comparison"

read_iters() {
    local label="$1"
    local file="$COMPARISON_DIR/${label}.metrics"
    if [ -f "$file" ]; then
        # shellcheck disable=SC1090
        source "$file"
        printf '%d' "${TOTAL_ITERS:-0}"
    else
        printf '0'
    fi
}

NORMAL_ITERS="$(read_iters normal)"
OPTIMIZED_ITERS="$(read_iters optimized)"

echo "===== Selecting winner (normal vs optimized) ====="
echo "Normal:    $NORMAL_ITERS total iterations"
echo "Optimized: $OPTIMIZED_ITERS total iterations"

if [ "$OPTIMIZED_ITERS" -gt "$NORMAL_ITERS" ]; then
    WINNER=optimized
    LOSER=normal
elif [ "$NORMAL_ITERS" -gt "$OPTIMIZED_ITERS" ]; then
    WINNER=normal
    LOSER=optimized
else
    # Tie-breaker: prefer the optimized binary on equal iters, since PGO is
    # the whole point — equal throughput means at minimum the optimized binary
    # isn't worse, and it may be better on metrics the workload didn't measure.
    WINNER=optimized
    LOSER=normal
    echo "(tie on total iterations — keeping optimized as PGO-favored default)"
fi
echo "Winner: $WINNER"

# Locate the canonical runner filename. We don't know the version-suffix at
# script time, so resolve it from the saved runner's basename minus the
# label prefix.
WINNER_BINARY="$RUNNERS_DIR/${WINNER}-runner"
[ -x "$WINNER_BINARY" ] || { echo "winner binary missing at $WINNER_BINARY" >&2; exit 1; }

# Canonical runner location matches Quarkus's default output: target/${project.build.finalName}-runner.
# We don't read pom.xml here — instead, compute via the runners dir we know exists.
# Final name is hardcoded to match the project's groupId:artifactId:version layout:
#   oppshan-files-<version>-runner
# If the version ever bumps from 1.0.0-SNAPSHOT, update this path (or read it from pom).
TARGET_RUNNER="$PROJECT_DIR/target/oppshan-files-1.0.0-SNAPSHOT-runner"

cp "$WINNER_BINARY" "$TARGET_RUNNER"
chmod +x "$TARGET_RUNNER"
echo "Copied $WINNER binary to $TARGET_RUNNER"

# Delete instrumented (throwaway profiling artifact).
rm -f "$RUNNERS_DIR/instrumented-runner"
echo "Deleted instrumented binary (throwaway)"

echo "pgo-select-winner.sh: done"

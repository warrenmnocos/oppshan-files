# GraalVM PGO pipeline

Builds a profile-guided-optimized native binary with an empirical A/B/C comparison: normal, instrumented, and optimized variants are each built and load-tested against a 10-worker × 5-minute workload, and the higher-throughput of normal-vs-optimized ships as the deploy artifact.

## Canonical invocation

```bash
bash scripts/graalvm-pgo/pgo-build.sh install -DskipTests
# Windows:
pwsh scripts/graalvm-pgo/pgo-build.ps1 install -DskipTests
```

The wrapper invokes `./mvnw -P native-release-pgo` with an `EXIT/INT/TERM` trap that tears down the docker compose stack on every exit path: success, failure, or interruption. Calling `mvn` directly with the profile also works, but the docker compose stack only comes down on the happy path (via the `post-integration-test` execution); a halted build leaves Postgres + Keycloak orphaned, and you have to `docker compose -f scripts/graalvm-pgo/docker-compose.yml down -v` by hand.

Requires Docker running. Total wall-clock ~35 min on a 12-core box (three ~5-min builds + three ~5-min load tests + overhead).

## Maven lifecycle layout

Single reactor; no nested mvn, no shell orchestrator. The profile builds three native binaries (normal, instrumented, optimized), runs a 10-worker × 5-minute load workload against each, truncates the app tables between tests so each binary starts from an equivalent empty-app state, prints a side-by-side comparison, and copies the better of normal-vs-optimized to `target/oppshan-files-*-runner`:

| Phase | Action |
|---|---|
| `prepare-package` | `docker compose up` (Postgres 18 + Keycloak 26.5.4); `keycloak-bootstrap.sh` provisions 10 tester users; `quarkus:build` #1 → **normal** native binary (no PGO flags) |
| `package` | save normal-runner; a 60s **warmup** load (`LOOP_SECONDS=60 pgo-test-binary.sh normal`) warms the shared Postgres + Keycloak containers, then `pgo-reset-db.sh` restores empty-app state; `pgo-test-binary.sh normal` runs the measured load workload and captures metrics; `pgo-reset-db.sh` truncates app tables; `quarkus:build` #2 → **instrumented** native binary (`--pgo-instrument`) |
| `pre-integration-test` | save instrumented-runner; `pgo-test-binary.sh instrumented` runs the load workload (captures `default.iprof`); `pgo-reset-db.sh` truncates app tables; `quarkus:build` #3 → **optimized** native binary (`--pgo=target/pgo-run/default.iprof`) |
| `integration-test` | save optimized-runner; `pgo-test-binary.sh optimized` runs the load workload; `pgo-compare.sh` prints the comparison table; `pgo-select-winner.sh` copies the higher-throughput binary back to `target/oppshan-files-*-runner` and deletes the throwaway instrumented binary |
| `post-integration-test` | `docker compose down -v` |

The relaxed gate in `parallel-workload.sh` accepts any iprof with ≥1 successful worker, so a transient flake doesn't abort the run. `exec-maven-plugin` is declared before `quarkus-maven-plugin` in the profile so within any shared phase the exec executions (save + test) run before the next `quarkus:build`, giving the interleaved build → save → test → build → save → test → build → save → test sequence in a single reactor.

## Load workload per binary

`pgo-test-binary.sh` → `parallel-workload.sh` → `workload.sh`: 10 concurrent OIDC sessions × 300 seconds of randomized CRUD (sign-in → folder + file CRUD with file sizes weighted 1 KB–100 MB → sign-out). Binary launches with prod-matched flags (`-Xmx512m`, `-Djdk.virtualThreadScheduler.parallelism=$(nproc)`).

Before the first measured test, a **60-second warmup** runs the same workload against the normal binary (`LOOP_SECONDS=60`) purely to warm the shared Postgres page cache / autovacuum and Keycloak token endpoints. The DB is reset to empty between the warmup and the measured normal run. Without it the normal binary — tested first — would absorb the cold-infra penalty alone, while instrumented and optimized inherit the warm containers; the warmup makes all three comparable. The warmup's metrics file is overwritten by the measured run, and re-running the `normal` label is safe because the iprof capture is `instrumented`-only.

## Files in this directory

| File | Role |
|---|---|
| `pgo-build.sh` / `pgo-build.ps1` | Canonical wrapper with EXIT/INT/TERM teardown trap |
| `pgo-test-binary.sh` / `.ps1` | Boots one binary, drives `parallel-workload.sh` against it, captures metrics |
| `parallel-workload.sh` / `.ps1` | Spawns N concurrent `workload.sh` instances |
| `workload.sh` / `.ps1` | Per-worker CRUD loop against the local binary |
| `pgo-reset-db.sh` / `.ps1` | Truncates app tables between test runs |
| `pgo-compare.sh` / `.ps1` | Prints the side-by-side comparison table |
| `pgo-select-winner.sh` / `.ps1` | Copies the higher-throughput binary to the canonical runner path |
| `keycloak-bootstrap.sh` / `.ps1` | Provisions the 10 tester users + OIDC client |
| `docker-compose.yml` | Postgres 18 + Keycloak 26.5.4 with prod-matched PG config |
| `pg-init/01-extensions.sql` | Init script mounted into the Postgres container |

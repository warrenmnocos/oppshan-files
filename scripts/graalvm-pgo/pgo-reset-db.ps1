#!/usr/bin/env pwsh
# scripts/graalvm-pgo/pgo-reset-db.ps1
#
# PowerShell counterpart to pgo-reset-db.sh. Truncates the app tables in the
# running postgres:18 container between PGO load tests so each binary sees an
# equivalent empty-app starting state while Postgres page cache + autovacuum
# stay warm. See the .sh for rationale.

$ErrorActionPreference = 'Stop'

$container = (docker ps --filter 'ancestor=postgres:18' --format '{{.Names}}' |
    Select-Object -First 1)
if (-not $container) {
    Write-Error 'pgo-reset-db: no postgres:18 container running'
    exit 1
}

Write-Host "===== Truncating application tables in $container ====="
$sql = @'
    TRUNCATE
        user_account,
        idp_account,
        google_account,
        user_storage,
        file_node
    CASCADE;
'@
docker exec $container psql -U postgres -d oppshan_pgo -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'pgo-reset-db: done'

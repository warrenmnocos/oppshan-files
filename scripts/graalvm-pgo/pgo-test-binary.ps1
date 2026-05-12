#!/usr/bin/env pwsh
# scripts/graalvm-pgo/pgo-test-binary.ps1 <label>
#
# PowerShell counterpart to pgo-test-binary.sh. Launches the native binary at
# target/runners/<label>-runner, drives parallel-workload.ps1 against it,
# stops the binary, and writes target/comparison/<label>.metrics. The pom.xml
# native-release-pgo profile invokes this three times per native binary
# (normal / instrumented / optimized) when running on Windows.
#
# Note on the instrumented run: GraalVM's PGO flush relies on the binary
# receiving a clean shutdown signal. On POSIX SIGTERM does the job; on Windows
# Stop-Process is hard-kill, so the iprof may be missing or partial. The
# canonical PGO build path is the Linux CI workflow; this script is here for
# local development on Windows.

param([Parameter(Mandatory = $true)][string]$Label)

$ErrorActionPreference = 'Stop'

$ProjectDir     = (Resolve-Path (Join-Path $PSScriptRoot '..' '..')).Path
Set-Location $ProjectDir

$Runner         = Join-Path $ProjectDir "target/runners/$Label-runner"
$RunDir         = Join-Path $ProjectDir "target/pgo-run-$Label"
$ComparisonDir  = Join-Path $ProjectDir 'target/comparison'
$BinaryLog      = Join-Path $ComparisonDir "$Label.binary.log"
$MetricsFile    = Join-Path $ComparisonDir "$Label.metrics"
$SharedIprofDir = Join-Path $ProjectDir 'target/pgo-run'

New-Item -ItemType Directory -Path $RunDir, $ComparisonDir, $SharedIprofDir -Force | Out-Null

$PgHostPort = if ($env:PG_HOST_PORT) { $env:PG_HOST_PORT } else { '55432' }
$KcHostPort = if ($env:KC_HOST_PORT) { $env:KC_HOST_PORT } else { '8180' }
$env:PG_HOST_PORT = $PgHostPort
$env:KC_HOST_PORT = $KcHostPort

$env:QUARKUS_DATASOURCE_JDBC_URL          = "jdbc:postgresql://localhost:$PgHostPort/oppshan_pgo"
$env:QUARKUS_DATASOURCE_USERNAME          = 'postgres'
$env:QUARKUS_DATASOURCE_PASSWORD          = 'postgres'
$env:QUARKUS_OIDC_GOOGLE_AUTH_SERVER_URL  = "http://localhost:$KcHostPort/realms/oppshan-pgo"

if (-not $env:PGO_OIDC_CLIENT_SECRET)          { $env:PGO_OIDC_CLIENT_SECRET          = 'pgo-client-secret-change-me' }
if (-not $env:TOKEN_ENCRYPTION_SECRET)         { $env:TOKEN_ENCRYPTION_SECRET         = [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 })).ToLower() }
if (-not $env:APP_STORAGE_ENCRYPTION_PASSPHRASE) { $env:APP_STORAGE_ENCRYPTION_PASSPHRASE = [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 })).ToLower() }
$env:APP_STORAGE_USER_MAX_BYTES = '1073741824'

if (-not $env:WORKER_COUNT)  { $env:WORKER_COUNT  = '10' }
if (-not $env:LOOP_SECONDS)  { $env:LOOP_SECONDS  = '300' }
$WorkerCount = [int]$env:WORKER_COUNT

if (-not (Test-Path $Runner)) {
    Write-Error "runner not found at $Runner"
    exit 1
}
$RunnerSize = (Get-Item $Runner).Length

Write-Host "===== Testing '$Label' binary ====="
Write-Host "Runner: $Runner ($RunnerSize bytes)"

$env:QUARKUS_PROFILE = 'pgo'
$proc = Start-Process -FilePath $Runner `
    -ArgumentList @("-Djdk.virtualThreadScheduler.parallelism=$([Environment]::ProcessorCount)") `
    -WorkingDirectory $RunDir `
    -RedirectStandardOutput $BinaryLog `
    -RedirectStandardError "$BinaryLog.err" `
    -PassThru -NoNewWindow

try {
    $opened = $false
    for ($i = 0; $i -lt 90; $i++) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $client.Connect('localhost', 8080)
            $client.Close()
            $opened = $true
            break
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $opened) { throw "binary did not open :8080 in 90s" }

    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            Invoke-WebRequest -Uri 'http://localhost:8080/api/auth/me' -UseBasicParsing -ErrorAction Stop | Out-Null
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -eq 401) { $ready = $true; break }
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw "binary not serving /api/auth/me 401 in 30s" }
    Write-Host 'Binary ready.'

    $workloadStart = [int][double]::Parse(((Get-Date) - (Get-Date '1970-01-01Z').ToUniversalTime()).TotalSeconds)
    & pwsh -File (Join-Path $PSScriptRoot 'parallel-workload.ps1')
    $workloadEnd = [int][double]::Parse(((Get-Date) - (Get-Date '1970-01-01Z').ToUniversalTime()).TotalSeconds)
}
finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        $proc.WaitForExit(15000) | Out-Null
    }
    # docker compose teardown is owned by pgo-build.ps1's trap. The wrapper
    # covers all build-level exit paths; per-script teardown would break the
    # multi-test orchestration (tests 2/3 need the stack up).
}

if ($Label -eq 'instrumented') {
    $iprof = Join-Path $RunDir 'default.iprof'
    if ((Test-Path $iprof) -and (Get-Item $iprof).Length -gt 0) {
        Copy-Item $iprof (Join-Path $SharedIprofDir 'default.iprof') -Force
        $size = (Get-Item (Join-Path $SharedIprofDir 'default.iprof')).Length
        Write-Host "Captured iprof: $size bytes at $SharedIprofDir/default.iprof"
    } else {
        Write-Warning 'instrumented binary produced no default.iprof — optimized build will use empty/stale profile'
    }
}

$WorkersLogDir = Get-ChildItem -Path $env:TEMP -Directory -Filter 'pgo-workers-*' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

$workersOk = 0
$totalIters = 0
for ($n = 1; $n -le $WorkerCount; $n++) {
    $log = Join-Path $WorkersLogDir.FullName "worker-$n.log"
    if (-not (Test-Path $log)) { continue }
    if (Select-String -Path $log -Pattern ': done' -Quiet) {
        $workersOk++
        $match = Select-String -Path $log -Pattern 'completed (\d+) iterations' | Select-Object -First 1
        if ($match) { $totalIters += [int]$match.Matches[0].Groups[1].Value }
    }
}

$slowCount = 0
$slowWorst = 0
if (Test-Path $BinaryLog) {
    $slowCount = (Select-String -Path $BinaryLog -Pattern 'Slow query took' -SimpleMatch | Measure-Object).Count
    $worstMatches = Select-String -Path $BinaryLog -Pattern 'took (\d+) milliseconds'
    if ($worstMatches) {
        $slowWorst = ($worstMatches | ForEach-Object { [int]$_.Matches[0].Groups[1].Value } | Sort-Object | Select-Object -Last 1)
    }
}
$duration = $workloadEnd - $workloadStart

@"
LABEL=$Label
RUNNER_SIZE=$RunnerSize
WORKERS_OK=$workersOk
WORKER_COUNT=$WorkerCount
TOTAL_ITERS=$totalIters
SLOW_COUNT=$slowCount
SLOW_WORST_MS=$slowWorst
DURATION_S=$duration
"@ | Set-Content -Path $MetricsFile

Write-Host "'$Label' metrics:"
Get-Content $MetricsFile | ForEach-Object { Write-Host "  $_" }
Write-Host 'pgo-test-binary.ps1: done'

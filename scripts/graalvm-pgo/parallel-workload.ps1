#!/usr/bin/env pwsh
# scripts/graalvm-pgo/parallel-workload.ps1
#
# PowerShell counterpart to parallel-workload.sh. Spawns WORKER_COUNT
# (default 10) workload.ps1 instances in parallel, each driving a distinct
# Keycloak user. Per-worker logs land in $env:TEMP/pgo-workers-$PID/.
#
# Exits 0 if at least WORKER_SUCCESS_MIN workers complete successfully —
# the captured iprof still contains real samples from those that did, and
# the Maven verify-phase build_optimized step can use it.

$ErrorActionPreference = 'Stop'

$WorkerCount     = if ($env:WORKER_COUNT) { [int]$env:WORKER_COUNT } else { 10 }
$LoopSeconds     = if ($env:LOOP_SECONDS) { [int]$env:LOOP_SECONDS } else { 300 }
$KcUser          = if ($env:KC_USER)      { $env:KC_USER }          else { 'tester' }
$KcUserPassword  = if ($env:KC_USER_PASSWORD) { $env:KC_USER_PASSWORD } else { 'tester-password' }
$WorkerSuccessMin = if ($env:WORKER_SUCCESS_MIN) { [int]$env:WORKER_SUCCESS_MIN } else { 1 }
$WorkerSpawnDelay = if ($env:WORKER_SPAWN_DELAY) { [double]$env:WORKER_SPAWN_DELAY } else { 2 }

$WorkerLogDir = Join-Path $env:TEMP "pgo-workers-$PID"
New-Item -ItemType Directory -Path $WorkerLogDir -Force | Out-Null

Write-Host "parallel-workload: spawning $WorkerCount workers, LOOP_SECONDS=$LoopSeconds"
Write-Host "parallel-workload: per-worker logs in $WorkerLogDir"

$jobs = @()
for ($n = 1; $n -le $WorkerCount; $n++) {
    $envVars = @{
        KC_USER          = "$KcUser-$n"
        KC_USER_EMAIL    = "$KcUser-$n@example.com"
        KC_USER_PASSWORD = $KcUserPassword
        COOKIE_JAR       = (Join-Path $env:TEMP "pgo-cookies-$PID-$n.txt")
        LOOP_SECONDS     = "$LoopSeconds"
    }
    $logFile = Join-Path $WorkerLogDir "worker-$n.log"
    $scriptPath = Join-Path $PSScriptRoot 'workload.ps1'
    $job = Start-Job -Name "pgo-worker-$n" -ScriptBlock {
        param($script, $envVars, $logFile)
        foreach ($k in $envVars.Keys) { Set-Item -Path "env:$k" -Value $envVars[$k] }
        & pwsh -File $script *> $logFile
        exit $LASTEXITCODE
    } -ArgumentList $scriptPath, $envVars, $logFile
    $jobs += [pscustomobject]@{ N = $n; Job = $job }
    Write-Host "  worker $n: job-id $($job.Id), log $logFile"
    if ($n -lt $WorkerCount) { Start-Sleep -Seconds $WorkerSpawnDelay }
}

Write-Host "parallel-workload: waiting for $WorkerCount workers (up to ${LoopSeconds}s + bootstrap/teardown)"

$failed = 0
foreach ($entry in $jobs) {
    $job = Wait-Job -Job $entry.Job
    Receive-Job -Job $job *> $null
    if ($job.State -eq 'Completed' -and $job.ChildJobs[0].JobStateInfo.Reason -eq $null) {
        Write-Host "  worker $($entry.N): ok"
    } else {
        Write-Host "  worker $($entry.N): FAILED"
        $failed++
    }
    Remove-Job -Job $job
}

$succeeded = $WorkerCount - $failed
if ($failed -gt 0) {
    Write-Host "parallel-workload: $failed of $WorkerCount workers failed"
    Write-Host 'parallel-workload: tail of failed-worker logs:'
    for ($n = 1; $n -le $WorkerCount; $n++) {
        $log = Join-Path $WorkerLogDir "worker-$n.log"
        if (-not (Select-String -Path $log -Pattern 'workload\[.*\]: done' -Quiet)) {
            Write-Host "--- worker $n (last 30 lines of $log) ---"
            Get-Content $log -Tail 30
        }
    }
}

if ($succeeded -lt $WorkerSuccessMin) {
    Write-Host "parallel-workload: only $succeeded of $WorkerCount workers succeeded (minimum $WorkerSuccessMin) — aborting"
    exit 1
}

Write-Host "parallel-workload: $succeeded of $WorkerCount workers completed — iprof has real samples from $succeeded concurrent users"

#!/usr/bin/env pwsh
# scripts/graalvm-pgo/pgo-select-winner.ps1
#
# PowerShell counterpart to pgo-select-winner.sh. Picks between the normal and
# optimized binaries by total iterations, copies the winner to the canonical
# target/oppshan-files-*-runner path so downstream steps find it, and deletes
# the throwaway instrumented binary.

$ErrorActionPreference = 'Stop'

$ProjectDir    = (Resolve-Path (Join-Path $PSScriptRoot '..' '..')).Path
$RunnersDir    = Join-Path $ProjectDir 'target/runners'
$ComparisonDir = Join-Path $ProjectDir 'target/comparison'

function Read-Iters([string]$label) {
    $file = Join-Path $ComparisonDir "$label.metrics"
    if (-not (Test-Path $file)) { return 0 }
    foreach ($line in Get-Content $file) {
        if ($line -match '^TOTAL_ITERS=(\d+)$') { return [int]$Matches[1] }
    }
    return 0
}

$normalIters    = Read-Iters 'normal'
$optimizedIters = Read-Iters 'optimized'

Write-Host '===== Selecting winner (normal vs optimized) ====='
Write-Host "Normal:    $normalIters total iterations"
Write-Host "Optimized: $optimizedIters total iterations"

if ($optimizedIters -gt $normalIters) {
    $winner = 'optimized'
} elseif ($normalIters -gt $optimizedIters) {
    $winner = 'normal'
} else {
    $winner = 'optimized'
    Write-Host '(tie on total iterations — keeping optimized as PGO-favored default)'
}
Write-Host "Winner: $winner"

$winnerBinary = Join-Path $RunnersDir "$winner-runner"
if (-not (Test-Path $winnerBinary)) {
    Write-Error "winner binary missing at $winnerBinary"
    exit 1
}

$targetRunner = Join-Path $ProjectDir 'target/oppshan-files-1.0.0-SNAPSHOT-runner'
Copy-Item $winnerBinary $targetRunner -Force
Write-Host "Copied $winner binary to $targetRunner"

Remove-Item -Path (Join-Path $RunnersDir 'instrumented-runner') -ErrorAction SilentlyContinue
Write-Host 'Deleted instrumented binary (throwaway)'

Write-Host 'pgo-select-winner.ps1: done'

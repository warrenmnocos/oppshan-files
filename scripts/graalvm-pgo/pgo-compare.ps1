#!/usr/bin/env pwsh
# scripts/graalvm-pgo/pgo-compare.ps1
#
# PowerShell counterpart to pgo-compare.sh. Prints a side-by-side comparison
# table of the three native binaries (normal / instrumented / optimized) by
# reading the per-binary metric files written by pgo-test-binary.ps1 under
# target/comparison/.

$ErrorActionPreference = 'Stop'

$ProjectDir    = (Resolve-Path (Join-Path $PSScriptRoot '..' '..')).Path
$ComparisonDir = Join-Path $ProjectDir 'target/comparison'

function Load-Label([string]$label) {
    $file = Join-Path $ComparisonDir "$label.metrics"
    $defaults = @{
        RUNNER_SIZE   = 0
        WORKERS_OK    = 0
        WORKER_COUNT  = 10
        TOTAL_ITERS   = 0
        SLOW_COUNT    = 0
        SLOW_WORST_MS = 0
        DURATION_S    = 0
    }
    if (-not (Test-Path $file)) {
        Write-Warning "missing metrics for '$label' at $file"
        return $defaults
    }
    foreach ($line in Get-Content $file) {
        if ($line -match '^([A-Z_]+)=(.+)$') { $defaults[$Matches[1]] = [int64]$Matches[2] }
    }
    return $defaults
}

$normal       = Load-Label 'normal'
$instrumented = Load-Label 'instrumented'
$optimized    = Load-Label 'optimized'

function Format-MB($b)       { '{0:N0} MB' -f ($b / 1MB) }
function Format-Workers($ok, $total) { "$ok/$total" }
function Format-IPS($i, $d)  { if ($d -gt 0) { '{0:N2}' -f ($i / $d) } else { 'n/a' } }

$nIPS = Format-IPS $normal.TOTAL_ITERS       $normal.DURATION_S
$iIPS = Format-IPS $instrumented.TOTAL_ITERS $instrumented.DURATION_S
$oIPS = Format-IPS $optimized.TOTAL_ITERS    $optimized.DURATION_S

$wc = if ($env:WORKER_COUNT) { [int]$env:WORKER_COUNT } else { 10 }

Write-Host ''
Write-Host '===== PGO build comparison ====='
Write-Host ''
$fmt = '{0,-28} {1,15} {2,15} {3,15}'
Write-Host ($fmt -f 'Metric', 'Normal', 'Instrumented', 'Optimized')
Write-Host ($fmt -f ('-' * 28), ('-' * 15), ('-' * 15), ('-' * 15))
Write-Host ($fmt -f 'Binary size',             (Format-MB $normal.RUNNER_SIZE),       (Format-MB $instrumented.RUNNER_SIZE),       (Format-MB $optimized.RUNNER_SIZE))
Write-Host ($fmt -f 'Workers ok',              (Format-Workers $normal.WORKERS_OK $wc), (Format-Workers $instrumented.WORKERS_OK $wc), (Format-Workers $optimized.WORKERS_OK $wc))
Write-Host ($fmt -f 'Total iterations',        $normal.TOTAL_ITERS,                   $instrumented.TOTAL_ITERS,                   $optimized.TOTAL_ITERS)
Write-Host ($fmt -f 'Iters/sec (all workers)', $nIPS,                                  $iIPS,                                        $oIPS)
Write-Host ($fmt -f 'Workload duration (s)',   $normal.DURATION_S,                    $instrumented.DURATION_S,                    $optimized.DURATION_S)
Write-Host ($fmt -f 'Slow queries (>1s)',      $normal.SLOW_COUNT,                    $instrumented.SLOW_COUNT,                    $optimized.SLOW_COUNT)
Write-Host ($fmt -f 'Worst slow query (ms)',   $normal.SLOW_WORST_MS,                 $instrumented.SLOW_WORST_MS,                 $optimized.SLOW_WORST_MS)
Write-Host ''

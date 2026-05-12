#!/usr/bin/env pwsh
# scripts/graalvm-pgo/workload.ps1
#
# PowerShell counterpart to workload.sh — drives the instrumented Quarkus
# binary through the same three phases (bootstrap, 60s steady-state loop,
# teardown) using Invoke-WebRequest for HTTP and ConvertFrom-Json for JSON.

$ErrorActionPreference = 'Stop'

$BaseUrl        = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:8080' }
$KcHostPort     = if ($env:KC_HOST_PORT) { $env:KC_HOST_PORT } else { '8180' }
$KcRealm        = if ($env:KC_REALM) { $env:KC_REALM } else { 'oppshan-pgo' }
$KcUser         = if ($env:KC_USER) { $env:KC_USER } else { 'tester' }
$KcUserPassword = if ($env:KC_USER_PASSWORD) { $env:KC_USER_PASSWORD } else { 'tester-password' }
$LoopSeconds    = if ($env:LOOP_SECONDS) { [int]$env:LOOP_SECONDS } else { 60 }

$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-Oidc-SignIn {
    # Initial GET — Quarkus 302s to Keycloak; follow redirects to land on the login form.
    $resp = Invoke-WebRequest -Uri "$BaseUrl/sso/sign-in/oidc/google" -WebSession $Session -MaximumRedirection 10

    # Parse Keycloak's login form action. Try the HTMLFile COM object first
    # (only available on Windows with MSHTML registered); on non-Windows pwsh
    # or stripped Windows it throws — fall through to the regex extractor.
    $formAction = $null
    try {
        $html = New-Object -ComObject 'HTMLFile' -ErrorAction Stop
        $html.IHTMLDocument2_write([string]$resp.Content)
        foreach ($f in $html.forms) {
            if ($f.id -eq 'kc-form-login') { $formAction = $f.action; break }
        }
    } catch {
        # HTMLFile COM not available — regex fallback handles it.
    }
    if (-not $formAction) {
        # Regex fallback. Keycloak emits id="kc-form-login" before action="..." on
        # the same line; workload.sh makes the same assumption, so a future theme
        # change breaks both scripts together.
        if ($resp.Content -match 'id="kc-form-login"[^>]*action="([^"]+)"') {
            $formAction = $Matches[1] -replace '&amp;', '&'
        } else {
            Write-Error "workload: could not extract Keycloak login form action URL"
            exit 1
        }
    }

    # POST credentials. Keycloak 302s to Quarkus callback; Quarkus exchanges the code.
    $body = @{
        username     = $KcUser
        password     = $KcUserPassword
        credentialId = ''
    }
    Invoke-WebRequest -Uri $formAction -Method POST -Body $body -WebSession $Session -MaximumRedirection 10 -ContentType 'application/x-www-form-urlencoded' | Out-Null

    # Sanity check
    $me = Invoke-RestMethod -Uri "$BaseUrl/api/auth/me" -WebSession $Session
    if (-not $me.uuid) { Write-Error "workload: /api/auth/me did not return a uuid"; exit 1 }
}

function Invoke-Oidc-SignOut {
    try { Invoke-WebRequest -Uri "$BaseUrl/sso/sign-out" -Method POST -WebSession $Session -MaximumRedirection 10 | Out-Null } catch {}
}

function Get-Api { param([string]$Path) Invoke-RestMethod -Uri "$BaseUrl$Path" -WebSession $Session }
function Get-Api-Path {
    param([string]$P)
    $enc = [uri]::EscapeDataString($P)
    Invoke-RestMethod -Uri "$BaseUrl/api/files/contents?path=$enc" -WebSession $Session
}
function Post-Api-Json {
    param([string]$Path, [string]$Body)
    Invoke-RestMethod -Uri "$BaseUrl$Path" -Method POST -Body $Body -ContentType 'application/json' -WebSession $Session
}
function Patch-Api-Json {
    param([string]$Path, [string]$Body)
    Invoke-RestMethod -Uri "$BaseUrl$Path" -Method PATCH -Body $Body -ContentType 'application/json' -WebSession $Session
}
function Delete-Api { param([string]$Path) Invoke-RestMethod -Uri "$BaseUrl$Path" -Method DELETE -WebSession $Session }
function Upload-Api {
    param([string]$ParentUuid, [string]$LocalPath, [string]$NameOnServer)
    # FileSystemEndpoint.uploadFile reads the body as a raw InputStream and pulls
    # the filename out of Content-Disposition. Both Content-Type and
    # Content-Disposition are @NotEmpty @HeaderParam — missing either yields 400.
    $headers = @{
        'Content-Disposition' = "attachment; filename=`"$NameOnServer`""
    }
    Invoke-RestMethod -Uri "$BaseUrl/api/files/$ParentUuid/upload" -Method POST `
        -ContentType 'application/octet-stream' `
        -Headers $headers -InFile $LocalPath -WebSession $Session
}

function Get-Or-Create-Folder {
    param([string]$ParentUuid, [string]$Name)
    $contents = Get-Api "/api/files/$ParentUuid/contents"
    $existing = $contents.childrenFileNodeViews | Where-Object { $_.name -eq $Name -and $_.directory -eq $true }
    if ($existing) { return $existing.uuid }
    $body = "{`"parentUuid`":`"$ParentUuid`",`"name`":`"$Name`"}"
    $resp = Post-Api-Json '/api/files' $body
    return ($resp.childrenFileNodeViews | Where-Object { $_.name -eq $Name }).uuid
}

function Upload-If-Missing {
    param([string]$ParentUuid, [string]$LocalPath, [string]$RemoteName)
    $contents = Get-Api "/api/files/$ParentUuid/contents"
    $existing = $contents.childrenFileNodeViews | Where-Object { $_.name -eq $RemoteName }
    if ($existing) { return $existing.uuid }
    $resp = Upload-Api $ParentUuid $LocalPath $RemoteName
    return ($resp.childrenFileNodeViews | Where-Object { $_.name -eq $RemoteName }).uuid
}

function Make-Random-File {
    param([string]$Path, [int]$Bytes)
    $bytesArr = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytesArr)
    [System.IO.File]::WriteAllBytes($Path, $bytesArr)
}

# ----------------------------------------------------------------------
# Phase 1 — Bootstrap
# ----------------------------------------------------------------------
Write-Host 'workload: signing in'
Invoke-Oidc-SignIn

Write-Host 'workload: capturing root directory UUID'
$rootContents = Get-Api-Path ''
$RootUuid = $rootContents.uuid

Write-Host 'workload: creating seed folders'
$DocumentsUuid   = Get-Or-Create-Folder $RootUuid 'Documents'
$ReportsUuid     = Get-Or-Create-Folder $DocumentsUuid 'Reports'
$Y2026Uuid       = Get-Or-Create-Folder $ReportsUuid '2026'
$PhotosUuid      = Get-Or-Create-Folder $RootUuid 'Photos'
$Photos2026Uuid  = Get-Or-Create-Folder $PhotosUuid '2026'

Write-Host 'workload: generating seed files'
$SeedDir = New-Item -ItemType Directory -Path ([System.IO.Path]::Combine($env:TEMP, "pgo-seed-$PID")) -Force | Select-Object -ExpandProperty FullName
Make-Random-File "$SeedDir/seed-10k.bin"  10240
Make-Random-File "$SeedDir/seed-200k.bin" 204800
Make-Random-File "$SeedDir/seed-2m.bin"   2097152
Make-Random-File "$SeedDir/seed-5m.bin"   5242880

Write-Host 'workload: uploading seed files'
Upload-If-Missing $DocumentsUuid     "$SeedDir/seed-10k.bin"  'seed-1.bin' | Out-Null
$SeedPermlinkUuid = Upload-If-Missing $Y2026Uuid "$SeedDir/seed-200k.bin" 'seed-2.bin'
Upload-If-Missing $Photos2026Uuid    "$SeedDir/seed-2m.bin"   'seed-3.bin' | Out-Null
Upload-If-Missing $PhotosUuid        "$SeedDir/seed-5m.bin"   'seed-4.bin' | Out-Null

$LoopFileUuid = $SeedPermlinkUuid

# Per-iteration upload destination. Each loop iteration regenerates the bytes
# via New-Random-Upload — content and size both vary, so PGO samples the
# upload pipeline stochastically across the small/medium/large code paths
# instead of cycling three fixed sizes.
$IterUploadPath = "$SeedDir/iter-upload.bin"

# Refresh $IterUploadPath with random bytes, size drawn from a tiered
# distribution in [1 KB, 100 MB]. Weighting skews toward larger files to put
# more PGO samples on the multi-chunk encrypted-blob streaming path:
#   10%  1-50 KB         (tiny — configs, source files, small notes)
#   15%  50-500 KB       (small documents, screenshots)
#   20%  500 KB-5 MB     (typical photos, larger documents)
#   25%  5-25 MB         (RAW photos, short videos)
#   30%  25-100 MB       (long videos, archives — exercises the upload ceiling)
# User quota is 200 MB (app.storage.user-max-bytes); per-file ceiling is 100 MB
# (app.storage.file-upload-max-bytes). Top tier brushes the ceiling but never
# exceeds.
# Returns the chosen size in KB so the caller can build a self-describing name.
function New-Random-Upload {
    param([string]$Path)
    $roll = Get-Random -Minimum 0 -Maximum 100
    if     ($roll -lt 10) { $kbytes = Get-Random -Minimum 1     -Maximum 51 }
    elseif ($roll -lt 25) { $kbytes = Get-Random -Minimum 50    -Maximum 501 }
    elseif ($roll -lt 45) { $kbytes = Get-Random -Minimum 500   -Maximum 5121 }
    elseif ($roll -lt 70) { $kbytes = Get-Random -Minimum 5120  -Maximum 25601 }
    else                  { $kbytes = Get-Random -Minimum 25600 -Maximum 102401 }
    Make-Random-File $Path ($kbytes * 1024)
    return $kbytes
}

# ----------------------------------------------------------------------
# Phase 2 — Steady-state loop
# ----------------------------------------------------------------------
$endTime = (Get-Date).AddSeconds($LoopSeconds)
$i = 0
while ((Get-Date) -lt $endTime) {
    $i++
    $uploadKbytes = New-Random-Upload $IterUploadPath
    $uploadName   = "iter-$i-${uploadKbytes}k.bin"

    Get-Api '/api/auth/me' | Out-Null
    Get-Api "/api/files/$RootUuid/contents" | Out-Null
    Get-Api "/api/files/$Y2026Uuid/contents" | Out-Null
    Get-Api-Path 'Documents/Reports' | Out-Null
    Get-Api-Path 'Documents/Reports/2026/seed-2.bin' | Out-Null
    Get-Api "/api/files/$Y2026Uuid/properties" | Out-Null
    Get-Api "/api/files/$LoopFileUuid/properties" | Out-Null
    Get-Api "/api/files/$LoopFileUuid/download" | Out-Null
    $upResp = Upload-Api $DocumentsUuid $IterUploadPath $uploadName
    $uploadedUuid = ($upResp.childrenFileNodeViews | Where-Object { $_.name -eq $uploadName }).uuid
    Patch-Api-Json "/api/files/$uploadedUuid" "{`"name`":`"renamed-$i.bin`"}" | Out-Null
    Get-Api "/api/files/$uploadedUuid/download" | Out-Null
    Delete-Api "/api/files/$uploadedUuid" | Out-Null

    if (($i % 5) -eq 0) {
        $folderResp = Post-Api-Json '/api/files' "{`"parentUuid`":`"$DocumentsUuid`",`"name`":`"tmp-folder-$i`"}"
        $folderUuid = ($folderResp.childrenFileNodeViews | Where-Object { $_.name -eq "tmp-folder-$i" }).uuid
        Patch-Api-Json "/api/files/$folderUuid" "{`"name`":`"tmp-folder-renamed-$i`"}" | Out-Null
        Delete-Api "/api/files/$folderUuid" | Out-Null
    }
}
Write-Host "workload: completed $i iterations in ${LoopSeconds}s"

# ----------------------------------------------------------------------
# Phase 3 — Teardown
# ----------------------------------------------------------------------
Write-Host 'workload: signing out'
Invoke-Oidc-SignOut
Write-Host 'workload: done'

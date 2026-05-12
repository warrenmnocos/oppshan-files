#!/usr/bin/env pwsh
# scripts/graalvm-pgo/keycloak-bootstrap.ps1
#
# PowerShell counterpart to keycloak-bootstrap.sh — same contract, same env
# vars, same idempotent behavior. Run on Windows (or anywhere `pwsh` is
# available) where bash isn't a first-class option.

$ErrorActionPreference = 'Stop'

$KcHostPort      = if ($env:KC_HOST_PORT)      { $env:KC_HOST_PORT }      else { '8180' }
$KcHost          = "http://localhost:$KcHostPort"
$KcAdminUser     = if ($env:KC_ADMIN_USER)     { $env:KC_ADMIN_USER }     else { 'admin' }
$KcAdminPassword = if ($env:KC_ADMIN_PASSWORD) { $env:KC_ADMIN_PASSWORD } else { 'admin' }
$KcRealm         = if ($env:KC_REALM)          { $env:KC_REALM }          else { 'oppshan-pgo' }
$KcClientId      = if ($env:KC_CLIENT_ID)      { $env:KC_CLIENT_ID }      else { 'oppshan-pgo' }
$KcClientSecret  = if ($env:PGO_OIDC_CLIENT_SECRET) { $env:PGO_OIDC_CLIENT_SECRET } else { 'pgo-client-secret-change-me' }
$KcUser          = if ($env:KC_USER)           { $env:KC_USER }           else { 'tester' }
$KcUserEmail     = if ($env:KC_USER_EMAIL)     { $env:KC_USER_EMAIL }     else { 'tester@example.com' }
$KcUserPassword  = if ($env:KC_USER_PASSWORD)  { $env:KC_USER_PASSWORD }  else { 'tester-password' }
# When KC_USER_COUNT >= 2, create N users named "$KcUser-1" .. "$KcUser-N" each
# with email "$KcUser-i@example.com". Used by parallel-workload to drive
# concurrent OIDC sessions during PGO profiling.
$KcUserCount     = if ($env:KC_USER_COUNT)     { [int]$env:KC_USER_COUNT } else { 1 }
# Access-token lifespan in seconds. Sized to 1.5x LOOP_SECONDS (default 300)
# so workers always finish before token expiry.
$KcAccessTokenLifespan = if ($env:KC_ACCESS_TOKEN_LIFESPAN) { [int]$env:KC_ACCESS_TOKEN_LIFESPAN } else { 450 }
$KcRedirectUri   = 'http://localhost:8080/sso/sign-in/oidc/callback/google'

# Resolve the Keycloak container's name so we can docker-exec kcadm.sh.
$KcContainer = (docker ps --filter "ancestor=quay.io/keycloak/keycloak:26.5.4" --format '{{.Names}}' | Select-Object -First 1).Trim()
if (-not $KcContainer) {
    Write-Error 'keycloak-bootstrap: could not find a running Keycloak container'
    exit 1
}

function Invoke-Kcadm {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
    docker exec $KcContainer /opt/keycloak/bin/kcadm.sh @Args
    if ($LASTEXITCODE -ne 0) { throw "kcadm.sh failed (exit $LASTEXITCODE)" }
}

Write-Host "keycloak-bootstrap: logging in to $KcHost as $KcAdminUser"
Invoke-Kcadm config credentials --server $KcHost --realm master --user $KcAdminUser --password $KcAdminPassword

Write-Host "keycloak-bootstrap: ensuring realm $KcRealm exists"
$realmExists = $true
try {
    docker exec $KcContainer /opt/keycloak/bin/kcadm.sh get "realms/$KcRealm" *> $null
    if ($LASTEXITCODE -ne 0) { $realmExists = $false }
} catch { $realmExists = $false }
if (-not $realmExists) {
    Invoke-Kcadm create realms -s "realm=$KcRealm" -s 'enabled=true'
}

Write-Host "keycloak-bootstrap: ensuring client $KcClientId exists"
$clientUuid = (docker exec $KcContainer /opt/keycloak/bin/kcadm.sh get clients -r $KcRealm -q "clientId=$KcClientId" --fields id --format csv --noquotes 2>$null | Select-Object -Last 1).Trim()
if (-not $clientUuid) {
    Invoke-Kcadm create clients -r $KcRealm `
        -s "clientId=$KcClientId" `
        -s "secret=$KcClientSecret" `
        -s 'protocol=openid-connect' `
        -s 'publicClient=false' `
        -s 'standardFlowEnabled=true' `
        -s 'directAccessGrantsEnabled=false' `
        -s "redirectUris=[`"$KcRedirectUri`"]"
} else {
    Invoke-Kcadm update "clients/$clientUuid" -r $KcRealm `
        -s "secret=$KcClientSecret" `
        -s "redirectUris=[`"$KcRedirectUri`"]"
}

function Ensure-User {
    param([string]$Username, [string]$Email)
    Write-Host "keycloak-bootstrap: ensuring user $Username exists (emailVerified=true)"
    $uuid = (docker exec $KcContainer /opt/keycloak/bin/kcadm.sh get users -r $KcRealm -q "username=$Username" --fields id --format csv --noquotes 2>$null | Select-Object -Last 1).Trim()
    if (-not $uuid) {
        Invoke-Kcadm create users -r $KcRealm `
            -s "username=$Username" `
            -s "email=$Email" `
            -s 'emailVerified=true' `
            -s "firstName=$Username" `
            -s 'lastName=PGO' `
            -s 'enabled=true'
        Invoke-Kcadm set-password -r $KcRealm --username $Username --new-password $KcUserPassword
    }
}

if ($KcUserCount -le 1) {
    Ensure-User $KcUser $KcUserEmail
} else {
    for ($n = 1; $n -le $KcUserCount; $n++) {
        Ensure-User "$KcUser-$n" "$KcUser-$n@example.com"
    }
}

Write-Host 'keycloak-bootstrap: done'

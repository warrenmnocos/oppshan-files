#!/usr/bin/env bash
# scripts/graalvm-pgo/workload.sh
#
# Drives the instrumented Quarkus binary through a realistic 60-second steady-state
# workload while it captures PGO profile data. Three phases:
#   1. Bootstrap (OIDC sign-in, seed folders/files)
#   2. Steady-state loop (11 operations per iteration, 60s)
#   3. Teardown (OIDC sign-out)
#
# Discipline:
#   set -euo pipefail   — any unhandled failure aborts
#   curl --fail         — non-2xx responses abort the script
#   jq -er              — missing JSON fields abort the script

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
KC_HOST_PORT="${KC_HOST_PORT:-8180}"
KC_HOST="http://localhost:${KC_HOST_PORT}"
KC_REALM="${KC_REALM:-oppshan-pgo}"
KC_USER="${KC_USER:-tester}"
KC_USER_PASSWORD="${KC_USER_PASSWORD:-tester-password}"
LOOP_SECONDS="${LOOP_SECONDS:-60}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/pgo-cookies-$$.txt}"

cleanup_orphans() {
    # Delete every non-seed entry in Documents so no upload leaks across runs.
    # Best-effort: tolerant of HTTP errors, never aborts the script. Called from
    # both the main flow (after steady_state_loop, while the session is alive)
    # and the EXIT trap (for failure paths). Idempotent — safe to call twice.
    [ -f "$COOKIE_JAR" ] || return 0
    [ -n "${DOCUMENTS_UUID:-}" ] || return 0
    local uuids prev_e
    prev_e=$(set +o | grep errexit)
    set +e
    uuids="$(api_get "/api/files/$DOCUMENTS_UUID/contents" 2>/dev/null \
        | jq -r '.childrenFileNodeViews[]? | select(.name != "seed-1.bin" and .name != "Reports") | .uuid' \
        2>/dev/null)"
    if [ -n "$uuids" ]; then
        echo "workload[${KC_USER}]: cleanup — deleting orphans in Documents" >&2
        while IFS= read -r uuid; do
            [ -n "$uuid" ] && api_delete "/api/files/$uuid" >/dev/null 2>&1
        done <<< "$uuids"
    fi
    eval "$prev_e"
}

cleanup_workload() {
    cleanup_orphans
    rm -f "$COOKIE_JAR" /tmp/pgo-html-$$*.html
}
trap cleanup_workload EXIT

# ----------------------------------------------------------------------
# OIDC code flow against Keycloak
# ----------------------------------------------------------------------
oidc_sign_in() {
    local login_html="/tmp/pgo-html-$$-login.html"

    curl --fail-with-body --silent --show-error --location \
        --cookie-jar "$COOKIE_JAR" --cookie "$COOKIE_JAR" \
        "$BASE_URL/sso/sign-in/oidc/google" \
        --output "$login_html"

    local form_action=""
    if command -v xmllint >/dev/null 2>&1; then
        form_action="$(xmllint --html --xpath 'string(//form[@id="kc-form-login"]/@action)' "$login_html" 2>/dev/null || true)"
    fi
    if [ -z "$form_action" ]; then
        # Regex fallback, mirroring workload.ps1 so the script works without libxml2-utils.
        # Keycloak emits id="kc-form-login" before action="..." on the same line; the same
        # assumption holds for both scripts, so a future theme change breaks them together.
        form_action="$(grep -oE 'id="kc-form-login"[^>]*action="[^"]+"' "$login_html" \
            | sed -E 's/.*action="([^"]+)".*/\1/' \
            | sed 's/&amp;/\&/g' \
            | head -1)"
    fi

    if [ -z "$form_action" ]; then
        echo "workload: could not extract Keycloak login form action URL" >&2
        head -80 "$login_html" >&2
        return 1
    fi

    curl --fail-with-body --silent --show-error --location \
        --cookie-jar "$COOKIE_JAR" --cookie "$COOKIE_JAR" \
        --data-urlencode "username=$KC_USER" \
        --data-urlencode "password=$KC_USER_PASSWORD" \
        --data-urlencode "credentialId=" \
        "$form_action" \
        --output /dev/null

    # Sanity check
    api_get '/api/auth/me' | jq -er '.uuid' >/dev/null
}

oidc_sign_out() {
    curl --fail-with-body --silent --show-error --location \
        --cookie "$COOKIE_JAR" \
        --request POST "$BASE_URL/sso/sign-out" \
        --output /dev/null || true
}

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

# Wrap curl with diagnostic logging on failure. Without this, workers die
# silently under concurrent load because curl --silent --fail swallows both
# the response body and the HTTP code, leaving no way to tell whether the
# request timed out, was rejected, or hit a backend exception.
#
# Contract: writes the response body to stdout on success; on failure, dumps
# rc + http_code + body (first 1 KB) + URL to stderr and returns curl's exit
# code so the caller's `set -e` still aborts.
# Read stdin into a temp file, run jq with filter $1, print result to stdout
# on success. On jq failure, dump the body + filter + size to stderr and
# preserve the body file for inspection. Returns jq's exit code.
#
# Use at call sites where curl_diag returns 2xx but the body might be
# malformed/truncated under concurrent load — curl_diag only catches HTTP
# errors, this catches body-parsing failures.
parse_or_dump() {
    local filter="$1"
    local body_file
    body_file="$(mktemp -p /tmp "pgo-body-${KC_USER:-anon}-XXXXXX")"
    cat > "$body_file"
    # Capture jq's real exit code. `if ! cmd; then local rc=$?` is wrong here
    # because bash flips the exit when negating with `!`, so $? inside the
    # then-block is always 0. The `|| rc=$?` pattern fires only on jq failure
    # and captures the actual code.
    local rc=0
    jq -er "$filter" < "$body_file" || rc=$?
    if [ "$rc" -ne 0 ]; then
        local size
        size="$(wc -c < "$body_file")"
        {
            echo "workload[${KC_USER:-?}]: jq FAILED rc=$rc filter='$filter'"
            echo "  body size: $size bytes"
            echo "  body (full if <8 KB, otherwise first 4 KB):"
            if [ "$size" -lt 8192 ]; then
                cat "$body_file"
            else
                head -c 4096 "$body_file"
                echo "...(truncated)..."
            fi
            echo
            echo "  preserved at: $body_file"
        } >&2
        return "$rc"
    fi
    rm -f "$body_file"
}

curl_diag() {
    local body_file rc=0 http_code
    body_file="$(mktemp -p /tmp "pgo-resp-${KC_USER:-anon}-XXXXXX")"
    http_code=$(curl --silent --show-error --fail-with-body \
        --write-out '%{http_code}' --output "$body_file" "$@") || rc=$?
    if [ "$rc" -ne 0 ]; then
        {
            echo "workload[${KC_USER:-?}]: curl FAILED rc=$rc http=$http_code"
            echo "  url: ${*: -1}"
            echo "  body (first 1KB):"
            head -c 1024 "$body_file" 2>/dev/null || true
            echo
        } >&2
        rm -f "$body_file"
        return "$rc"
    fi
    cat "$body_file"
    rm -f "$body_file"
}

api_get() {
    curl_diag --cookie "$COOKIE_JAR" "$BASE_URL$1"
}

api_get_path() {
    local path_enc
    path_enc="$(printf '%s' "$1" | jq -sRr @uri)"
    curl_diag --cookie "$COOKIE_JAR" "$BASE_URL/api/files/contents?path=$path_enc"
}

api_post_json() {
    curl_diag --cookie "$COOKIE_JAR" \
        --header 'Content-Type: application/json' \
        --request POST "$BASE_URL$1" \
        --data "$2"
}

api_patch_json() {
    curl_diag --cookie "$COOKIE_JAR" \
        --header 'Content-Type: application/json' \
        --request PATCH "$BASE_URL$1" \
        --data "$2"
}

api_delete() {
    curl_diag --cookie "$COOKIE_JAR" \
        --request DELETE "$BASE_URL$1"
}

api_upload() {
    # args: parent UUID, local-file-path, name-on-server
    # FileSystemEndpoint.uploadFile reads the body as a raw InputStream and pulls
    # the filename out of Content-Disposition via FileUploadRequest. Both
    # Content-Type and Content-Disposition are @NotEmpty @HeaderParam — missing
    # either yields a 400 before the service is reached.
    curl_diag --cookie "$COOKIE_JAR" \
        --request POST "$BASE_URL/api/files/$1/upload" \
        --header "Content-Type: application/octet-stream" \
        --header "Content-Disposition: attachment; filename=\"$3\"" \
        --data-binary "@$2"
}

# ----------------------------------------------------------------------
# Phase 1 — Bootstrap
# ----------------------------------------------------------------------
bootstrap() {
    echo "workload: signing in"
    oidc_sign_in

    echo "workload: capturing root directory UUID"
    ROOT_UUID="$(api_get_path '' | jq -er '.uuid')"

    create_folder_under() {
        local parent_uuid="$1" name="$2"
        local existing
        existing="$(api_get "/api/files/$parent_uuid/contents" \
            | jq -er ".childrenFileNodeViews[]? | select(.name == \"$name\" and .directory == true) | .uuid" 2>/dev/null || true)"
        if [ -n "$existing" ]; then
            printf '%s' "$existing"
            return 0
        fi
        api_post_json '/api/files' "{\"parentUuid\":\"$parent_uuid\",\"name\":\"$name\"}" \
            | parse_or_dump ".childrenFileNodeViews[] | select(.name == \"$name\") | .uuid"
    }

    echo "workload: creating seed folders"
    DOCUMENTS_UUID="$(create_folder_under "$ROOT_UUID" 'Documents')"
    REPORTS_UUID="$(create_folder_under "$DOCUMENTS_UUID" 'Reports')"
    Y2026_UUID="$(create_folder_under "$REPORTS_UUID" '2026')"
    PHOTOS_UUID="$(create_folder_under "$ROOT_UUID" 'Photos')"
    PHOTOS_2026_UUID="$(create_folder_under "$PHOTOS_UUID" '2026')"

    echo "workload: generating seed files"
    SEED_DIR="$(mktemp -d)"
    dd if=/dev/urandom of="$SEED_DIR/seed-10k.bin"  bs=10240 count=1 status=none
    dd if=/dev/urandom of="$SEED_DIR/seed-200k.bin" bs=200K count=1 status=none
    dd if=/dev/urandom of="$SEED_DIR/seed-2m.bin"   bs=2M    count=1 status=none
    dd if=/dev/urandom of="$SEED_DIR/seed-5m.bin"   bs=5M    count=1 status=none

    upload_if_missing() {
        local parent_uuid="$1" local_path="$2" remote_name="$3"
        local existing
        existing="$(api_get "/api/files/$parent_uuid/contents" \
            | jq -er ".childrenFileNodeViews[]? | select(.name == \"$remote_name\") | .uuid" 2>/dev/null || true)"
        if [ -z "$existing" ]; then
            api_upload "$parent_uuid" "$local_path" "$remote_name" \
                | parse_or_dump ".childrenFileNodeViews[] | select(.name == \"$remote_name\") | .uuid"
        else
            printf '%s' "$existing"
        fi
    }

    echo "workload: uploading seed files"
    upload_if_missing "$DOCUMENTS_UUID"      "$SEED_DIR/seed-10k.bin"  'seed-1.bin' >/dev/null
    SEED_PERMLINK_UUID="$(upload_if_missing "$Y2026_UUID" "$SEED_DIR/seed-200k.bin" 'seed-2.bin')"
    upload_if_missing "$PHOTOS_2026_UUID"    "$SEED_DIR/seed-2m.bin"   'seed-3.bin' >/dev/null
    upload_if_missing "$PHOTOS_UUID"         "$SEED_DIR/seed-5m.bin"   'seed-4.bin' >/dev/null

    LOOP_FILE_UUID="$SEED_PERMLINK_UUID"

    # Per-iteration upload destination. Each loop iteration regenerates the
    # bytes via generate_random_upload — content and size both vary, so PGO
    # samples the upload pipeline stochastically (small-buffer fast path,
    # multi-chunk streaming, BLOB encryption tail) instead of cycling three
    # fixed sizes.
    ITER_UPLOAD_PATH="$SEED_DIR/iter-upload.bin"
}

# Bash's $RANDOM is 15 bits (0..32767), too narrow to sample evenly across
# the larger tiers below. Combine two draws to get 30 bits (~1 billion).
rand30() { echo $(( (RANDOM << 15) | RANDOM )); }

# Refresh $ITER_UPLOAD_PATH with random bytes, size drawn from a tiered
# distribution in [1 KB, 100 MB]. Weighting skews toward larger files to put
# more PGO samples on the multi-chunk encrypted-blob streaming path, which
# dominates wall-clock time on a personal-file-manager workload anyway:
#   10%  1-50 KB         (tiny — configs, source files, small notes)
#   15%  50-500 KB       (small documents, screenshots)
#   20%  500 KB-5 MB     (typical photos, larger documents)
#   25%  5-25 MB         (RAW photos, short videos)
#   30%  25-100 MB       (long videos, archives — exercises the upload ceiling)
# User quota is 200 MB (app.storage.user-max-bytes); the in-flight upload plus
# the ~7 MB of resident seed files stays well under that. Per-file upload limit
# is 100 MB (app.storage.file-upload-max-bytes); the top tier brushes against
# it but never exceeds.
# Sets UPLOAD_KBYTES so the caller can build a self-describing filename.
generate_random_upload() {
    local roll=$(( RANDOM % 100 ))
    if   [ $roll -lt 10 ]; then UPLOAD_KBYTES=$(( $(rand30) % 50    + 1 ))
    elif [ $roll -lt 25 ]; then UPLOAD_KBYTES=$(( $(rand30) % 451   + 50 ))
    elif [ $roll -lt 45 ]; then UPLOAD_KBYTES=$(( $(rand30) % 4621  + 500 ))
    elif [ $roll -lt 70 ]; then UPLOAD_KBYTES=$(( $(rand30) % 20481 + 5120 ))
    else                         UPLOAD_KBYTES=$(( $(rand30) % 76801 + 25600 ))
    fi
    dd if=/dev/urandom of="$ITER_UPLOAD_PATH" bs=1024 count="$UPLOAD_KBYTES" status=none
}

# ----------------------------------------------------------------------
# Phase 2 — Steady-state loop
# ----------------------------------------------------------------------
steady_state_loop() {
    local end_time=$(( $(date +%s) + LOOP_SECONDS ))
    local i=0

    while [ "$(date +%s)" -lt "$end_time" ]; do
        i=$((i + 1))

        generate_random_upload
        local upload_name="iter-${i}-${UPLOAD_KBYTES}k.bin"

        api_get '/api/auth/me' >/dev/null
        api_get "/api/files/$ROOT_UUID/contents" >/dev/null
        api_get "/api/files/$Y2026_UUID/contents" >/dev/null
        api_get_path 'Documents/Reports' >/dev/null
        api_get_path 'Documents/Reports/2026/seed-2.bin' >/dev/null
        api_get "/api/files/$Y2026_UUID/properties" >/dev/null
        api_get "/api/files/$LOOP_FILE_UUID/properties" >/dev/null
        api_get "/api/files/$LOOP_FILE_UUID/download" >/dev/null
        local uploaded_uuid
        uploaded_uuid="$(api_upload "$DOCUMENTS_UUID" "$ITER_UPLOAD_PATH" "$upload_name" \
            | parse_or_dump ".childrenFileNodeViews[] | select(.name == \"$upload_name\") | .uuid")"
        api_patch_json "/api/files/$uploaded_uuid" "{\"name\":\"renamed-${i}.bin\"}" >/dev/null
        api_get "/api/files/$uploaded_uuid/download" >/dev/null
        api_delete "/api/files/$uploaded_uuid" >/dev/null

        if [ $((i % 5)) -eq 0 ]; then
            local folder_uuid
            folder_uuid="$(api_post_json '/api/files' "{\"parentUuid\":\"$DOCUMENTS_UUID\",\"name\":\"tmp-folder-${i}\"}" \
                | parse_or_dump ".childrenFileNodeViews[] | select(.name == \"tmp-folder-${i}\") | .uuid")"
            api_patch_json "/api/files/$folder_uuid" "{\"name\":\"tmp-folder-renamed-${i}\"}" >/dev/null
            api_delete "/api/files/$folder_uuid" >/dev/null
        fi
    done

    echo "workload: completed $i iterations in ${LOOP_SECONDS}s"
}

# ----------------------------------------------------------------------
# Phase 3 — Teardown
# ----------------------------------------------------------------------
teardown() {
    echo "workload: signing out"
    oidc_sign_out
}

# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
echo "workload[${KC_USER}]: starting against $BASE_URL"
bootstrap
steady_state_loop
# Explicit cleanup before sign-out — the EXIT trap also calls cleanup_orphans
# for failure paths, but doing it here on the success path makes the cleanup
# visible in the log and runs while we're guaranteed signed in.
cleanup_orphans
teardown
echo "workload[${KC_USER}]: done"

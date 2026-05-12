#!/usr/bin/env bash
# List every user account along with their storage usage and quota.
# Mirrors the /list-user-storage Claude slash command — see
# .claude/commands/list-user-storage.md for the design rationale.
#
# Usage:
#   scripts/list-user-storage.sh           # local (default)
#   scripts/list-user-storage.sh local
#   scripts/list-user-storage.sh prod
#
# Local connects to the developer's native PostgreSQL using PG* env vars
# (with sensible defaults below). Prod reaches the EC2 instance via AWS
# SSM Run Command — no SSH, no public DB endpoint.
#
# READ-ONLY: the SQL begins with SET TRANSACTION READ ONLY and runs under
# psql -v ON_ERROR_STOP=1, so any write attempt aborts. Do NOT extend this
# script with INSERT/UPDATE/DELETE/ALTER/CREATE/DROP/TRUNCATE, and do NOT
# extend the prod SSM commands array with anything beyond the read-only
# psql invocation (no rm, reboot, shutdown, systemctl, kill, etc).

set -euo pipefail

# Resolve the running EC2 instance ID, with a 1h /tmp cache to skip the
# (expensive) AWS CLI cold-start on warm runs. INSTANCE_ID env var
# short-circuits the lookup entirely.
resolve_instance_id() {
    if [[ -n "${INSTANCE_ID:-}" ]]; then
        echo "$INSTANCE_ID"
        return
    fi
    local cache=/tmp/.oppshan-instance-id
    if [[ -r "$cache" ]] && (( $(date +%s) - $(stat -c %Y "$cache" 2>/dev/null || echo 0) < 3600 )); then
        cat "$cache"
        return
    fi
    local id
    id=$(aws ec2 describe-instances \
        --filters "Name=tag:Name,Values=oppshan-files" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].InstanceId' --output text)
    if [[ -n "$id" && "$id" != "None" ]]; then
        echo "$id" > "$cache"
    fi
    echo "$id"
}

MODE="${1:-local}"
case "$MODE" in
    local|prod) ;;
    *)
        echo "Usage: $0 [local|prod]" >&2
        exit 2
        ;;
esac

# Shared SQL. Single-quoted heredoc so $1/$2/etc. are not expanded by bash
# and reach psql verbatim as SQL field references.
SQL=$(cat <<'EOF'
SET TRANSACTION READ ONLY;
SELECT
  ua.uuid                                                                AS user_uuid,
  ua.first_name || ' ' || ua.last_name                                   AS first_name_last_name,
  ga.name                                                                AS name,
  ga.email,
  pg_size_pretty(COALESCE(used.bytes, 0))                                AS used,
  pg_size_pretty(us.max_storage_bytes)                                   AS quota,
  ROUND(100.0 * COALESCE(used.bytes, 0)::numeric
        / NULLIF(us.max_storage_bytes, 0), 1)                            AS pct,
  pg_size_pretty(us.max_file_upload_bytes)                               AS max_upload,
  ua.created_at::date                                                    AS joined
FROM user_account ua
LEFT JOIN user_storage us ON us.user_account_uuid = ua.uuid
LEFT JOIN LATERAL (
  SELECT ga2.name, ga2.email
  FROM idp_account ia
  JOIN google_account ga2 ON ga2.uuid = ia.uuid
  WHERE ia.user_account_uuid = ua.uuid
  ORDER BY ia.created_at
  LIMIT 1
) ga ON true
LEFT JOIN LATERAL (
  SELECT SUM(size_bytes) AS bytes
  FROM file_node
  WHERE user_account_uuid = ua.uuid AND NOT directory
) used ON true
ORDER BY ua.created_at;
EOF
)

run_local() {
    # PG* env vars take precedence; defaults match the local dev setup.
    # PGPASSWORD here is a PLACEHOLDER ("1234") — replace it with the real
    # local password, or export PGPASSWORD in your shell to override.
    : "${PGHOST:=localhost}"
    : "${PGPORT:=5432}"
    : "${PGDATABASE:=oppshan_files}"
    : "${PGUSER:=oppshan_files_app}"
    : "${PGPASSWORD:=cDnr5xibqzI0jnED2H7wsbC1qJozxJlf}"
    export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

    psql -P pager=off -v ON_ERROR_STOP=1 -c "$SQL"
}

run_prod() {
    # Each `aws` CLI call costs ~3s (Python + boto3 import), so we minimise
    # them. resolve_instance_id caches the lookup in /tmp for 1h. Override
    # by exporting INSTANCE_ID=i-xxx in your shell to skip the lookup
    # entirely.
    local instance_id
    instance_id=$(resolve_instance_id)
    if [[ -z "$instance_id" || "$instance_id" == "None" ]]; then
        echo "No running EC2 instance tagged Name=oppshan-files." >&2
        exit 1
    fi

    # Flatten the SQL onto one line so it fits in a single -c argument
    # without needing line continuations through the SSM JSON envelope.
    local sql_flat
    sql_flat=$(echo "$SQL" | tr '\n' ' ' | sed -E 's/  +/ /g')

    local remote_cmd
    remote_cmd="sudo -u postgres psql -d oppshan -P pager=off -v ON_ERROR_STOP=1 -c \"$sql_flat\""

    local payload
    payload=$(mktemp /tmp/ssm-list-user-storage.XXXXXX.json)
    trap 'rm -f "$payload"' RETURN

    jq -n --arg id "$instance_id" --arg cmd "$remote_cmd" '
        {
            InstanceIds: [$id],
            DocumentName: "AWS-RunShellScript",
            Comment: "list user storage",
            Parameters: { commands: [$cmd] }
        }
    ' > "$payload"

    local cmd_id
    cmd_id=$(aws ssm send-command --cli-input-json "file://$payload" \
        --query 'Command.CommandId' --output text)

    # The query runs in <1ms on the DB; the visible latency is SSM transport
    # plus AWS CLI cold-start (~3s per `aws` invocation — Python interpreter
    # + boto3 import). We minimise CLI calls: send + sleep + one combined
    # fetch (status, stdout, stderr in a single get-command-invocation parsed
    # three times by jq, which is microseconds). Fall back to `aws ssm wait`
    # only when the first fetch shows still-in-progress.
    sleep 1
    local result status stdout stderr
    result=$(aws ssm get-command-invocation --command-id "$cmd_id" --instance-id "$instance_id" \
              --output json 2>/dev/null || echo '{"Status":"Pending"}')
    status=$(printf '%s' "$result" | jq -r '.Status // "Pending"')
    case "$status" in
        Success|Failed|Cancelled|TimedOut) ;;
        *)
            aws ssm wait command-executed --command-id "$cmd_id" --instance-id "$instance_id" 2>/dev/null || true
            result=$(aws ssm get-command-invocation --command-id "$cmd_id" --instance-id "$instance_id" --output json)
            status=$(printf '%s' "$result" | jq -r '.Status // "Pending"')
            ;;
    esac

    stdout=$(printf '%s' "$result" | jq -r '.StandardOutputContent // ""')
    stderr=$(printf '%s' "$result" | jq -r '.StandardErrorContent // ""')

    if [[ "$status" != "Success" ]]; then
        echo "SSM command status: $status. stderr from instance:" >&2
        echo "$stderr" >&2
        exit 1
    fi

    printf '%s' "$stdout"
}

case "$MODE" in
    local) run_local ;;
    prod)  run_prod  ;;
esac

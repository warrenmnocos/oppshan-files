#!/usr/bin/env bash
# Tail prod systemd journal logs via AWS SSM Session Manager.
#
# Usage:
#   scripts/tail-logs.sh                    # follow oppshan-files (default)
#   scripts/tail-logs.sh -u postgresql      # follow postgresql
#   scripts/tail-logs.sh -u caddy
#   scripts/tail-logs.sh -n 200             # last 200 lines, no follow
#   scripts/tail-logs.sh -u caddy -n 100    # last 100 lines of caddy
#
# Live follow uses `aws ssm start-session --document-name
# AWS-StartInteractiveCommand` — requires the Session Manager plugin
# (`session-manager-plugin --version`). Snapshot mode uses
# `aws ssm send-command` and works without the plugin.
#
# READ-ONLY: this script only reads the systemd journal via journalctl.
# The journalctl flags below have no destructive effect. Do NOT extend
# the remote command beyond `journalctl … -u <unit> [-f|-n N]` —
# specifically forbidden: `--rotate`, `--vacuum-*`, `--flush`,
# `--sync`, piping into anything that mutates state, `systemctl
# start|stop|restart|reload|kill|enable|disable|mask`, `service ...
# start|stop|restart`, `journalctl --user-unit` (different scope), `kill`,
# `pkill`, `rm`, `dd`, `mkfs`, `mount`, `umount`, redirects to anything
# outside /dev/null or /tmp/<our-own-temp-file>.

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

usage() {
    cat <<EOF >&2
Usage: $0 [-u <unit>] [-n <lines>]

  -u <unit>   systemd unit to tail (default: oppshan-files)
              allowed: oppshan-files | postgresql | caddy | sshd
  -n <lines>  snapshot last N lines and exit (skips live follow)
  -h          show this help

Live follow needs the Session Manager plugin. Install on Ubuntu:
  curl -sSL https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb -o /tmp/session-manager-plugin.deb
  sudo dpkg -i /tmp/session-manager-plugin.deb
EOF
}

UNIT="oppshan-files"
LINES=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -u) UNIT="$2"; shift 2 ;;
        -n) LINES="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        *)  usage; exit 2 ;;
    esac
done

# Whitelist of allowed units. An unbounded -u argument would let a typo
# target the wrong service; if /tail-logs ever runs in CI, it would also
# let an attacker-influenced value tail credential-bearing units.
case "$UNIT" in
    oppshan-files|postgresql|caddy|sshd) ;;
    *)
        echo "Unsupported unit: $UNIT (allowed: oppshan-files, postgresql, caddy, sshd)" >&2
        exit 2
        ;;
esac

if [[ -n "$LINES" && ! "$LINES" =~ ^[0-9]+$ ]]; then
    echo "-n must be a positive integer, got: $LINES" >&2
    exit 2
fi

instance_id=$(resolve_instance_id)
if [[ -z "$instance_id" || "$instance_id" == "None" ]]; then
    echo "No running EC2 instance tagged Name=oppshan-files." >&2
    exit 1
fi

if [[ -n "$LINES" ]]; then
    # ---- Snapshot mode (AWS-RunShellScript, returns and exits) ----
    echo "Fetching last $LINES lines of $UNIT.service from $instance_id…" >&2

    payload=$(mktemp /tmp/ssm-tail-logs.XXXXXX.json)
    trap 'rm -f "$payload"' EXIT

    jq -n \
        --arg id "$instance_id" \
        --arg unit "$UNIT" \
        --arg n "$LINES" \
        '{
            InstanceIds: [$id],
            DocumentName: "AWS-RunShellScript",
            Comment: ("tail-logs " + $unit + " -n " + $n),
            Parameters: { commands: [ ("sudo journalctl -u " + $unit + ".service -n " + $n + " --no-pager") ] }
        }' > "$payload"

    cmd_id=$(aws ssm send-command --cli-input-json "file://$payload" \
        --query 'Command.CommandId' --output text)

    sleep 1
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
else
    # ---- Live follow (AWS-StartInteractiveCommand, streams until Ctrl-C) ----
    if ! command -v session-manager-plugin >/dev/null 2>&1; then
        echo "session-manager-plugin not found." >&2
        echo "Install on Ubuntu:" >&2
        echo "  sudo dpkg -i /tmp/session-manager-plugin.deb   (deb already downloaded)" >&2
        echo "Or run with -n <lines> for snapshot mode." >&2
        exit 1
    fi

    echo "Following $UNIT.service on $instance_id. Ctrl-C to exit." >&2
    exec aws ssm start-session \
        --target "$instance_id" \
        --document-name AWS-StartInteractiveCommand \
        --parameters command="sudo journalctl -u $UNIT.service -f --no-pager"
fi

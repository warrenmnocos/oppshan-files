#!/usr/bin/env bash
# Show CPU, RAM, and storage usage with percentages.
# Mirrors the /check-resources Claude slash command — see
# .claude/commands/check-resources.md for the design rationale.
#
# Usage:
#   scripts/check-resources.sh           # local (default)
#   scripts/check-resources.sh local
#   scripts/check-resources.sh prod
#
# Local samples /proc/loadavg + /proc/meminfo + vmstat + df on this machine.
# Prod runs the same script on the EC2 instance via AWS SSM Run Command.
#
# READ-ONLY: this script must only inspect state. Do NOT extend the inline
# script or the SSM commands array with destructive OS commands —
# poweroff, reboot, shutdown, halt, rm, dd, mkfs, mount/umount, swapon/off,
# kill, systemctl start|stop|restart, sysctl -w, chown/chmod, useradd,
# iptables/nft mutations, package install/remove, redirects to anything
# outside /dev/null or our own /tmp file. The one sanctioned rm is the
# trap-driven cleanup of the local SSM JSON payload.

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

# Each entry is one line of the eventual bash script. SSM joins them with
# newlines; locally, we print them into a heredoc and pipe to bash. Using
# the same array in both modes keeps drift impossible.
COMMANDS=(
    "echo '=== CPU ==='"
    "LOAD=\$(awk '{printf \"%.2f/%.2f/%.2f\", \$1, \$2, \$3}' /proc/loadavg)"
    "CORES=\$(nproc)"
    "LC_ALL=C vmstat 1 2 | awk -v loadavg=\"\$LOAD\" -v cores=\"\$CORES\" 'NR==4 { printf \"  busy %d%%   user %d%%   sys %d%%   iowait %d%%   load %s   cores %d\\n\", 100-\$15, \$13, \$14, \$16, loadavg, cores }'"
    "echo"
    "echo '=== Memory ==='"
    "awk '/^MemTotal:/{t=\$2} /^MemAvailable:/{a=\$2} /^SwapTotal:/{st=\$2} /^SwapFree:/{sf=\$2} END { u=t-a; printf \"  RAM    total %7.2f GiB   used %7.2f GiB (%5.1f%%)   available %7.2f GiB (%5.1f%%)\\n\", t/1048576, u/1048576, u/t*100, a/1048576, a/t*100; if (st > 0) { su=st-sf; printf \"  Swap   total %7.2f GiB   used %7.2f GiB (%5.1f%%)\\n\", st/1048576, su/1048576, su/st*100 } }' /proc/meminfo"
    "echo"
    "echo '=== Disk ==='"
    "df -h --output=target,size,used,avail,pcent -x tmpfs -x devtmpfs -x squashfs -x overlay -x devpts -x proc -x sysfs"
    "echo"
    "echo '=== I/O (cumulative since boot, per block device) ==='"
    "awk '\$3 !~ /^(loop|ram|dm-|md|nbd)/ && (\$6 + \$10) > 0 { printf \"  %-12s read %8.2f GiB / %12d ops   write %8.2f GiB / %12d ops\\n\", \$3, \$6*512/1073741824, \$4, \$10*512/1073741824, \$8 }' /proc/diskstats"
)

# Prod-only: per-service RAM via cgroup v2 (systemd MemoryCurrent). Reports
# the cgroup's resident memory, which counts shared memory once and includes
# attributed page cache — the most honest single number for "how much RAM is
# this service using". These services don't exist on a developer box.
if [[ "$MODE" == "prod" ]]; then
    COMMANDS+=(
        "echo"
        "echo '=== Services (RAM) ==='"
        "TOTAL_KB=\$(awk '/^MemTotal:/{print \$2}' /proc/meminfo)"
        "TOTAL_BYTES=\$((TOTAL_KB * 1024))"
        "APP_BYTES=\$(systemctl show -p MemoryCurrent --value oppshan-files.service 2>/dev/null)"
        "PG_BYTES=\$(systemctl show -p MemoryCurrent --value postgresql.service 2>/dev/null)"
        "CADDY_BYTES=\$(systemctl show -p MemoryCurrent --value caddy.service 2>/dev/null)"
        "awk -v app=\"\$APP_BYTES\" -v pg=\"\$PG_BYTES\" -v caddy=\"\$CADDY_BYTES\" -v tot=\"\$TOTAL_BYTES\" 'BEGIN { app+=0; pg+=0; caddy+=0; printf \"  oppshan-files %7.1f MiB (%5.1f%% of RAM)\\n\", app/1048576, app/tot*100; printf \"  postgresql    %7.1f MiB (%5.1f%% of RAM)\\n\", pg/1048576, pg/tot*100; printf \"  caddy         %7.1f MiB (%5.1f%% of RAM)\\n\", caddy/1048576, caddy/tot*100; printf \"  combined      %7.1f MiB (%5.1f%% of RAM)\\n\", (app+pg+caddy)/1048576, (app+pg+caddy)/tot*100 }'"
        "echo"
        "echo '=== Services (I/O since service start, from cgroup v2 io.stat) ==='"
        "PER_APP_IO() { local cg=/sys/fs/cgroup/system.slice/\$1.service/io.stat; if sudo test -r \"\$cg\"; then sudo cat \"\$cg\" | awk -v s=\"\$1\" '{ for (i=2;i<=NF;i++) { split(\$i, p, \"=\"); if (p[1]==\"rbytes\") rb=p[2]; else if (p[1]==\"wbytes\") wb=p[2]; else if (p[1]==\"rios\") ri=p[2]; else if (p[1]==\"wios\") wi=p[2] } printf \"  %-14s read %7.1f MiB / %5d ops   write %7.1f MiB / %5d ops\\n\", s\":\", rb/1048576, ri, wb/1048576, wi }'; fi; }"
        "PER_APP_IO oppshan-files"
        "PER_APP_IO postgresql"
        "PER_APP_IO caddy"
    )
fi

run_local() {
    # Concatenate with newlines and execute as one bash -c invocation so
    # variables (LOAD, CORES) set in earlier entries persist.
    local script
    printf -v script '%s\n' "${COMMANDS[@]}"
    bash -c "$script"
}

run_prod() {
    # See resolve_instance_id at the top of the file — caches in /tmp for 1h
    # to avoid a ~3s AWS CLI cold-start on warm runs.
    local instance_id
    instance_id=$(resolve_instance_id)
    if [[ -z "$instance_id" || "$instance_id" == "None" ]]; then
        echo "No running EC2 instance tagged Name=oppshan-files." >&2
        exit 1
    fi

    local payload
    payload=$(mktemp /tmp/ssm-check-resources.XXXXXX.json)
    trap 'rm -f "$payload"' RETURN

    # jq builds the JSON from the COMMANDS array — handles all quote/backslash
    # escaping so we don't have to think about it.
    jq -n --arg id "$instance_id" --args '
        {
            InstanceIds: [$id],
            DocumentName: "AWS-RunShellScript",
            Comment: "check-resources",
            Parameters: { commands: $ARGS.positional }
        }
    ' -- "${COMMANDS[@]}" > "$payload"

    local cmd_id
    cmd_id=$(aws ssm send-command --cli-input-json "file://$payload" \
        --query 'Command.CommandId' --output text)

    # Visible latency is dominated by AWS CLI cold-start (~3s per invocation —
    # Python interpreter + boto3 import). We minimise CLI calls: send + sleep
    # + one combined fetch (status, stdout, stderr in a single get-command-
    # invocation parsed three times by jq, which is microseconds). Fall back
    # to `aws ssm wait` only when the first fetch shows still-in-progress.
    # The vmstat sampler inside the script takes ~1s on the instance, so we
    # sleep 2s before the first fetch.
    sleep 2
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

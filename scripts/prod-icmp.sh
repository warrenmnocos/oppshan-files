#!/usr/bin/env bash
# Toggle ICMP Echo Request (ping) ingress on the prod EC2 security group.
# Mirrors the /prod-icmp Claude slash command — see
# .claude/commands/prod-icmp.md for the design rationale.
#
# Usage:
#   scripts/prod-icmp.sh             # status (default — read-only)
#   scripts/prod-icmp.sh status
#   scripts/prod-icmp.sh enable
#   scripts/prod-icmp.sh disable
#
# Scope: a single rule on a single SG.
#   Protocol : ICMP type 8 (Echo Request), code 0 (AWS `-1` placeholder)
#   Source   : 0.0.0.0/0 (IPv4 anywhere)
#   Target SG: resolved by Name=group-name,Values=oppshan-app (override via SG_ID env var)
#
# READ-WRITE on that one rule. Allowed AWS calls:
#   - aws ec2 describe-security-groups            (status, idempotency check)
#   - aws ec2 authorize-security-group-ingress    (enable only)
#   - aws ec2 revoke-security-group-ingress       (disable only)
#
# Forbidden anywhere in this script body (never extend with these):
#   - aws ec2 verbs outside the three above
#   - aws ec2 *-security-group-egress             (egress is out of scope)
#   - aws ec2 modify-security-group-rules         (rule edits — disable + re-add instead)
#   - aws ec2 create-security-group               (would drift from deployment docs)
#   - aws ec2 delete-security-group               (would destroy the SG)
#   - authorize/revoke on any IpProtocol other than icmp type 8 / code 0 (-1)
#   - authorize/revoke on any CidrIp other than 0.0.0.0/0
#   - authorize/revoke on any SG other than the one returned by resolve_sg_id
#   - aws ssm send-command                        (this script never runs on the instance)
#   - Any shell mutation: rm, mv (overwrite), chown, chmod, kill, pkill,
#     systemctl start|stop|restart|reload|kill|enable|disable|mask, mount,
#     umount, sysctl -w, iptables, nft, dnf|apt|yum|rpm|pip|npm install/remove.

set -euo pipefail

SG_NAME="oppshan-app"
ICMP_TYPE=8        # Echo Request
ICMP_CODE=-1       # AWS convention for ICMP: "any code" (Echo has only code 0)
CIDR="0.0.0.0/0"
DESCRIPTION="Temporary ping (echo request) - disable later"

# Resolve the prod SG ID by group-name with a 1h /tmp cache to skip the
# AWS CLI cold-start on warm runs. SG_ID env var short-circuits the lookup.
resolve_sg_id() {
    if [[ -n "${SG_ID:-}" ]]; then
        echo "$SG_ID"
        return
    fi
    local cache=/tmp/.oppshan-sg-id
    if [[ -r "$cache" ]] && (( $(date +%s) - $(stat -c %Y "$cache" 2>/dev/null || echo 0) < 3600 )); then
        cat "$cache"
        return
    fi
    local id
    id=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=$SG_NAME" \
        --query 'SecurityGroups[].GroupId' --output text)
    if [[ -n "$id" && "$id" != "None" ]]; then
        echo "$id" > "$cache"
    fi
    echo "$id"
}

ACTION="${1:-status}"
case "$ACTION" in
    status|enable|disable) ;;
    *)
        echo "Usage: $0 [status|enable|disable]" >&2
        exit 2
        ;;
esac

SG_ID=$(resolve_sg_id)
if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
    echo "Could not resolve security group named '$SG_NAME'." >&2
    exit 1
fi

# Returns 0 if the exact (icmp, 8, -1, 0.0.0.0/0) ingress rule is present.
rule_exists() {
    local count
    count=$(aws ec2 describe-security-groups --group-ids "$SG_ID" \
        --query "length(SecurityGroups[].IpPermissions[?IpProtocol=='icmp' && FromPort==\`${ICMP_TYPE}\` && ToPort==\`${ICMP_CODE}\` && IpRanges[?CidrIp=='${CIDR}']])" \
        --output text)
    [[ "$count" -gt 0 ]]
}

# JSON IpPermissions blocks — authorize carries the description, revoke
# doesn't (revoke matches on protocol/ports/cidr; description is metadata).
ip_perm_enable_json() {
    cat <<EOF
[{"IpProtocol":"icmp","FromPort":${ICMP_TYPE},"ToPort":${ICMP_CODE},"IpRanges":[{"CidrIp":"${CIDR}","Description":"${DESCRIPTION}"}]}]
EOF
}
ip_perm_revoke_json() {
    cat <<EOF
[{"IpProtocol":"icmp","FromPort":${ICMP_TYPE},"ToPort":${ICMP_CODE},"IpRanges":[{"CidrIp":"${CIDR}"}]}]
EOF
}

case "$ACTION" in
    status)
        if rule_exists; then
            echo "ICMP echo request: ENABLED on $SG_ID ($SG_NAME) for $CIDR"
        else
            echo "ICMP echo request: DISABLED on $SG_ID ($SG_NAME)"
        fi
        ;;
    enable)
        if rule_exists; then
            echo "Already enabled on $SG_ID ($SG_NAME). No change."
            exit 0
        fi
        aws ec2 authorize-security-group-ingress \
            --group-id "$SG_ID" \
            --ip-permissions "$(ip_perm_enable_json)" \
            >/dev/null
        echo "Enabled ICMP echo request on $SG_ID ($SG_NAME) for $CIDR."
        ;;
    disable)
        if ! rule_exists; then
            echo "Already disabled on $SG_ID ($SG_NAME). No change."
            exit 0
        fi
        aws ec2 revoke-security-group-ingress \
            --group-id "$SG_ID" \
            --ip-permissions "$(ip_perm_revoke_json)" \
            >/dev/null
        echo "Disabled ICMP echo request on $SG_ID ($SG_NAME)."
        ;;
esac
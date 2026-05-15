#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

admin() { npm run --silent admin -- "$@" 2>/dev/null; }
log() { echo "→ $*" >&2; }

delete_group_by_name() {
  local name="$1"
  local id
  id=$(admin groups:list --json | jq -r --arg n "$name" '.[] | select(.name == $n) | .id')
  if [ -n "$id" ]; then
    admin groups:delete "$id"
    log "Deleted group: '$name' (id=$id)"
  else
    log "Skipped (not found): group '$name'"
  fi
}

delete_user_by_email() {
  local email="$1"
  # users:delete cascades through user_connections, removing all connections
  # with any user (including non-test users like jon@branam.us)
  if admin users:delete "$email"; then
    log "Deleted user: $email"
  else
    log "Skipped (not found): $email"
  fi
}

# ─── Groups ────────────────────────────────────────────────────────────────────

log "Deleting test groups..."
delete_group_by_name "Branams (test)"
delete_group_by_name "Board Games (test)"
delete_group_by_name "Josiah Friends (test)"

# ─── Users ─────────────────────────────────────────────────────────────────────
# Deleting each user cascades: time_entries, user_connections,
# user_connection_requests, user_invite_codes, group_members, user_movies,
# user_tv_series, watch_event_invites, watch_event_votes.
# This includes connections to non-test users (e.g. jon@branam.us).

log "Deleting test users..."
delete_user_by_email tiffany@branam.us
delete_user_by_email josiah@branam.us
delete_user_by_email judah@branam.us
delete_user_by_email samuel@branam.us
delete_user_by_email zeal@branam.us
delete_user_by_email esther@branam.us
delete_user_by_email gavin@branam.us
delete_user_by_email asher@branam.us
delete_user_by_email hayden@branam.us
delete_user_by_email moses@branam.us

log "Done!"

#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

admin() { npm run --silent admin -- "$@" 2>/dev/null; }
log() { echo "→ $*" >&2; }

create_user() {
  local email="$1" password="$2" name="$3" reset_password="${4:-false}" hashed="${5:-false}"
  local hash_flag=()
  [[ "$hashed" == "true" ]] && hash_flag=(--hashed)
  if admin users:create "$email" "$password" --name "$name" "${hash_flag[@]}"; then
    :
  else
    log "Skipped (already exists): $email"
    if [[ "$reset_password" == "true" ]]; then
      admin users:update-password "$email" "$password" "${hash_flag[@]}"
      log "Password reset: $email"
    fi
  fi
}

get_user_id() {
  local email="$1"
  admin users:list --json | jq -r --arg e "$email" '.[] | select(.email == $e) | .id'
}

get_or_create_group() {
  local name="$1"
  local existing
  existing=$(admin groups:list --json | jq -r --arg n "$name" '.[] | select(.name == $n) | .id')

  if [ -n "$existing" ]; then
    log "Group already exists: '$name' (id=$existing)"
    echo "$existing"
  else
    local new_id
    new_id=$(admin groups:create --name "$name" --json | jq -r '.id')
    log "Created group: '$name' (id=$new_id)"
    echo "$new_id"
  fi
}

add_to_group() {
  local group_id="$1" user_id="$2"
  admin groups:add-member "$group_id" "$user_id"
}

connect_pairs() {
  local ids=("$@")
  for ((i = 0; i < ${#ids[@]}; i++)); do
    for ((j = i + 1; j < ${#ids[@]}; j++)); do
      admin connections:create "${ids[i]}" "${ids[j]}"
    done
  done
}

# ─── Users ─────────────────────────────────────────────────────────────────────

log "Creating users..."
# assumes that jon@branam.us user already exists
create_user branam.tiffany@gmail.com  '$2b$10$dvsiw2EKeMw.EOrP7WFXm.9rXTsesMqwA.Wen81WK/Z4t/Fn8z6j.' Tiffany true true
create_user judah.branam@gmail.com    '$2b$10$b1TFNT6W80QWIy0G.X5Umek7hGeaAt/OGgH6y67k6CW/BIQpWH51K' Judah   true true
create_user josiah.branam@gmail.com   '$2b$10$05V5hqGR3cuy8dijt/XEn.Jgb5rvDoAQXzsxvk2JoZcgAa0b1js.u' Josiah  true true
create_user ezekiel.branam@gmail.com  '$2b$10$TgCUBUbvL7tAeIyZ5ymFGuLtUoR5pFkwyxCc92Ne6g6BduHq8uaZG' Zeal    true true
create_user samuel.e.branam@gmail.com '$2b$10$0gLwh9RjP8OMInx79fn9nemmhn69xVAEy1iEGTLDOznyr7YLZMsVi' Sam     true true
create_user esther.p.branam@gmail.com '$2b$10$Bj6Ex.nnsrtRDC/BXiMmkOBO/TQPY6ggym52NT5YUi5HvmUBRR.Ka' Esther  true true

# ─── User IDs ──────────────────────────────────────────────────────────────────

log "Fetching user IDs..."
ID_JON=$(get_user_id jon@branam.us)
ID_TIFFANY=$(get_user_id branam.tiffany@gmail.com)
ID_JUDAH=$(get_user_id judah.branam@gmail.com)
ID_JOSIAH=$(get_user_id josiah.branam@gmail.com)
ID_ZEAL=$(get_user_id ezekiel.branam@gmail.com)
ID_SAM=$(get_user_id samuel.e.branam@gmail.com)
ID_ESTHER=$(get_user_id esther.p.branam@gmail.com)

for var in ID_JON ID_TIFFANY ID_JUDAH ID_JOSIAH ID_ZEAL ID_SAM ID_ESTHER; do
  [ -n "${!var}" ] || { echo "ERROR: Could not resolve user ID for $var"; exit 1; }
done

log "IDs resolved: Jon=$ID_JON Tiffany=$ID_TIFFANY Judah=$ID_JUDAH Josiah=$ID_JOSIAH Zeal=$ID_ZEAL Sam=$ID_SAM Esther=$ID_ESTHER"

# ─── Branams ───────────────────────────────────────────────────────────────────

GROUP_BRANAMS=$(get_or_create_group "Branams")

log "Populating Branams (id=$GROUP_BRANAMS)..."
BRANAMS=($ID_JON $ID_TIFFANY $ID_JUDAH $ID_JOSIAH $ID_ZEAL $ID_SAM $ID_ESTHER)
for uid in "${BRANAMS[@]}"; do add_to_group "$GROUP_BRANAMS" "$uid"; done
log "Connecting Branams members..."
connect_pairs "${BRANAMS[@]}"

log "Done!"

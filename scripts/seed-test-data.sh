#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

admin() { npm run --silent admin -- "$@" 2>/dev/null; }
log() { echo "→ $*" >&2; }

create_user() {
  local email="$1" password="$2" name="$3"
  if admin users:create "$email" "$password" --name "$name"; then
    :
  else
    log "Skipped (already exists): $email"
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
# jon@branam.us and tiffany@branam.us already exist — create_user handles duplicates
create_user josiah@branam.us hello Josiah
create_user judah@branam.us hello Judah
create_user samuel@branam.us hello Samuel
create_user zeal@branam.us hello Zeal
create_user esther@branam.us hello Esther
create_user gavin@branam.us hello Gavin
create_user asher@branam.us hello Asher
create_user hayden@branam.us hello Hayden
create_user moses@branam.us hello Moses

# ─── User IDs ──────────────────────────────────────────────────────────────────

log "Fetching user IDs..."
ID_JON=$(get_user_id jon@branam.us)
ID_TIFFANY=$(get_user_id tiffany@branam.us)
ID_JOSIAH=$(get_user_id josiah@branam.us)
ID_JUDAH=$(get_user_id judah@branam.us)
ID_SAMUEL=$(get_user_id samuel@branam.us)
ID_ZEAL=$(get_user_id zeal@branam.us)
ID_ESTHER=$(get_user_id esther@branam.us)
ID_GAVIN=$(get_user_id gavin@branam.us)
ID_ASHER=$(get_user_id asher@branam.us)
ID_HAYDEN=$(get_user_id hayden@branam.us)
ID_MOSES=$(get_user_id moses@branam.us)

for var in ID_JON ID_TIFFANY ID_JOSIAH ID_JUDAH ID_SAMUEL ID_ZEAL ID_ESTHER ID_GAVIN ID_ASHER ID_HAYDEN ID_MOSES; do
  [ -n "${!var}" ] || { echo "ERROR: Could not resolve user ID for $var"; exit 1; }
done

log "IDs resolved: Jon=$ID_JON Tiffany=$ID_TIFFANY Josiah=$ID_JOSIAH Judah=$ID_JUDAH Samuel=$ID_SAMUEL Zeal=$ID_ZEAL Esther=$ID_ESTHER Gavin=$ID_GAVIN Asher=$ID_ASHER Hayden=$ID_HAYDEN Moses=$ID_MOSES"

# ─── Groups ────────────────────────────────────────────────────────────────────

GROUP_BRANAMS=$(get_or_create_group "Branams")
GROUP_BOARD_GAMES=$(get_or_create_group "Board Games")
GROUP_JOSIAH_FRIENDS=$(get_or_create_group "Josiah Friends")

# ─── Branams ───────────────────────────────────────────────────────────────────

log "Populating Branams (id=$GROUP_BRANAMS)..."
BRANAMS=($ID_JOSIAH $ID_JUDAH $ID_SAMUEL $ID_ZEAL $ID_ESTHER $ID_TIFFANY $ID_JON)
for uid in "${BRANAMS[@]}"; do add_to_group "$GROUP_BRANAMS" "$uid"; done
log "Connecting Branams members..."
connect_pairs "${BRANAMS[@]}"

# ─── Board Games ───────────────────────────────────────────────────────────────

log "Populating Board Games (id=$GROUP_BOARD_GAMES)..."
BOARD_GAMES=($ID_JON $ID_JOSIAH $ID_GAVIN $ID_ASHER $ID_HAYDEN $ID_ZEAL $ID_MOSES)
for uid in "${BOARD_GAMES[@]}"; do add_to_group "$GROUP_BOARD_GAMES" "$uid"; done
log "Connecting Board Games members..."
connect_pairs "${BOARD_GAMES[@]}"

# ─── Josiah Friends ────────────────────────────────────────────────────────────

log "Populating Josiah Friends (id=$GROUP_JOSIAH_FRIENDS)..."
JOSIAH_FRIENDS=($ID_JOSIAH $ID_GAVIN $ID_ASHER $ID_HAYDEN $ID_MOSES)
for uid in "${JOSIAH_FRIENDS[@]}"; do add_to_group "$GROUP_JOSIAH_FRIENDS" "$uid"; done
log "Connecting Josiah Friends members..."
connect_pairs "${JOSIAH_FRIENDS[@]}"

log "Done!"

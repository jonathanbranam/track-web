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
create_user tiffany@branam.us '$2b$10$NENoYexGLtTygQi7R8LjceuwxFlaVmvoSwCzrEIMRRqppQZNFxAZW' Tiffany true true
create_user josiah@branam.us '$2b$10$kA91w4PZyC3wI5MSUr9tU.y4DKLhp1nYHUnvXYWiRNAkceM0ZU8ya' Josiah true true
create_user judah@branam.us '$2b$10$B8ECmxkRnj5hg3XBUAI8.u0IUqAwtioweTsLfsOZ4G2I4BC/C/M52' Judah true true
create_user samuel@branam.us '$2b$10$.5vXvndwjD2fvFPxwYg62uIQMqaGnMXNz0.wtFNgMlBz4xwVPCGmS' Samuel true true
create_user zeal@branam.us '$2b$10$JYI.08ju/zJYmDlqrGn0AOp8NMxJkulKyntgY11rA3F9NBXlKdvpC' Zeal true true
create_user esther@branam.us '$2b$10$tuDaA5KqtDIzhVNR5YinTepOuuFN8ziliMDsNJ6njjiwboY5u7pSi' Esther true true
create_user gavin@branam.us '$2b$10$23dwdh6gm6IlqRHyItpMo.bTqrZ3CNXw.hqGdGGCC62SuTv606N5W' Gavin true true
create_user asher@branam.us '$2b$10$cjUIS7MYx.obnX/Z57P79eJwFTfnCAva3bzI4ES3fWhRbxDfMv21m' Asher true true
create_user hayden@branam.us '$2b$10$76JFW9IbLypQ.rd1Gd1SkO72DVJlxmxAeHfbkjjQMuedy9PmrVOPi' Hayden true true
create_user moses@branam.us '$2b$10$G53jvpUvOmMRome3KQtFaebhRXGcYY7z6yrlPLOPGr219svHKw6PK' Moses true true

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

create_movie() {
  local title="$1"; shift
  if ! admin movies:create --title "$title" "$@"; then
    log "Updating existing: $title"
    local id
    id=$(admin movies:list --json | jq -r --arg t "$title" '.[] | select(.title == $t) | .id')
    admin movies:update "$id" "$@"
  fi
}

create_tv() {
  local title="$1"; shift
  if admin tv:create --title "$title" "$@"; then
    :
  else
    log "Skipped (already exists): $title"
  fi
}

# ─── Movies ────────────────────────────────────────────────────────────────────

log "Creating movies..."
create_movie "The Shawshank Redemption"        --runtime 142  --release-year 1994  --tags "Drama"
create_movie "The Dark Knight"                 --runtime 152  --release-year 2008  --tags "Action,Crime,Thriller"
create_movie "Inception"                       --runtime 148  --release-year 2010  --tags "Sci-Fi,Action,Thriller"
create_movie "Parasite"                        --runtime 132  --release-year 2019  --tags "Drama,Thriller,Comedy"
create_movie "Interstellar"                    --runtime 169  --release-year 2014  --tags "Sci-Fi,Drama,Adventure"
create_movie "The Grand Budapest Hotel"        --runtime  99  --release-year 2014  --tags "Comedy,Drama"
create_movie "Mad Max: Fury Road"              --runtime 120  --release-year 2015  --tags "Action,Adventure,Sci-Fi"
create_movie "Get Out"                         --runtime 104  --release-year 2017  --tags "Horror,Thriller,Mystery"
create_movie "Everything Everywhere All at Once" --runtime 139 --release-year 2022 --tags "Sci-Fi,Comedy,Action"
create_movie "Knives Out"                      --runtime 130  --release-year 2019  --tags "Mystery,Comedy,Crime"
create_movie "Roma"                            --runtime 135  --release-year 2018  --tags "Drama"                   --streaming "Netflix"
create_movie "The Lighthouse"                  --runtime 109  --release-year 2019  --tags "Horror,Drama,Mystery"
create_movie "1917"                            --runtime 119  --release-year 2019  --tags "Action,Drama,Historical"
create_movie "Arrival"                         --runtime 116  --release-year 2016  --tags "Sci-Fi,Drama,Mystery"
create_movie "Coco"                            --runtime 105  --release-year 2017  --tags "Animation,Adventure"     --streaming "Disney+"
create_movie "Spirited Away"                   --runtime 125  --release-year 2001  --tags "Animation,Fantasy,Adventure"
create_movie "Logan"                           --runtime 137  --release-year 2017  --tags "Action,Drama,Superhero"
create_movie "Hereditary"                      --runtime 127  --release-year 2018  --tags "Horror"
create_movie "Whiplash"                        --runtime 107  --release-year 2014  --tags "Drama"
create_movie "The Truman Show"                 --runtime 103  --release-year 1998  --tags "Drama,Comedy,Sci-Fi"

# ─── TV Series ─────────────────────────────────────────────────────────────────

log "Creating TV series..."
create_tv "Breaking Bad"                 --episode-runtime 47  --seasons 5  --release-year 2008  --streaming "Netflix"     --tags "Drama,Crime,Thriller"
create_tv "The Wire"                     --episode-runtime 58  --seasons 5  --release-year 2002  --streaming "Max"         --tags "Drama,Crime"
create_tv "Severance"                    --episode-runtime 46  --seasons 2  --release-year 2022  --streaming "Apple TV+"   --tags "Drama,Sci-Fi,Thriller"
create_tv "Succession"                   --episode-runtime 60  --seasons 4  --release-year 2018  --streaming "Max"         --tags "Drama,Comedy"
create_tv "The Bear"                     --episode-runtime 30  --seasons 3  --release-year 2022  --streaming "Hulu"        --tags "Drama,Comedy"
create_tv "Andor"                        --episode-runtime 45  --seasons 2  --release-year 2022  --streaming "Disney+"     --tags "Sci-Fi,Action,Drama"
create_tv "The Last of Us"               --episode-runtime 55  --seasons 2  --release-year 2023  --streaming "Max"         --tags "Drama,Action,Horror"
create_tv "Shogun"                       --episode-runtime 60  --seasons 1  --release-year 2024  --streaming "Hulu"        --tags "Drama,Historical"
create_tv "Chernobyl"                    --episode-runtime 60  --seasons 1  --release-year 2019  --streaming "Max"         --tags "Drama,Historical,Thriller"
create_tv "Fleabag"                      --episode-runtime 25  --seasons 2  --release-year 2016  --streaming "Prime Video" --tags "Comedy,Drama"
create_tv "What We Do in the Shadows"    --episode-runtime 30  --seasons 6  --release-year 2019  --streaming "Hulu"        --tags "Comedy,Horror"
create_tv "The Expanse"                  --episode-runtime 45  --seasons 6  --release-year 2015  --streaming "Prime Video" --tags "Sci-Fi,Drama,Adventure"
create_tv "Arcane"                       --episode-runtime 40  --seasons 2  --release-year 2021  --streaming "Netflix"     --tags "Animation,Action,Fantasy"
create_tv "The Americans"                --episode-runtime 45  --seasons 6  --release-year 2013  --streaming "Hulu"        --tags "Drama,Thriller,Crime"
create_tv "Halt and Catch Fire"          --episode-runtime 45  --seasons 4  --release-year 2014  --streaming "Netflix"     --tags "Drama"
create_tv "Dark"                         --episode-runtime 45  --seasons 3  --release-year 2017  --streaming "Netflix"     --tags "Sci-Fi,Mystery,Thriller"
create_tv "Fargo"                        --episode-runtime 45  --seasons 5  --release-year 2014  --streaming "Hulu"        --tags "Crime,Comedy,Drama,Thriller"
create_tv "Slow Horses"                  --episode-runtime 45  --seasons 4  --release-year 2022  --streaming "Apple TV+"   --tags "Thriller,Drama,Crime"
create_tv "Interview with the Vampire"   --episode-runtime 60  --seasons 2  --release-year 2022  --streaming "Max"         --tags "Drama,Horror"
create_tv "For All Mankind"              --episode-runtime 60  --seasons 4  --release-year 2019  --streaming "Apple TV+"   --tags "Sci-Fi,Drama"

log "Done!"

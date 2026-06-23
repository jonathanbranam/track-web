#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(dirname "$(realpath "$0")")}"
LOG_FILE="${APP_DIR}/logs/deploy.log"

cd "${APP_DIR}"
mkdir -p logs

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
log()  { echo "[$(ts)] $*"; }
step() { echo "[$(ts)] RUNNING: $1"; }
done_step() { echo "[$(ts)] COMPLETED: $1"; }

trap 'log "ERROR: deploy failed (exit $?) at line $LINENO"' ERR

log "=== Deploy started ==="

step "git pull"
git pull --ff-only
done_step "git pull"

step "version.json"
SHA=$(git rev-parse --short HEAD)
COMMIT_TIME=$(git log -1 --format=%cI)
BUILD_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
printf '{"sha":"%s","commitTime":"%s","buildTime":"%s"}\n' "$SHA" "$COMMIT_TIME" "$BUILD_TIME" > "${APP_DIR}/version.json"
done_step "version.json"

step "npm install"
npm install --include=dev
done_step "npm install"

step "build:time"
npm run build:time
done_step "build:time"

step "build:watch"
npm run build:watch
done_step "build:watch"

step "build:proto"
npm run build:proto
done_step "build:proto"

step "build:trips"
npm run build:trips
done_step "build:trips"

step "build:play"
npm run build:play
done_step "build:play"

step "build:games"
npm run build:games
done_step "build:games"

step "build:admin"
npm run build:admin
done_step "build:admin"

step "build:me"
npm run build:me
done_step "build:me"

step "build:server"
npm run build:server
done_step "build:server"

step "pm2 restart"
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
done_step "pm2 restart"

step "pm2 save"
pm2 save
done_step "pm2 save"

step "caddy reload"
caddy reload --config "${APP_DIR}/Caddyfile" --adapter caddyfile
done_step "caddy reload"

log "=== Deploy complete ==="

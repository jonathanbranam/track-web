#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(dirname "$(realpath "$0")")}"
LOG_FILE="${APP_DIR}/logs/deploy.log"

cd "${APP_DIR}"
mkdir -p logs

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
log()  { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }
step() { echo "[$(ts)] RUNNING: $1" | tee -a "$LOG_FILE"; }
done_step() { echo "[$(ts)] COMPLETED: $1" | tee -a "$LOG_FILE"; }

trap 'log "ERROR: deploy failed (exit $?) at line $LINENO"' ERR

log "=== Deploy started ==="

step "git pull"
git pull --ff-only 2>&1 | tee -a "$LOG_FILE"
done_step "git pull"

step "npm install"
npm install 2>&1 | tee -a "$LOG_FILE"
done_step "npm install"

step "build:time"
npm run build:time 2>&1 | tee -a "$LOG_FILE"
done_step "build:time"

step "build:watch"
npm run build:watch 2>&1 | tee -a "$LOG_FILE"
done_step "build:watch"

step "build:server"
npm run build:server 2>&1 | tee -a "$LOG_FILE"
done_step "build:server"

step "pm2 restart"
(pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs) 2>&1 | tee -a "$LOG_FILE"
done_step "pm2 restart"

step "pm2 save"
pm2 save 2>&1 | tee -a "$LOG_FILE"
done_step "pm2 save"

step "caddy reload"
caddy reload --config "${APP_DIR}/Caddyfile" --adapter caddyfile 2>&1 | tee -a "$LOG_FILE"
done_step "caddy reload"

log "=== Deploy complete ==="

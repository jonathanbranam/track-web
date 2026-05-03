#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(dirname "$(realpath "$0")")}"

cd "${APP_DIR}"

echo '→ Pulling latest code...'
git pull --ff-only

echo '→ Installing dependencies...'
npm install

echo '→ Building time...'
npm run build:time

echo '→ Building movies...'
npm run build:movies

echo '→ Building server...'
npm run build:server

echo '→ Restarting app...'
mkdir -p logs
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs

echo '→ Saving pm2 process list...'
pm2 save

# Only needed if Caddyfile changed; safe to run regardless
echo '→ Reloading Caddy...'
caddy reload --config "${APP_DIR}/Caddyfile" --adapter caddyfile

echo 'Deploy complete.'

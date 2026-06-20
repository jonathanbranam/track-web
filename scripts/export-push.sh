#!/usr/bin/env bash
# Export the database to exports/backup/ and push to git only if data changed.
#
# The exports/ directory is a standalone git repository (not a submodule).
# This is a thin compatibility wrapper for cron — the logic lives in
# scripts/export-push.ts (src/lib/backup.ts), shared with the admin API.
#
# Example cron (daily at 3 AM UTC):
# 0 3 * * * cd /home/ec2-user/track-web && bash scripts/export-push.sh >> /var/log/export-push.log 2>&1

set -euo pipefail

cd "$(dirname "$0")/.."
exec npm run --silent db:export-push

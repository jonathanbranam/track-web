#!/usr/bin/env bash
# Export the database to exports/backup/ and push to git only if data changed.
#
# The exports/ directory is a standalone git repository (not a submodule).
#
# Example cron (daily at 3 AM UTC):
# 0 3 * * * cd /home/ec2-user/track-web && bash scripts/export-push.sh >> /var/log/export-push.log 2>&1

set -euo pipefail

ORIGINAL_DIR=$(pwd)
cd "$(dirname "$0")/.."

npm run db:export -- --backup

cd exports

if git diff --quiet -- backup/ && \
   [ -z "$(git ls-files --others --exclude-standard backup/)" ]; then
  echo "No changes in backup, skipping push."
  cd "$ORIGINAL_DIR"
  exit 0
fi

STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

git add backup/
git commit -m "chore: db backup ${STAMP}"
git push

cd "$ORIGINAL_DIR"
echo "Backup pushed."

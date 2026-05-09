#!/usr/bin/env bash
# Export the database to backup/ and push to git only if data changed.
#
# Example cron (daily at 3 AM UTC):
# 0 3 * * * cd /path/to/track-web && bash scripts/export-push.sh >> /var/log/export-push.log 2>&1

set -euo pipefail
cd "$(dirname "$0")/.."

npm run db:export -- --backup

# Check for changes: modified tracked files or newly untracked files under backup/
if git diff --quiet -- backup/ && \
   [ -z "$(git ls-files --others --exclude-standard backup/)" ]; then
  echo "No changes in backup, skipping push."
  exit 0
fi

git add backup/
git commit -m "chore: db backup $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push
echo "Backup pushed."

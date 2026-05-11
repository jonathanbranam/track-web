#!/usr/bin/env bash
# Export the database to exports/backup/ and push to git only if data changed.
#
# Example cron (daily at 3 AM UTC):
# 0 3 * * * cd /path/to/track-web && bash scripts/export-push.sh >> /var/log/export-push.log 2>&1

set -euo pipefail
cd "$(dirname "$0")/.."

npm run db:export -- --backup

# Check for changes within the submodule (backup/ is the root-relative path inside exports/)
if git -C exports diff --quiet -- backup/ && \
   [ -z "$(git -C exports ls-files --others --exclude-standard backup/)" ]; then
  echo "No changes in backup, skipping push."
  exit 0
fi

STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Commit and push the submodule
git -C exports add backup/
git -C exports commit -m "chore: db backup ${STAMP}"
git -C exports push

# Update the primary repo's submodule pointer
git add exports
git commit -m "chore: db backup ${STAMP}"
git push
echo "Backup pushed."

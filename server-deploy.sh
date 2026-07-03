#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(dirname "$(realpath "$0")")}"
cd "${APP_DIR}"

# The build's `npm install` can rewrite package-lock.json with non-deterministic
# `"peer": true` markers on optional platform binaries (e.g. lightningcss/esbuild),
# leaving the working tree dirty and making `git pull --ff-only` abort. Discard
# *only* that churn so the pull proceeds. Other local changes are left untouched
# (and still block the pull if they'd be overwritten — a deliberate safety check).
if ! git diff --quiet -- package-lock.json; then
  echo "Discarding local package-lock.json churn before pull"
  git checkout -- package-lock.json
fi

git pull --ff-only
exec bash "${APP_DIR}/scripts/build-deploy.sh"

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(dirname "$(realpath "$0")")}"
cd "${APP_DIR}"

git pull --ff-only
exec bash "${APP_DIR}/scripts/build-deploy.sh"

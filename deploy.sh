#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
# Set EC2_HOST in your environment or edit this default:
EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-ec2-user}"
APP_DIR="${APP_DIR:-/home/${EC2_USER}/track-web}"

# ── Validate ──────────────────────────────────────────────────────────────────
if [[ -z "$EC2_HOST" ]]; then
  echo "Error: EC2_HOST is not set."
  echo "Usage: EC2_HOST=your.ec2.hostname ./deploy.sh"
  exit 1
fi

echo "Deploying to ${EC2_USER}@${EC2_HOST}:${APP_DIR}"

# ── Deploy ────────────────────────────────────────────────────────────────────
ssh "${EC2_USER}@${EC2_HOST}" "APP_DIR=${APP_DIR} bash -s" < server-deploy.sh

#!/bin/bash
set -euo pipefail

# Only run in the hosted/remote Claude Code (web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Install project dependencies so the build and tests work in the session.
npm install --include=dev

# Install the OpenSpec CLI for the spec-driven workflow used in this repo.
npm install -g @fission-ai/openspec@latest

echo "session-start: dependencies and OpenSpec CLI installed"

#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TMUX:-}" ]]; then
  echo "Error: must be run inside a tmux session"
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
ORIGIN="$TMUX_PANE"

# Split right: movies frontend
tmux split-window -h -c "$DIR"
tmux send-keys "npm run dev -w client-movies" Enter

# Split bottom-right: caddy
tmux split-window -v -c "$DIR"
tmux send-keys "caddy run --config Caddyfile.local" Enter

# Return to original pane: backend + tracker
tmux select-pane -t "$ORIGIN"
tmux send-keys "npm run dev" Enter

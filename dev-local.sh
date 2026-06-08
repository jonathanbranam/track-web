#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TMUX:-}" ]]; then
  echo "Error: must be run inside a tmux session"
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
ORIGIN="$TMUX_PANE"

# Split right: watch frontend
tmux split-window -h -c "$DIR"
tmux send-keys "npm run dev -w client-watch" Enter

# Split bottom-right: proto frontend
tmux split-window -v -c "$DIR"
tmux send-keys "npm run dev -w client-proto" Enter

# Split bottom-right again: trips frontend
tmux split-window -v -c "$DIR"
tmux send-keys "npm run dev -w client-trips" Enter

# Split bottom-right again: play frontend
tmux split-window -v -c "$DIR"
tmux send-keys "npm run dev -w client-play" Enter

# New window: caddy
tmux new-window -c "$DIR"
tmux send-keys "caddy run --config Caddyfile.local" Enter

# Return to original pane: backend + tracker
tmux select-pane -t "$ORIGIN"
tmux send-keys "npm run dev" Enter

#!/usr/bin/env bash
# Preview instance: server + every client on dev port + 100, own SQLite.
# Usage: scripts/preview.sh start|stop|restart|status [app]   (app: server or a client name)
# Stop kills only the pid in its pidfile, after checking its command line.
set -u
cd "$(dirname "$0")/.."

DIR=.agent-instance/preview
PORTS=packages/config/preview-ports.json
APPS="server time watch proto trips play games admin me home talks"
API=http://localhost:3100

cmd=${1:-}
only=${2:-}
mkdir -p "$DIR"

port_of() { sed -n "s/.*\"$1\": *\([0-9]*\).*/\1/p" "$PORTS"; }
alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }
pid_of() { cat "${DIR:?}/${1:?}.pid" 2>/dev/null; }
drop_pidfile() { rm -f "${DIR:?}/${1:?}.pid"; }
# Marker that must appear in the pid's command line for it to be ours.
marker_of() { if [ "$1" = server ]; then echo "src/index.ts"; else echo "client-$1/vite.config.ts"; fi; }
is_ours() { ps -o command= -p "$1" 2>/dev/null | grep -qF -- "$(marker_of "$2")"; }

start_app() {
  local app=$1 port pid
  port=$(port_of "$app")
  pid=$(pid_of "$app")
  if alive "$pid" && is_ours "$pid" "$app"; then echo "$app: already running ($pid)"; return; fi
  if [ "$app" = server ]; then
    if [ ! -f "$DIR/preview.db" ]; then
      SQLITE_PATH=$DIR/preview.db npx tsx scripts/admin.ts users:create preview@example.com 'preview' --name 'Preview' \
        > "$DIR/user.log" 2>&1 || { echo "user creation failed, see $DIR/user.log"; return 1; }
      echo "created preview login preview@example.com / preview"
    fi
    PORT=$port SQLITE_PATH=$DIR/preview.db npx tsx src/index.ts > "$DIR/server.log" 2>&1 &
  else
    VITE_DEV_PORT=$port VITE_API_TARGET=$API \
      npx vite --host --config "client-$app/vite.config.ts" "client-$app" > "$DIR/$app.log" 2>&1 &
  fi
  echo $! > "$DIR/$app.pid"
  echo "$app: started on $port (pid $!)"
}

stop_app() {
  local app=$1 pid
  pid=$(pid_of "$app")
  if ! alive "$pid"; then echo "$app: not running"; drop_pidfile "$app"; return; fi
  if ! is_ours "$pid" "$app"; then
    echo "$app: pid $pid is not the preview process; leaving it, removing stale pidfile"
    drop_pidfile "$app"; return
  fi
  kill "$pid" && echo "$app: stopped ($pid)"
  drop_pidfile "$app"
}

status_app() {
  local app=$1 pid
  pid=$(pid_of "$app")
  if alive "$pid" && is_ours "$pid" "$app"; then echo "$app: running on $(port_of "$app") (pid $pid)"
  else echo "$app: stopped"; fi
}

apps=$APPS
if [ -n "$only" ]; then
  case " $APPS " in *" $only "*) apps=$only ;; *) echo "unknown app: $only"; exit 2 ;; esac
fi

case "$cmd" in
  start)   for a in $apps; do start_app "$a"; done ;;
  stop)    for a in $apps; do stop_app "$a"; done ;;
  restart) for a in $apps; do stop_app "$a"; done; for a in $apps; do start_app "$a"; done ;;
  status)  for a in $apps; do status_app "$a"; done ;;
  *) echo "usage: $0 start|stop|restart|status [app]"; exit 2 ;;
esac

#!/usr/bin/env bash
# Bridle's check: test and build only the clients this branch changed.
# No client changed (docs, specs): the games check. Exit status is the result.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

base=dev
git rev-parse --verify -q "$base" >/dev/null || base=main

changed=$( { git diff --name-only "$base"...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null || true )

apps=()
for dir in client-*/; do
  app=${dir#client-}
  app=${app%/}
  if printf '%s\n' "$changed" | grep -q "^client-$app/"; then
    apps+=("$app")
  fi
done
if [ ${#apps[@]} -eq 0 ]; then
  apps=(games)
fi

echo "bridle-check: apps: ${apps[*]}"
for app in "${apps[@]}"; do
  if [ -n "$(find "client-$app" -path '*/node_modules' -prune -o \( -name '*.test.ts' -o -name '*.test.tsx' \) -print -quit)" ]; then
    echo "bridle-check: vitest client-$app"
    npx vitest run "client-$app"
  fi
  echo "bridle-check: build:$app"
  npm run "build:$app"
done
echo "bridle-check: ok (${apps[*]})"

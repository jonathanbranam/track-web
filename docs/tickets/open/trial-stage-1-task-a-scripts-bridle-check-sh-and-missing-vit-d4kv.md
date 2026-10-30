---
id: tw-d4kv
title: "Trial stage 1, task A: scripts/bridle-check.sh and missing vitest globs"
kind: chore
created: 2026-10-30
created_by: agent:manager
theme: trial-stage-1
repos: [track-web]
changes: []
specs: []
blocked_by: []
related: [tw-fh2y, tw-vhjj]
---

## The ask

Task A of the approved stage-1 plan in ticket fh2y (section 4, with section 1 for the design). Add scripts/bridle-check.sh: it lists the client-* dirs changed by git diff --name-only dev...HEAD (plus uncommitted), runs vitest for a client only if it has test files and runs build:<app> for each; with no client changed it runs the games check as today (npx vitest run client-games && npm run build:games). Print which apps it ran; exit status is the result. Add the missing globs for client-time, client-home, client-proto, client-me and client-admin to the include list in vitest.config.mts, once, up front. Accept: the script exits 0 on an unchanged branch and on one touching only client-home/, prints which apps it ran, and exits nonzero when a stage-1 build is broken (try a deliberate type error, then revert it); npx vitest run still finds the same tests. Out of scope: config.toml (the check line changes only after this lands), client-talks beyond running its check when it changed.

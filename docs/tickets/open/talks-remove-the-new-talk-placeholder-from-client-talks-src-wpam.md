---
id: tw-wpam
title: "Talks: remove the new-talk placeholder from client-talks/src/talks.ts"
kind: chore
created: 2026-10-30
created_by: external:aide
repos: [track-web]
changes: []
specs: []
blocked_by: []
related: [tw-vhjj, tw-9bf3]
---

## The ask

The human, 2026-10-29 via aide (verbatim): "remove it", answering whether to remove the `new-talk` placeholder that tw-vhjj added (310a3f2), since the RAFT SDK talk is on hold and does not belong in track-web. Remove the `new-talk` entry and its comment from `client-talks/src/talks.ts`, plus any CHANGELOG line that announces it, before main next deploys. Leave `client-talks` in the trial scope (`.bridle/rules/scope.md`) as it is. Check: `npm run build:talks` and `npx vitest run client-talks`.

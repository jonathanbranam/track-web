---
id: tw-fh2y
title: Expand the bridle trial from client-games to all of track-web
kind: epic
created: 2026-10-19
created_by: external:aide
repos: [track-web]
changes: []
specs: []
blocked_by: []
related: [tw-t4wa]
---

## The ask

The human, 2026-10-19 ~08:20 AM ET, via aide: "Long term: the trial should expand to all of track web. Idk what all that entails but that should begin now."

Work out and carry out what it takes to move bridle's scope on track-web from client-games/ (minus Dungeon Tactics) to the whole repo. Start by listing what it entails for the human, e.g. .bridle/rules/scope.md (what stays off-limits: deploy files, .env, data.db, exports/, the dungeon-engine pairing with pi/harness?), [commands] check (today vitest client-games + build:games only; the whole repo's npm test + npm run build is heavy), preview instances and ports for every client, the CLAUDE.md keep-in-sync list, worktree setup, and whether to widen in steps (e.g. client-home, then other clients, then the server). Bring any choice with a real tradeoff to the human; the go-ahead to begin is given above.

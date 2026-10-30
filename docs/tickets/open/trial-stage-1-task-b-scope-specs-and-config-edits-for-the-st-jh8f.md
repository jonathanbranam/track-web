---
id: tw-jh8f
title: "Trial stage 1, task B: scope, specs and config edits for the stage-1 clients"
kind: chore
created: 2026-10-30
created_by: agent:manager
theme: trial-stage-1
repos: [track-web]
changes: []
specs: []
blocked_by: [tw-d4kv]
related: [tw-fh2y, tw-vhjj]
---

## The ask

Task B of the approved stage-1 plan in ticket fh2y (section 2 has the proposed text). Apply on dev: .bridle/rules/scope.md (stage-1 clients: client-games minus Dungeon Tactics, client-home, client-play, client-time, client-trips, client-proto, plus client-talks which tw-vhjj already added; keep the preview-upkeep exception; packages/ui and packages/auth stay out, stop and ask), .bridle/rules/specs.md (edit specs whose App tag is an in-scope app), and .bridle/config.toml (commands.check = scripts/bridle-check.sh once tw-d4kv has landed; fix the client-games-only header comments; max_workers stays 1). Per the human, the manager checks UI changes in a browser on the preview instance and the human checks anything bound for prod; workers stay build-and-test only; adjust .bridle/rules/dev-servers.md only if its wording conflicts. Accept: bridle ticket check clean; a following worker task on client-home is not stopped by scope.

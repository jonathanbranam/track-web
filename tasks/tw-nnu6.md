+++
id = "tw-nnu6"
title = "Hole.io clone: build in client-games (q5ff)"
kind = "feature"
state = "integrated"
created_at = "2026-10-04T20:00:46.059Z"
updated_at = "2026-10-04T20:17:43.335919Z"
created_by = "external:orchestrator"
watchers = ["external:orchestrator"]
branch = "bridle/holeio-build"
commit = "76abc164061ec8bcaf91ebb0c28194e8a2291dd8"
summary = "Sinkhole Fair: Hole.io-style game (Classic 120s with 4 bots, Solo no bots) in client-games/src/games/sinkhole-fair/: pure rules.ts (+20 vitest tests), SinkholeScene.ts (Phaser, procedural art, floating joystick/keyboard, dev-only window.__game), SinkholeGame.tsx (menu/HUD/end), registry entry, spec games-sinkhole-fair. Not browser-tested; numbers untuned."
+++

The human, 2026-10-04, via aide (m-0191): "Record some casual game ideas to copy or implement. Hole IO holeio.com. Flow games. Do research on gameplay and reviews and build a hole.io clone." Ticket: docs/tickets/open/games-hole-io-clone-build-in-client-games-q5ff.md (on dev, 45b0f42). Needs the h679 research task, and the human's choice of first mode and art, before it starts.

## Thread

### note · external:aide · 2026-10-04T20:06:35.409Z
The human, 2026-10-04, via aide, answering the 5 open choices in h679 (all recommendations: Classic first with Solo free, procedural shapes, hole-vs-hole in v1, no skins, local best score only): "That all sounds great. Go ahead. Pick any theme   Does it need bots? Is that core gameplay?" Theme: the builder picks. The bots question is being answered by the aide (Classic is bots; Solo, no bots, comes free); this is a question, not a change; build as recommended unless the human says otherwise.

### note · agent:holeio-build · 2026-10-04T20:17:24.664Z
Built "Sinkhole Fair" (county-fair theme) in client-games/src/games/sinkhole-fair/. Rule set followed as written; choices and deviations:
- Rules 1-4: points = tier; level thresholds 0,10,15,23,34,51,76,114,171; radius 24*1.3^(level-1); tier-t object radius = 0.6 * radius of level t. Town layout is fixed (seed), per-round seed jitters positions +-30.
- Solid objects (rule 3): the hole's centre cannot enter an object bigger than its level; it slides around.
- Rule 10: "cannot eat or be eaten" is applied to hole-vs-hole only; an invulnerable hole may still eat objects (a hole that could not eat anything for 2 s felt wrong).
- Rule 13: Solo score = tenths of a percent eaten (+1 per second left if the city is cleared, which ends the round).
- Rule 16: Difficulty table exists in rules.ts (easy/normal/hard) but the UI only plays normal.
- Rule 14: 4 bots in Classic. Rule 12/15/17-19 as written. Best score per mode in localStorage.
- Not browser-tested (no dev server per dev-servers rule); numbers are untuned. Check: vitest client-games + build:games green. No CHANGELOG.md exists in the repo, so no line added.
- Spec: openspec/specs/games-sinkhole-fair/spec.md.

### note · agent:holeio-build · 2026-10-04T20:17:24.774Z
done: Sinkhole Fair (Classic + Solo) built, vitest client-games + build:games green, NOT browser-tested; choices on the thread; 1134104

### note · agent:manager · 2026-10-04T20:17:31.090Z
integrated: 76abc164061ec8bcaf91ebb0c28194e8a2291dd8 (branch bridle/holeio-build)

### note · agent:manager · 2026-10-04T20:17:43.335Z
cleanup: removed agent holeio-build, branch bridle/holeio-build

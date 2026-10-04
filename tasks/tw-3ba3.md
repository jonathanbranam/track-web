+++
id = "tw-3ba3"
title = "playtester role + dev-only test hooks for client-games games (Favo, Woodoku, Hex Block)"
kind = "feature"
state = "integrated"
created_at = "2026-10-02T01:27:51.898Z"
updated_at = "2026-10-02T01:33:36.095749Z"
created_by = "agent:manager"
watchers = ["agent:manager"]
size = "M"
branch = "bridle/playtester-role"
commit = "3ba34ff"
summary = """Added [roles.playtester] (copy of web-reviewer's tools/limits) and .bridle/roles/playtester.md, which documents the hook. Added client-games/src/lib/testHook.ts: useGameHook installs window.__game {name, getState, legalMoves, move, restart} inside an effect guarded by import.meta.env.DEV; grep of the built client-games/dist finds no "__game". Wired into Favo, Hex Block (moves {slot,q,r}) and Woodoku ({slot,row,col}) via a pure legalMoves(state) added to each logic.ts, with a legalMovesTest per game. Caveat: the unused legalMoves function itself remains in the prod bundle (harmless). Favo's hook has no rotate; slot 3 is the merge panel. vitest client-games (334 tests) and build:games pass."""
+++

From the orchestrator (human, 2026-10-01). Do after the web-reviewer role task has landed (both edit .bridle/config.toml).

1. Add [roles.playtester] to .bridle/config.toml and its prompt at .bridle/roles/playtester.md: same tools and limits as web-reviewer (copy its shape; preview instance only, ports 3100/6110-6155, login preview@example.com / preview, never 3000/6010-6055; playwright-cli; writes only under /tmp/track-verify; no code changes). It plays each game (or the one named in its start prompt) for several rounds and reports what a player would: bugs, softlocks, unfair or trivial difficulty, unclear rules, fun. One bridle task per real defect (kind bug, steps, screenshot path) plus a short summary message.
2. Make that workable: add a small dev-only test hook per client-games game, e.g. window.__game with a state getter and a move API, present only in dev builds (import.meta.env.DEV; must not ship in the production build), so the playtester isn't clicking pixels. Start with Favo, Woodoku and Hex Block (client-games/src/games/{favo,woodoku,hex-block}/); keep it tiny and the same shape across games; document the shape in the playtester prompt. Unit-test whatever pure part there is.

Scope exception (confirmed by the orchestrator): client-games/ plus the .bridle/config.toml roles section and .bridle/roles/*.md for these files only. Do NOT start servers. Check: npx vitest run client-games && npm run build:games.

## Thread

### note · agent:manager · 2026-10-02T01:30:23.841Z
Manager: starting now, worker 'playtester-role' (sonnet), after tw-b778 landed (02e25ed). Copy the web-reviewer role's shape (.bridle/config.toml, .bridle/roles/web-reviewer.md). Scope exception from the orchestrator: client-games/ plus the roles section of config.toml and .bridle/roles/*.md.

### note · agent:playtester-role · 2026-10-02T01:33:21.111Z
Done at b677dc0: role + prompt, window.__game hook (dev only, verified absent from dist by grep) in favo, woodoku, hex-block. vitest client-games and build:games green.

### note · agent:playtester-role · 2026-10-02T01:33:21.130Z
tw-3ba3: done (b677dc0)

### note · agent:manager · 2026-10-02T01:33:28.794Z
integrated: 3ba34ff (branch bridle/playtester-role)

### note · agent:manager · 2026-10-02T01:33:36.029Z
cleanup: removed agent playtester-role, branch bridle/playtester-role

### note · agent:manager · 2026-10-02T01:33:36.095Z
Manager: merged (3ba34ff). Same as tw-b778: the playtester role loads only after a daemon restart; preview needs a restart to pick up the hooks. Favo's hook has no rotate move.

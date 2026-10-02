+++
id = "tw-3ba3"
title = "playtester role + dev-only test hooks for client-games games (Favo, Woodoku, Hex Block)"
kind = "feature"
state = "open"
created_at = "2026-10-02T01:27:51.898Z"
updated_at = "2026-10-02T01:27:51.898Z"
size = "M"
+++

From the orchestrator (human, 2026-10-01). Do after the web-reviewer role task has landed (both edit .bridle/config.toml).

1. Add [roles.playtester] to .bridle/config.toml and its prompt at .bridle/roles/playtester.md: same tools and limits as web-reviewer (copy its shape; preview instance only, ports 3100/6110-6155, login preview@example.com / preview, never 3000/6010-6055; playwright-cli; writes only under /tmp/track-verify; no code changes). It plays each game (or the one named in its start prompt) for several rounds and reports what a player would: bugs, softlocks, unfair or trivial difficulty, unclear rules, fun. One bridle task per real defect (kind bug, steps, screenshot path) plus a short summary message.
2. Make that workable: add a small dev-only test hook per client-games game, e.g. window.__game with a state getter and a move API, present only in dev builds (import.meta.env.DEV; must not ship in the production build), so the playtester isn't clicking pixels. Start with Favo, Woodoku and Hex Block (client-games/src/games/{favo,woodoku,hex-block}/); keep it tiny and the same shape across games; document the shape in the playtester prompt. Unit-test whatever pure part there is.

Scope exception (confirmed by the orchestrator): client-games/ plus the .bridle/config.toml roles section and .bridle/roles/*.md for these files only. Do NOT start servers. Check: npx vitest run client-games && npm run build:games.

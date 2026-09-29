---
id: scope
severity: must
roles: [manager, worker]
---
This trial covers `client-games/` only, minus Dungeon Tactics. Change files
under `client-games/` and nowhere else, except the specs for it
(`openspec/specs/`, `**App**: games`) and a test or fixture the change needs.

Don't touch, even for a small fix:
- `client-games/src/games/dungeon-tactics-solo/**` and `packages/dungeon-engine/**`
  (harness consumes the engine; changes there need paired work that bridle
  can't do yet);
- the other clients, `src/` (the server), `packages/`, `scripts/pixellab/`;
- deploy files (`deploy.sh`, `server-deploy.sh`, `ecosystem.config.cjs`,
  `Caddyfile*`), `.env`, `.mcp.json`, `data.db`, `exports/`.

If a task seems to need any of these, stop and say so to the manager, who
asks the orchestrator.

Why: the human is vetting bridle on one client first (2026-09-29); other
areas are onboarded only once this one proves out.

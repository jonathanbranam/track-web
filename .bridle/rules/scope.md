---
id: scope
severity: must
roles: [manager, worker]
---
This trial covers the clients listed below, minus Dungeon Tactics. Change
files under those clients' directories and nowhere else, except the specs for
them (`openspec/specs/`, `**App**:` tag of an in-scope app), the docs for them
(`docs/<app>/`), and a test or fixture the change needs.

In scope (stage 1, 2026-10-30): `client-games/` (minus Dungeon Tactics),
`client-home/`, `client-play/`, `client-time/`, `client-trips/`,
`client-proto/`, and `client-talks/` (see below).

Don't touch, even for a small fix:
- `client-games/src/games/dungeon-tactics-solo/**` and `packages/dungeon-engine/**`
  (harness consumes the engine; changes there need paired work that bridle
  can't do yet);
- the other clients (`client-admin`, `client-me`, `client-watch`), `src/` (the server), `packages/`, `scripts/pixellab/`;
- deploy files (`deploy.sh`, `server-deploy.sh`, `ecosystem.config.cjs`,
  `Caddyfile*`), `.env`, `.mcp.json`, `data.db`, `exports/`;
- the shared sync-list files (root `package.json`, `package-lock.json`,
  `vitest.config.mts`, `openapi.yaml`, `CLAUDE.md`, `dev-local.sh`,
  `scripts/build-deploy.sh`), except as "Shared files" says.

Shared files: a task may edit `README.md`, `llm-context.md` and
`client-home/src/pages/DirectoryPage.tsx` only for a line about an in-scope
app. Anything else on the sync list needs the manager's go first.

`packages/` stays out, but every stage-1 client imports `@repo/auth` and/or
`@repo/ui`: a task that needs a change there stops and asks.

If a task seems to need any of these, stop and say so to the manager, who
asks the orchestrator.

Also in scope (the human, 2026-10-29): `client-talks/` and its entries in the files
CLAUDE.md's sync list names for a talk. Its check is `npm run build:talks` plus
`npx vitest run client-talks`. It is public, no auth, not a PWA; Phaser stays
externalized there too.

Why: the human is vetting bridle one client at a time (2026-09-29), and on
2026-10-19 chose to widen in stages (ticket tw-fh2y).

Exception, preview upkeep (tw-da8e): `scripts/preview.sh`,
`packages/config/preview-ports.json`, `docs/dev-second-instance.md`,
`.bridle/rules/dev-servers.md`, and the `VITE_DEV_PORT`/`VITE_API_TARGET` lines
in each client's `vite.config.ts` may be changed for preview upkeep.

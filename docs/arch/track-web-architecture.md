# track-web Architecture Reference

Written as a reference for building the **deck-harness** / multi-harness pi-agent
project (`docs/talks/deck-harness/planning.md`). Captures how track-web is
actually built and deployed today, so the new harness project can reuse the
validated pieces and knowingly diverge where it needs to (WebSocket transport,
long-lived in-process agent sessions, per-harness backends).

See also: `docs/talks/deck-harness/planning.md` for the harness design itself,
and the fit-assessment discussion that preceded this doc (deck-harness should
**not** be merged into track-web's single PM2 process — see "What this means
for the new harness solution" at the end).

## Server (Hono + SQLite)

- **Single Node process** (`src/index.ts` entry, `src/app.ts` builds the Hono
  app), run via `@hono/node-server`'s `serve()`. Dev: `tsx watch src/index.ts`.
  Build: `tsc` (CommonJS/ES2022, `strict: true`) → `out/`. Prod start:
  `node out/src/index.js`, managed by **PM2** (one app in
  `ecosystem.config.cjs`, `autorestart: true`, logs to `logs/`).
- **Routing**: one route module per feature area (`routes/entries.ts`,
  `routes/auth.ts`, `routes/trips.ts`, `routes/games.ts`, etc.), each mounted
  under `/api/<area>/*`, composed in `app.ts`, wired up in `index.ts` with all
  repos/deps constructed there and threaded through.
- **DB**: `better-sqlite3`, one file (`data.db`, path from `SQLITE_PATH` env),
  inline migrations in `db.ts`. Data access goes through a repository layer
  (`repositories/interfaces.ts` + `repositories/sqlite/*`) — keeps route
  handlers thin and testable.
- **Auth**: cookie session (`sid`, HttpOnly, 30-day) validated against a
  `sessions` table (hash stored, not the raw token) plus optional Bearer API
  tokens for programmatic/agent access. `middleware/auth.ts` gates protected
  routes.
- **Env**: `src/env.ts` — `requireEnv()` fails fast on missing required vars,
  loaded via `dotenv/config`. Pattern: `SESSION_SECRET`, `PORT`,
  `SQLITE_PATH`, feature-specific keys (e.g. `TMDB_API_KEY`).
- **No WebSocket/long-lived in-process state anywhere today** — everything is
  stateless request/response over SQLite. This is the piece the harness
  introduces fresh.

## Clients (Vite + React)

- Each client is its own npm workspace: `client-<name>/` with
  `package.json`, `vite.config.ts`, `index.html`, `src/`. Stack: **React 19,
  React Router 7, Vite 6, Tailwind 4**, TypeScript build via
  `tsc -b && vite build`.
- **Shared packages** consumed via `"@repo/x": "*"` workspace deps:
  - `packages/auth` — `AuthProvider`/`useAuth`/`AuthGuard`/`LoginPage`/
    `UserChip`, shared by every client for session-cookie auth.
  - `packages/ui` — shared components.
  - `packages/config` — cross-cutting config, notably `dev-ports.json` (one
    fixed local dev port per app, e.g. `talks: 6055`), imported directly into
    each `vite.config.ts`.
- Dev server proxies `/api` to `http://localhost:3000` (the one backend) via
  Vite's `server.proxy`.
- **Phaser externalization pattern** (relevant only if a harness embeds
  something similarly heavy): `vite.config.ts` →
  `build.rollupOptions.external: ['phaser']`, `index.html` → CDN import map
  pinned to the exact version in `package.json`. This exists specifically to
  protect the resource-constrained production build box — keep it in mind if
  any harness pulls in something large.

## Caddy / TLS

- **Production `Caddyfile`**: one block per subdomain (`time.branam.us`,
  `talks.branam.us`, …), each with
  `handle /api/* { reverse_proxy localhost:3000 }` +
  `handle { root * <app>/dist; try_files {path} /index.html; file_server }`.
  TLS is fully automatic — `branam.us` has a wildcard DNS record, and Caddy
  obtains Let's Encrypt certs on first request per subdomain with zero extra
  config.
- **Local `Caddyfile.local`**: mirrors the same block-per-app shape but
  proxies to local dev ports on `*-branam-us.duckdns.org:80` instead of
  terminating TLS.
- Formatting rule: tabs not spaces, `caddy fmt --overwrite` after edits;
  `handle` blocks are required so `file_server` doesn't swallow non-GET
  `/api/*` requests.

## Deploy pipeline

- `server-deploy.sh` (thin entry point): discards any `package-lock.json`
  churn, `git pull --ff-only`, execs `scripts/build-deploy.sh`.
- `scripts/build-deploy.sh`: writes `version.json` (git sha/commit
  time/build time) → `npm install --include=dev` → sequentially runs
  `build:<each-client>` (10 of them today) → `build:server` (`tsc`) →
  `pm2 restart ecosystem.config.cjs --update-env` → `pm2 save` →
  `caddy reload`.
- Triggered by push to `main` (via the GitHub webhook / admin deploy
  trigger); push to `dev` is backup-only, no deploy.
- **Resource ceiling**: t4g.micro, 2 vCPU burstable / 1GB RAM, running this
  entire sequential build plus the single always-on PM2 process. This is the
  actual constraint that argues against merging a stateful agent-session
  server into this same box/process.

## Local dev

- `dev-local.sh`: tmux script, must run inside a tmux session — splits panes
  for every client (`npm run dev -w client-X`), one pane for
  `caddy run --config Caddyfile.local`, and the original pane runs the
  backend (`npm run dev`). Each client dev server binds its fixed port from
  `packages/config/dev-ports.json`.
- Node: v24.x (via nvm; no `.nvmrc` committed, so version is whatever's
  active in the shell — `v24.12.0` in this environment).

## Testing

- **Vitest is configured**, root `vitest.config.mts`, `environment: 'node'`,
  `include` list explicitly enumerates `src/**/*.test.ts` plus test globs in
  `client-watch`, `client-games`, `client-trips`, `client-play`,
  `client-talks`, and `packages/config` — new workspaces have to be added to
  this include list manually to get picked up. Run via `npm test`
  (`vitest run`) at the root. Test env injects
  `SESSION_SECRET: 'test-secret'`. Tests are colocated (`foo.ts` next to
  `foo.test.ts`), not in a separate `__tests__` tree.

## What this means for the new harness solution

Given the stated shape for the harness project — separate deployable(s),
paired server+client per harness, possibly multiple backends — the pieces to
**replicate directly** (validated, cheap, no reason to reinvent):

- npm workspaces monorepo shape, with a `packages/` tier for shared code
  across harnesses (auth primitives, UI shell, dev-ports-style config) —
  mirrors `@repo/auth`/`@repo/ui`/`@repo/config` here.
- Hono + `@hono/node-server`, `tsx watch` for dev, `tsc` build for prod, same
  `env.ts` `requireEnv` pattern.
- Vite + React 19 + Router 7 + Tailwind 4 client convention, same
  dev-port-registry approach if there end up being several harness UIs.
- Caddy per-subdomain block pattern + wildcard DNS/Let's Encrypt — trivially
  extends to `deck.branam.us` etc. regardless of which box runs it.
- Vitest at the root with an explicit `include` glob per workspace.

The piece that's **new territory, not reused**, is exactly the part the
harness plan calls for: a WebSocket layer and a long-lived in-process
`AgentSession` map. Since each harness pairs its own server with its own
client, each harness's process should own its own
`sessionId -> AgentSession` state rather than centralizing it — this keeps
failure domains per-harness even if multiple harnesses later end up behind
one Caddy config on the same box.

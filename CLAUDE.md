# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (backend only — tsx watch)
npm run dev

# Each client app is run standalone via its workspace (ports: packages/config/dev-ports.json), e.g.:
npm run dev -w client-time
npm run dev -w client-home
./dev-local.sh          # inside tmux: every client + Caddy (Caddyfile.local)

# Build
npm run build           # every client + server, in parallel (concurrently)
npm run build:<app>     # one client (Vite): time, watch, proto, trips, play, games, admin, me, home, talks
npm run build:server    # server only (tsc)

# Production
npm start               # runs compiled server from out/src/index.js

# Test
npm test                    # vitest run — src/, packages/{config,dungeon-engine}, and client-{watch,games,trips,play,talks}
                              # (include list in vitest.config.mts; time/admin/me/home/proto have no tests yet —
                              #  a new test dir in one of those must be added to that list or it won't run)
npm run test:dungeon-tactics # separate config; only needed when working on dungeon-tactics-solo
                              # (its Gherkin .feature scenarios are NOT covered by `npm test`)

# Utilities
npm run admin -- <cmd>  # admin CLI (scripts/admin.ts) — users, tokens, invites, per-app data; see README
npm run prune-sessions  # delete expired rows from the sessions table
npm run db:export       # snapshot all tables to exports/ (db:import restores; db:export-push = cron backup)
npm run seed-test       # populate groups/connections/sample content (seed-test:teardown removes it)
npm run hash-password   # vestigial — prints a bcrypt hash, but nothing reads it (logins are in the users table)
```

No lint command is configured.

## Local Testing

When testing on a real device, the app is loaded from an iPhone over the local network via HTTP (e.g. `http://10.0.0.113:6035`). This is **not a secure context** (`window.isSecureContext === false`), which has implications:

- `DeviceMotionEvent.requestPermission` on iOS 13+ requires a secure context — it will silently fail (reject) over plain HTTP on a LAN IP.
- Any Web API gated on secure context (e.g. Web Crypto, certain sensor APIs) will be unavailable or broken.
- When working on features that use these APIs, either note the limitation or suggest testing via the production URL (`https://games.branam.us`) where Caddy provides HTTPS.

## Verification

When using `playwright-cli screenshot`, always save to `/tmp/track-verify/` — never the project root. Example:

```bash
mkdir -p /tmp/track-verify
playwright-cli screenshot --filename=/tmp/track-verify/my-screenshot.png
```

### Driving the UI in a browser: use a second instance, don't touch the running one

The developer keeps a server and client running at all times. **Do not kill or
restart them, and do not create users in the dev database** to get a login.

Instead stand up a disposable instance on its own port with its own SQLite file
and its own user — see [`docs/dev-second-instance.md`](docs/dev-second-instance.md)
for the three commands. `client-games/vite.config.ts` reads `VITE_DEV_PORT` and
`VITE_API_TARGET` to make this possible; a client started on a different port
without `VITE_API_TARGET` still proxies `/api` to the developer's server, which
defeats the point. Other client apps hardcode their proxy target and need the
same two lines before they can be driven this way.

Authentication goes through the `users` table, not env vars. Creating a
login is `npx tsx scripts/admin.ts users:create <email> <password>` against the
target `SQLITE_PATH`; there is no hash to place in an env file, and a fresh
database self-migrates on first open.

> **Keep in sync:** When adding, renaming, or removing client apps or subdomains, update all of these files together:
> - `Caddyfile` — production reverse proxy routes and static file roots
> - `Caddyfile.local` — local dev proxy routes
> - `server-deploy.sh` — thin entry point (`git pull` + `exec`); rarely needs to change
> - `scripts/build-deploy.sh` — build steps (must match the `build:*` scripts in `package.json`)
> - `package.json` — `workspaces`, the `build:<app>` script, and the combined `build` list
> - `packages/config/dev-ports.json` — each app's Vite dev port (read by every `vite.config.ts` and by `getAppUrl`)
> - `vitest.config.mts` — the test `include` list, if the app has tests
> - `dev-local.sh` — tmux panes for local dev sessions
> - `openapi.yaml` — OpenAPI spec; update whenever an API route is added, modified, or removed
> - `llm-context.md` — LLM agent context guide; update when feature areas, auth behavior, or key conventions change
> - `client-home/src/pages/DirectoryPage.tsx` — static app card list; update `APPS` array when apps are added or removed
> - `README.md` — the Apps table
>
> **Admin CLI docs:** `README.md` documents only the global `scripts/admin.ts` commands (users, invites, tokens, version, maintenance). App-specific commands are documented in `docs/<app>/admin-cli.md` (watch, trips, games, me). When adding or changing an admin command, update the matching file — every command should be documented in exactly one place.

> **DNS:** `branam.us` has a wildcard DNS record (`*.branam.us`) pointing to the production server. No new DNS records are needed when adding a new client app subdomain — Caddy handles SSL via Let's Encrypt automatically on first request.

> **Deployment:** Pushing to `main` triggers a deployment — the server pulls, rebuilds, and re-launches all apps. Pushing to `dev` does **not** trigger a rebuild or deploy; it only keeps the source code safely backed up on the remote.

> **Production host is underpowered:** the EC2 instance is a **t4g.micro** (2 vCPU burstable, 1 GB RAM). Every push to `main` runs a full `npm install` plus a sequential build of every workspace on this box, so any single build step that is large or CPU/memory intensive can starve the others, blow past burst credits, and leave the instance unresponsive (AWS marks it "unhealthy" — not just the app crashing). Avoid adding heavy build-time work to a client app; if a dependency is inherently large, keep it out of the bundler entirely (see the Phaser pattern below) rather than relying on tree-shaking/minification to save it.
>
> **Phaser must always be externalized, never bundled.** Phaser is large and slow for Rollup/esbuild to tree-shake — bundling it was the root cause of a build that overwhelmed the t4g.micro and took the instance down (2026-07-03). Any client app that uses Phaser must follow the `client-games` pattern exactly:
> 1. `vite.config.ts` — add `build: { rollupOptions: { external: ['phaser'] } }` so Vite never bundles it.
> 2. `index.html` — add an import map loading Phaser from a CDN, pinned to the version in that app's `package.json`:
>    ```html
>    <script type="importmap">
>      {"imports":{"phaser":"https://cdn.jsdelivr.net/npm/phaser@<version>/dist/phaser.esm.js"}}
>    </script>
>    ```
> 3. `package.json` — keep `phaser` as a regular dependency (needed for local dev/type-checking); the CDN import only affects the production build.
>
> Reference implementations: `client-games/vite.config.ts` + `client-games/index.html`, and `client-talks/vite.config.ts` + `client-talks/index.html`.

## Planning

Future work is tracked in per-app planning docs. Check these before starting new work, and add items here when identifying future improvements:

- `docs/app/planning.md` — cross-app and shared infrastructure
- `docs/watch/planning.md` — watch app
- `docs/time/planning.md` — time app
- `docs/games/planning.md` — games app
- `docs/play/planning.md` — play app
- `docs/food/planning.md` — food app (not built yet; "Coming soon" in the directory)

## OpenSpec: archive a change when the user says the work is done

This repo plans work as OpenSpec changes under `openspec/changes/`. The sequence
at the end of a change is:

1. Finish the tasks and verify the work.
2. **Present the change and its verification to the user** — what landed, what
   the tests say, what was checked by hand.
3. **Wait.** The user reviews, and may independently verify.
4. **Only once the user confirms**, sync and archive:
   ```bash
   openspec validate <change-name> --strict
   openspec archive <change-name> -y      # folds the delta into openspec/specs/
   ```
5. Then start the next piece of work.

**Do not archive on your own judgement that the work is verified.** Archiving
asserts the change is done and checked, and that assertion is the user's to make.
An archived change is also the harder thing to revisit.

Equally, **do not start the next change while a finished one sits unpresented.**
Archiving late is only a problem in one specific case, but it is a sharp one:

- **Two changes that modify the same capability.** A delta is written against the
  main spec as it stands, and archiving is what folds a delta in — so if the
  first is not archived, the second is authored against a spec missing the
  first's requirements. `openspec archive` then refuses it: *"current spec
  contains scenario(s) not present in the modified block."* Reconciling by hand
  afterwards is exactly the drift the format exists to prevent. A `MODIFIED`
  requirement replaces its whole block, scenarios included, so the longer a
  change waits the more likely the requirement moved underneath it.
- Changes touching *different* capabilities do not have this problem and can sit
  safely. It is same-spec pile-up that hurts.

If a change is only *partly* verified, present it as partly verified and say what
is outstanding rather than archiving any of it.

## Architecture

A **self-hosted, multi-app PWA platform** — an npm-workspaces monorepo with one Hono (Node.js) backend, one SQLite file, and ten React 19 + Vite client apps, each on its own `*.branam.us` subdomain. Every app shares one login: the `sid` cookie is set on `.branam.us` in production. There are multiple users, with invites, social connections, and groups; most data belongs to the user who created it. Admin features (the `requireAdmin` middleware, the Admin app) are limited to **user 1**.

Full feature and API detail lives in `llm-context.md` (the agent guide, also served at `/api/llm-context.md`), `openapi.yaml`, and `docs/arch/track-web-architecture.md`. Specs are in `openspec/specs/`. This section is only a map.

### Backend (`src/`)

- **`index.ts`** — entry point, server startup
- **`app.ts`** — Hono app, repository wiring, route registration, static fallback to `client-time/dist`
- **`db.ts`** — SQLite connection via `better-sqlite3`; migrations are a list of id'd entries tracked in `schema_migrations`, and `getDb()` runs them on first open, so a fresh file sets itself up
- **`env.ts`** — environment variables (all optional, with defaults), loaded via `dotenv/config`
- **`routes/`** — one router per area, mounted under `/api`: `auth` (login/logout/me/tokens; `/api/auth/forgot` is a honeypot that logs the attempt (timestamp + IP) and returns a generic message), `invites`, `deploy` (GitHub webhook), `admin/*` (backups, deploy, logs, users, invites, games), `users`, `social`, `entries` (`/api/time/entries`), `trips` + `trips-days` + `packing` + `putt` (all under `/api/trips`), `scores`, `scoreGames` (`/api/play`), `games` + `orbitalConfigs`/orbital levels (`/api/games`), `watch/*`, `version`
- **`repositories/sqlite/`** — data access layer (implements interfaces from `repositories/interfaces.ts`)
- **`middleware/auth.ts`** — session cookie or `Authorization: Bearer` token auth; `requireAdmin`
- **`lib/backup.ts`** / **`lib/deploy.ts`** — backup/restore and deploy spawning, shared by the CLI scripts and the admin API
- **`utils/session.ts`** — mints the opaque `sid` token and hashes it (SHA-256) for the `sessions` table; cookie helpers
- **`utils/tags.ts`** — tag parsing (`#tag` and `:tag` tokens → normalized in description and tags column)
- **`utils/date.ts`** — timezone logic (4 AM ET day boundary)
- **`utils/tmdb.ts`** — TMDB client for watch search/import

Admin tooling lives in `scripts/` (`admin.ts` CLI, export/import, prune-sessions, seed scripts, `build-deploy.sh`).

### Shared packages (`packages/`)

- **`auth`** (`@repo/auth`) — shared login flow for every client: `AuthGuard`, `useAuth` (auth context), `authApi`, `LoginPage` (email + password; "Forgot Login?" calls the honeypot; "Create Account" goes to `BetaPage`, a closed-beta message), `LogoutPage`, `UserChip`
- **`ui`** — shared React components, including the social (people/groups) UI
- **`config`** — `dev-ports.json` (each app's dev port) and `getAppUrl`, which rewrites production app URLs to the matching dev port or duckdns host when running under Vite
- **`dungeon-engine`** — see below

`@repo/dungeon-engine` holds the Dungeon Tactics **rules** — `types`, `turn`,
`pc`, `npc`, `pathfinding`, `attackFootprint`, `unitDefs`, the
`defStore`/`contentStore` in-memory state, and the `actions` surface
(`availableActions`, `preview`, `commitAction`, `threatTiles`). It is extracted
from `client-games/src/games/dungeon-tactics-solo/`, which keeps only the Phaser
rendering (`DungeonTacticsScene.ts`, `boardRender.ts`).

Two rules about it:

- **It is consumed by a second repo.** The sibling `pi/harness` project's
  dungeon design bench imports it over a relative `file:` path, and runs it
  under **Node, not a browser**. So the package must stay free of `fetch`,
  `localStorage`, `window`, and Phaser — loading lives in each host, and the
  package exposes only the apply/deserialize half (`applyLoaded`,
  `deserialize`). Breaking this breaks the harness silently.
- **It owns gameplay decisions, not just geometry.** Anything that answers
  *"what may this unit do right now, what may the player pick, and is that pick
  legal"* belongs in `actions.ts`. Hosts render and dispatch. Both hosts once
  re-derived targeting themselves and disagreed — that is exactly the class of
  bug the action surface exists to prevent.

### Client apps

| Workspace | Dev port | Purpose |
|---|---|---|
| `client-home` | 6050 | App directory (`DirectoryPage` `APPS`); Admin/Proto cards shown only to user 1 |
| `client-time` | 6010 | Time tracking — the original app (details below) |
| `client-watch` | 6015 | Movie/TV catalog, watchlists, ratings, watch events, TMDB import |
| `client-trips` | 6025 | Current trip: Overview, Days, Info, Packing |
| `client-play` | 6030 | In-person companion: Putt scorecard (current trip) + Score tracker |
| `client-games` | 6035 | Phaser 3 games: Ball Merge, Orbital Dodger, Dungeon Tactics (solo) — Phaser is loaded from a CDN, never bundled (see above) |
| `client-me` | 6045 | Account, password, people/connections, groups, invite claim |
| `client-admin` | 6040 | User 1 only: deploy, backups, users, tokens, logs |
| `client-talks` | 6055 | Public talks site — no auth, not a PWA; also uses Phaser |
| `client-proto` | 6020 | Prototype sandbox |

**`client-time/src/`:**

- **`App.tsx`** — React Router v7 setup with `AuthGuard` (from `@repo/auth`); PWA service worker registered via `vite-plugin-pwa`
- **`api.ts`** — fetch wrapper (credentials: include)
- **`pages/HomePage.tsx`** — active timer UI, start/stop task
- **`pages/LogPage.tsx`** — today's completed entries
- **`components/`** — `NavBar`, `TagChip`, `TimePicker`, `EditEntryForm`

### Database Schema

One SQLite file (`SQLITE_PATH`, default `data.db`) with about 50 tables, grouped roughly as:

- **Accounts:** `users` (email + bcrypt hash), `sessions`, `api_tokens`, `invites`
- **Social:** `groups`, `group_members`, `user_connections`, `user_connection_requests`, `user_invite_codes`
- **Time:** `time_entries` — `started_at`/`ended_at` as ISO 8601 UTC strings, `description`, `tags` (comma-separated)
- **Watch:** `movies`, `tv_series`, tags, series, cast/`people`, per-user state, `watch_event*`
- **Trips / Play:** `trips`, `trip_members`, `trip_days`, `packing_items`, `packing_state`, `putt_*`, `score_*`
- **Games:** `game_scores`, `game_rooms`, Dungeon Tactics `game_dt_*` + `game_scenarios`/`game_unit_defs`, Orbital Dodger `game_od_configs`/`game_od_levels`

### Key Conventions

- **Timestamps** are always stored as ISO 8601 UTC; displayed in US/Eastern via `date-fns-tz`
- **"Today"** = 4 AM ET to 4 AM ET next day
- **Tags** accept `#tag` or `:tag` prefixes (including hyphens, e.g. `#yard-work`); duplicates are deduplicated. At write time: `:tag` tokens in the description are rewritten to `#tag`, and the `tags` column stores the bare lowercase words (no prefix) as a comma-separated string
- **Sessions** are rows in the `sessions` table: the cookie holds an opaque token, and only its SHA-256 hash is stored. They survive restarts and last 30 days (cookie max age). Logout deletes only the current session; a password change deletes all of that user's sessions.
- **One running entry** per user at a time; new entry start time must be ≥ previous entry's end time
- **Build output**: server → `out/src/`; each client → its own `client-*/dist/`, served by Caddy in production (Hono's own static fallback serves only `client-time/dist`)
- **Production**: PM2 (`ecosystem.config.cjs`) + Caddy reverse proxy (`Caddyfile`)

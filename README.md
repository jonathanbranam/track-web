# track-web

Multi-app PWA platform for personal and family tools, self-hosted on a single EC2 instance. Apps are served at individual subdomains under `branam.us` and share one backend, one database, and one session — log in once and all apps are accessible.

**Stack:** Hono (Node.js) + React 19 + SQLite + Caddy — single backend process, single SQLite file.

**Repo layout:** `src/` (backend) · `client-*/` (one Vite app per subdomain) · `packages/*` (shared `auth`, `ui`, `config`, `dungeon-engine`) · `openspec/` (specs and change proposals) · `docs/` (per-app planning and docs) · `openapi.yaml` + `llm-context.md` (API spec and agent guide, also served at `/api/openapi.json` and `/api/llm-context.md`).

## Apps

| App | Subdomain | Client | Description |
|-----|-----------|--------|-------------|
| Home | `home.branam.us` | `client-home` | App directory — card grid linking to every app |
| Time | `time.branam.us` | `client-time` | Personal time tracking — start/stop tasks with tags, review daily logs |
| Watch | `watch.branam.us` | `client-watch` | Movie and TV tracking — watchlists, ratings, collaborative watch events |
| Trips | `trips.branam.us` | `client-trips` | Family trip log — current trip with Overview, Days, Info, and Packing tabs |
| Play | `play.branam.us` | `client-play` | In-person game companion — Putt scorecard and a tabletop/card-game score tracker |
| Games | `games.branam.us` | `client-games` | Casual games (Phaser 3 + React) — Ball Merge, Orbital Dodger, Dungeon Tactics |
| Me | `me.branam.us` | `client-me` | Account settings, people (connections), and groups |
| Talks | `talks.branam.us` | `client-talks` | Public talks/presentations site — no login |
| Admin | `admin.branam.us` | `client-admin` | Admin console (user 1 only): deploy, backups/restore, users, API tokens, server logs |
| Proto | `proto.branam.us` | `client-proto` | Prototype / experimental sandbox (admin only in the directory) |

## Development

```bash
npm run dev                    # backend only (tsx watch, port 3000)
npm run dev -w client-time     # one client app's Vite dev server (ports in packages/config/dev-ports.json)
./dev-local.sh                 # inside tmux: every client + Caddy (Caddyfile.local) in split panes

npm run build                  # all clients + server in parallel
npm run build:<app>            # one app: time, watch, proto, trips, play, games, admin, me, home, talks
npm run build:server           # backend only (tsc)
npm start                      # run compiled server (out/src/index.js)

npm test                       # vitest — backend, packages, and the client apps that have tests
npm run test:dungeon-tactics   # Dungeon Tactics Gherkin .feature scenarios (not part of npm test)
```

## Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable         | Description                                                                  |
|------------------|------------------------------------------------------------------------------|
| `SESSION_SECRET` | Required — the server refuses to start without it — but no longer used to sign anything (sessions are opaque tokens checked against the `sessions` table). Any random value works: `openssl rand -hex 32` |
| `DEPLOY_SECRET`  | GitHub webhook secret — generate with `openssl rand -hex 32` (see below)     |
| `TMDB_API_KEY`      | TMDB API Read Access Token (JWT) from [themoviedb.org](https://www.themoviedb.org/settings/api). Optional — the app starts without it, but `GET /api/watch/external/search` and `POST /api/watch/external/import` return 503. |
| `TMDB_PERSON_SORT`  | Sort algorithm for person filmography search results. Default: `decay`. See [the options](docs/watch/admin-cli.md#tmdb_person_sort-options). |
| `PORT`              | Port the Node server listens on (default: 3000)                              |
| `SQLITE_PATH`       | Path to SQLite database file (default: data.db)                              |

## Admin CLI

All database administration is done via `npm run admin -- <subcommand>`. There is no self-signup flow. The global commands are below; app-specific commands are documented with each app:

| App | Commands | Docs |
|-----|----------|------|
| Watch | `movies:*`, `tv:*`, `watch:*`, `events:*` | [docs/watch/admin-cli.md](docs/watch/admin-cli.md) |
| Trips | `trips:*` | [docs/trips/admin-cli.md](docs/trips/admin-cli.md) |
| Games | `scores:*`, `content:*` (Dungeon Tactics) | [docs/games/admin-cli.md](docs/games/admin-cli.md) |
| Me (social) | `connections:*`, `codes:*`, `groups:*` | [docs/me/admin-cli.md](docs/me/admin-cli.md) |

### Users

```bash
npm run admin -- users:list
npm run admin -- users:create <email> <password> [--name "<display name>"]
npm run admin -- users:delete <email>
npm run admin -- users:update-password <email> <password>
npm run admin -- users:logout-all <email>          # delete all of a user's sessions (force logout everywhere)
npm run admin -- users:set-display-name <email> "<display name>"
npm run admin -- users:set-name <userId> "<name>"
```

Creating a user is required on first deploy against a fresh database.

### Invites (account activation)

```bash
npm run admin -- invites:create <email> [--expires-in <days>]  # generate invite link; default 7 days
npm run admin -- invites:list [--json]                          # list all invites with status
npm run admin -- invites:revoke <id>                            # revoke an unused invite
```

### API Tokens

Bearer tokens let external clients (scripts, Claude Code, etc.) authenticate to the API without a browser session. Tokens are user-scoped, expire automatically, and can be revoked at any time. The raw token value is shown only at creation time.

```bash
npm run admin -- tokens:create --user-id <id> --label "<label>" --days <1-180> [--json]
npm run admin -- tokens:list --user-id <id> [--json]
npm run admin -- tokens:revoke --id <tokenId> [--json]
```

Use the token in HTTP requests via the `Authorization: Bearer <token>` header. Token management endpoints (`POST/GET/DELETE /api/auth/tokens`) require a browser session and cannot be accessed with a bearer token.

### Server version

```bash
npm run admin -- version [--url <baseUrl>] [--json]   # GET /api/version; default http://localhost:3000
```

### Maintenance

```bash
npm run prune-sessions           # delete expired rows from the sessions table (safe no-op when none expired)
npm run prune-sessions -- --json # machine-readable: { "deleted": <n> }
```

Sessions are stored server-side in the `sessions` table; expired rows are harmless (they fail the expiry check) but `prune-sessions` keeps the table tidy. Schedule it via cron — see [setup.md](setup.md).

## Database backup

The export script writes all table data to JSON and CSV files alongside a `schema.json` and `summary.json`.

```bash
npm run db:export                  # timestamped snapshot → exports/export-YYYYMMDD-HHMM/
npm run db:export -- --backup      # stable snapshot → backup/ (overwrites in place)
npm run db:export-push             # export --backup, then git commit+push only if data changed
npm run db:import -- --from <dir>  # restore from a timestamped export folder
```

The `--backup` flag omits volatile timestamp fields from `summary.json` so that two consecutive exports of an unchanged database produce no diff — useful for a scheduled git-backed backup where you only want commits when data actually changes.

These same operations (run scheduled/timestamped backup, restore) are available from the **Admin app** (`admin.branam.us`, user 1 only). The CLI scripts and the admin API share one implementation (`src/lib/backup.ts`); the `exports/` layout and `npm run db:export-push` cron interface are unchanged.

### Automated cron backup

On the production server, set up a cron job to call `export-push.sh` on a cadence. Example (daily at 3 AM UTC):

```
0 3 * * * cd /home/ec2-user/track-web && bash scripts/export-push.sh >> /home/ec2-user/track-web/logs/export-push.log 2>&1
```

The script commits the `backup/` folder and pushes only when rows have changed since the last run. The server's git remote must be configured with push credentials (see [setup.md](setup.md)).

## Deployment

The app runs on an EC2 instance (t4g.micro) behind Caddy. Caddy serves each app's static files from its `client-*/dist/` folder and proxies `/api/*` to the Node backend. HTTPS certs are auto-provisioned by Let's Encrypt. A wildcard DNS record (`*.branam.us`) points every subdomain at the instance, so new apps need no DNS changes.

### First-time setup

1. On EC2: install Node 20+, pm2, and Caddy
2. Clone the repo, then:
   ```bash
   npm install
   npm run build
   cp .env.example .env   # fill in SESSION_SECRET
   ```
3. Create the first user (a fresh database creates and migrates itself on first open):
   ```bash
   npm run admin -- users:create you@example.com yourpassword
   ```
4. Start the backend:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```
5. Copy `Caddyfile` to `/etc/caddy/Caddyfile` (update paths if needed), then:
   ```bash
   caddy start
   ```

### GitHub webhook (auto-deploy on push)

The server verifies incoming webhook payloads with HMAC-SHA256 using `DEPLOY_SECRET`. To wire it up:

1. Generate a secret and add it to `.env` on the server:
   ```bash
   openssl rand -hex 32
   # → paste the output as DEPLOY_SECRET=... in .env
   ```
2. In GitHub: repo **Settings → Webhooks → Add webhook**
   - **Payload URL:** `https://time.branam.us/api/deploy`
   - **Content type:** `application/json`
   - **Secret:** paste the same value from step 1
   - **Events:** select *Just the push event*
3. Restart pm2 to pick up the new env var:
   ```bash
   pm2 restart track-web
   ```

On every push to `main`, GitHub will POST to `/api/deploy` and the server will run `server-deploy.sh` automatically. Pushes to other branches (e.g. `dev`) do not deploy. `DEPLOY_SECRET` is optional — if absent, the webhook route returns 503 and the rest of the app is unaffected. A deploy can also be triggered by hand from the Admin app.

### What a deploy does

`server-deploy.sh` runs `git pull --ff-only`, then hands off to `scripts/build-deploy.sh`, which:

1. writes `version.json` (commit SHA and times),
2. runs `npm install`,
3. builds each client, then the server, **one at a time** — the small instance can't handle parallel builds,
4. restarts pm2 (`ecosystem.config.cjs`), saves the pm2 process list, and reloads Caddy.

When the webhook or the Admin app triggers a deploy, its output is appended to `logs/deploy.log`.

### Manual deploy

```bash
EC2_HOST=your.ec2.ip ./deploy.sh
```

Runs `server-deploy.sh` on the host over SSH (same steps as above).

### Rollback

```bash
pm2 stop track-web
# revert git commit on server
pm2 start ecosystem.config.cjs
```

# track-web

Multi-app PWA platform for personal and family tools, self-hosted on a single EC2 instance. Apps are served at individual subdomains under `branam.us` and share one backend, one database, and one session — log in once and all apps are accessible.

**Stack:** Hono (Node.js) + React 19 + SQLite + Caddy — single backend process, single SQLite file.

## Apps

| App | Subdomain | Description |
|-----|-----------|-------------|
| Track | `time.branam.us` | Personal time tracking PWA |
| Watch | `watch.branam.us` | Movie/TV watchlist coordinator |
| Admin | `admin.branam.us` | Admin console (user 1 only): deploy, backups/restore, users, API tokens, server logs |

## Development

```bash
npm run dev                    # backend (tsx watch) + tracker frontend (Vite)
npm run build                  # all clients + server in parallel
npm run build:time             # client-time only
npm run build:watch            # client-watch only
npm run build:server           # backend only
npm start                      # run compiled server (out/src/index.js)
```

## Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable         | Description                                                                  |
|------------------|------------------------------------------------------------------------------|
| `SESSION_SECRET` | Random secret — generate with `openssl rand -hex 32`                         |
| `DEPLOY_SECRET`  | GitHub webhook secret — generate with `openssl rand -hex 32` (see below)     |
| `TMDB_API_KEY`      | TMDB API Read Access Token (JWT) from [themoviedb.org](https://www.themoviedb.org/settings/api). Optional — the app starts without it, but `GET /api/watch/external/search` and `POST /api/watch/external/import` return 503. |
| `TMDB_PERSON_SORT`  | Sort algorithm for person filmography search results. Default: `decay`. Changes take effect immediately — no restart or cache clear required. See options below. |
| `PORT`              | Port the Node server listens on (default: 3000)                              |
| `SQLITE_PATH`       | Path to SQLite database file (default: data.db)                              |

### `TMDB_PERSON_SORT` options

| Value | Description |
|-------|-------------|
| `decay` *(default)* | Harmonic mean of normalised `vote_average` × `popularity`, multiplied by a billing decay factor `1 / (1 + 0.05 × billing)`. Highly-rated popular titles rank first; high billing numbers apply a soft penalty. |
| `harmonic` | Two-way harmonic mean of normalised `vote_average` and `popularity`. No billing adjustment. |
| `three-way` | Three-way harmonic mean of normalised `vote_average`, `popularity`, and `1 / (1 + billing)`. Billing is weighted equally with the other signals. |
| `geometric` | Weighted geometric mean: `vote^0.5 × pop^0.3 × billing_factor^0.2`. Most tunable — each signal has an independent exponent. |
| `billing` | Ascending by effective billing order (directors = 0, cast by TMDB cast order). Original behaviour. |

## Admin CLI

All database administration is done via `npm run admin -- <subcommand>`. There is no self-signup flow.

### Users

```bash
npm run admin -- users:list
npm run admin -- users:create <email> <password> [--name "<display name>"]
npm run admin -- users:delete <email>
npm run admin -- users:update-password <email> <password>
npm run admin -- users:rotate-nonce <email>
npm run admin -- users:set-name <userId> "<name>"
```

### Connections

```bash
npm run admin -- connections:create <userIdA> <userIdB>
npm run admin -- connections:delete <userIdA> <userIdB>
npm run admin -- connections:list <userId>
```

### Invite codes

```bash
npm run admin -- codes:create <userId>   # creates a 7-day invite code
```

### Groups

```bash
npm run admin -- groups:create --name "<name>" [--description "<desc>"] [--members 1,2,3] [--creator <userId>]
npm run admin -- groups:list
npm run admin -- groups:list-members <groupId>
npm run admin -- groups:add-member <groupId> <userId>
npm run admin -- groups:remove-member <groupId> <userId>
npm run admin -- groups:delete <groupId>
```

### Watch catalog

```bash
npm run admin -- movies:create --title "<title>" [--runtime <minutes>] [--streaming "<platform>"] [--tags tag1,tag2] [--creator <userId>]
npm run admin -- movies:list
npm run admin -- movies:delete-all

npm run admin -- tv:create --title "<title>" [--episode-runtime <minutes>] [--seasons <count>] [--streaming "<platform>"] [--tags tag1,tag2] [--creator <userId>]
npm run admin -- tv:list
npm run admin -- tv:delete-all
```

Tags must match existing genre names (e.g. `Drama,Sci-Fi,Thriller`). `--creator` defaults to user id `1`.

`movies:delete-all` and `tv:delete-all` cascade — removes tags, cast, user states, series memberships, and any watch event candidates (with their votes and selections) referencing the deleted titles.

### TMDB external search and cast

```bash
npm run admin -- watch:external:search --q "<query>" --type movie|tv [--person] [--json]
npm run admin -- watch:cast --id <titleId> --type movie|tv [--json]
```

`watch:external:search` queries TMDB (requires `TMDB_API_KEY`). `--person` switches to filmography mode. Default output is a table; `--json` prints raw JSON.

`watch:cast` shows the stored director and cast (up to 30 members) for a local catalog title. Cast is populated automatically when a title is imported via `POST /api/watch/external/import`. `--json` outputs an array of `{ name, role, billingOrder, tmdbPersonId }`.

### Watch events

```bash
npm run admin -- events:list
npm run admin -- events:create --title "<title>" --date <YYYY-MM-DD> [--creator <userId>] [--invites 1,2,3]
npm run admin -- events:delete <eventId>

npm run admin -- events:show <eventId>        # event header + creator + invite/candidate counts
npm run admin -- events:attendees <eventId>   # attendee list with attendance status (yes/no/maybe)
npm run admin -- events:candidates <eventId>  # candidate list with vote count and average rating
```

`events:delete` cascades — removes votes, candidates, invites, and the event itself.

### Ratings

```bash
npm run admin -- watch:ratings [--userId <id>] [--json]
```

`watch:ratings` lists all personal ratings (movies and TV) for a user, sorted by rating descending.

### Trips

```bash
npm run admin -- trips:list [--user-id <id>] [--json]
npm run admin -- trips:create "<name>" --user-id <id> [--destination "<dest>"] [--departure-notes "<notes>"] [--return-notes "<notes>"] [--nights <n>] [--full-days <n>] [--json]
npm run admin -- trips:set-current <tripId>
npm run admin -- trips:update <tripId> [--name "<name>"] [--destination "<dest>"] [--departure-notes "<notes>"] [--return-notes "<notes>"] [--nights <n>] [--full-days <n>] [--json]
npm run admin -- trips:delete <tripId>

# Membership management
npm run admin -- trips:members:list <tripId> [--json]
npm run admin -- trips:members:add <tripId> <userId>
npm run admin -- trips:members:remove <tripId> <userId>

# Packing list management
npm run admin -- trips:packing:list <tripId> [--json]
npm run admin -- trips:packing:add <tripId> --text "<text>" [--section "<section>"] [--position <n>] [--json]
npm run admin -- trips:packing:bulk <tripId> --file <path> [--json]
npm run admin -- trips:packing:delete <itemId>

# Packing state (per-user checked state)
npm run admin -- trips:packing:state:get <tripId> <userId> [--json]
npm run admin -- trips:packing:state:set <tripId> <userId> <itemId> <true|false>
npm run admin -- trips:packing:summary <tripId> [--json]
```

`trips:set-current` marks the given trip as the current trip (clears any other current trip for that user). The trips app always fetches the current trip on load.

`trips:members:list` shows all members and their roles. Use `trips:members:add` to grant a user access to a trip; `trips:members:remove` to revoke it. The trip creator is automatically added as `owner` and cannot be removed via the CLI (use `trips:delete` to clean up instead).

`trips:packing:bulk` replaces the entire packing list atomically from a JSON file. The file must contain a JSON array of `{ section, text, position }` objects. All previous items are deleted and new IDs are assigned.

`trips:packing:state:get` prints the item IDs the specified user has checked on that trip. `trips:packing:state:set` directly upserts a checked state row (useful for scripting or resetting state). `trips:packing:summary` shows per-member checked/total completion counts for the trip.

### API Tokens

Bearer tokens let external clients (scripts, Claude Code, etc.) authenticate to the API without a browser session. Tokens are user-scoped, expire automatically, and can be revoked at any time. The raw token value is shown only at creation time.

```bash
npm run admin -- tokens:create --user-id <id> --label "<label>" --days <1-180> [--json]
npm run admin -- tokens:list --user-id <id> [--json]
npm run admin -- tokens:revoke --id <tokenId> [--json]
```

Use the token in HTTP requests via the `Authorization: Bearer <token>` header. Token management endpoints (`POST/GET/DELETE /api/auth/tokens`) require a browser session and cannot be accessed with a bearer token.

### Game scores

```bash
npm run admin -- scores:list [--game <slug>] [--mode <mode>] [--level <level>] [--json]
npm run admin -- scores:clear --game <slug> --mode <mode> --level <level> --confirm
```

Creating a user is required on first deploy against a fresh database.

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

The script commits the `backup/` folder and pushes only when rows have changed since the last run. The server's git remote must be configured with push credentials (see [docs/setup.md](docs/setup.md)).

## Deployment

The app runs on an EC2 instance behind Caddy. Caddy serves each app's static files from its `dist/` folder and proxies `/api/*` to the Node backend. HTTPS certs are auto-provisioned by Let's Encrypt.

### First-time setup

1. Point `time.branam.us` and `watch.branam.us` DNS A records at the EC2 IP
2. On EC2: install Node 20+, pm2, and Caddy
3. Clone the repo, then:
   ```bash
   npm install
   npm run build
   cp .env.example .env   # fill in SESSION_SECRET
   ```
4. Create the first user:
   ```bash
   npm run admin -- users:create you@example.com yourpassword
   ```
5. Start the backend:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```
6. Copy `Caddyfile` to `/etc/caddy/Caddyfile` (update paths if needed), then:
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

On every push to `main`, GitHub will POST to `/api/deploy` and the server will run `server-deploy.sh` automatically. `DEPLOY_SECRET` is optional — if absent, the webhook route returns 503 and the rest of the app is unaffected.

### Subsequent deploys

```bash
EC2_HOST=your.ec2.ip ./deploy.sh
```

Pulls latest, runs `npm install && npm run build`, and restarts the pm2 process.

### Rollback

```bash
pm2 stop track-web
# revert git commit on server
pm2 start ecosystem.config.cjs
```

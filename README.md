# track-web

Multi-app PWA platform for personal and family tools, self-hosted on a single EC2 instance. Apps are served at individual subdomains under `branam.us` and share one backend, one database, and one session — log in once and all apps are accessible.

**Stack:** Hono (Node.js) + React 19 + SQLite + Caddy — single backend process, single SQLite file.

## Apps

| App | Subdomain | Description |
|-----|-----------|-------------|
| Track | `time.branam.us` | Personal time tracking PWA |
| Watch | `watch.branam.us` | Movie/TV watchlist coordinator |

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

| Variable         | Description                                            |
|------------------|--------------------------------------------------------|
| `SESSION_SECRET` | Random secret — generate with `openssl rand -hex 32`  |
| `PORT`           | Port the Node server listens on (default: 3000)        |
| `SQLITE_PATH`    | Path to SQLite database file (default: data.db)        |

## Admin CLI

All database administration is done via `npm run admin -- <subcommand>`. There is no self-signup flow.

### Users

```bash
npm run admin -- users:list
npm run admin -- users:create <email> <password> [--name "<display name>"]
npm run admin -- users:update-password <email> <password>
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
npm run admin -- groups:create --name "<name>" [--description "<desc>"] [--members 1,2,3]
npm run admin -- groups:list
npm run admin -- groups:add-member <groupId> <userId>
npm run admin -- groups:remove-member <groupId> <userId>
npm run admin -- groups:delete <groupId>
```

Creating a user is required on first deploy against a fresh database.

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

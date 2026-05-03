# track-web

Multi-app PWA platform for personal and family tools, self-hosted on a single EC2 instance. Apps are served at individual subdomains under `branam.us` and share one backend, one database, and one session — log in once and all apps are accessible.

**Stack:** Hono (Node.js) + React 19 + SQLite + Caddy — single backend process, single SQLite file.

## Apps

| App | Subdomain | Description |
|-----|-----------|-------------|
| Track | `time.branam.us` | Personal time tracking PWA |
| Movies | `movies.branam.us` | Movie coordinator (in progress) |

## Development

```bash
npm run dev                    # backend (tsx watch) + tracker frontend (Vite)
npm run build                  # all clients + server in parallel
npm run build:tracker          # client-tracker only
npm run build:movies           # client-movies only
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

## User Management

User accounts are created via CLI — there is no self-signup flow:

```bash
npm run create-user -- <email> <password>
```

## Deployment

The app runs on an EC2 instance behind Caddy. Caddy serves each app's static files from its `dist/` folder and proxies `/api/*` to the Node backend. HTTPS certs are auto-provisioned by Let's Encrypt.

### First-time setup

1. Point `time.branam.us` and `movies.branam.us` DNS A records at the EC2 IP
2. On EC2: install Node 20+, pm2, and Caddy
3. Clone the repo, then:
   ```bash
   npm install
   npm run build
   cp .env.example .env   # fill in SESSION_SECRET
   ```
4. Create the first user:
   ```bash
   npm run create-user -- you@example.com yourpassword
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

# Track

Personal time tracking PWA. Replaces a previous React Native app with a browser-based experience that installs to the iOS home screen. The core design constraint is low friction — switching tasks should take seconds.

**Continuous timeline model:** every moment is accounted for. No gaps are allowed between entries.

**Stack:** Hono (Node.js) + React 19 + SQLite + Caddy — single process, single file for data.

## Development

```bash
npm run dev        # start backend (tsx watch) + frontend (Vite) concurrently
npm run build      # build both client and server
npm start          # run compiled server (out/index.js)
```

## Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable        | Description                                      |
|-----------------|--------------------------------------------------|
| `EMAIL`         | Login email                                      |
| `PASSWORD_HASH` | Bcrypt hash — generate with `npm run hash-password` |
| `SESSION_SECRET` | Random secret — generate with `openssl rand -hex 32` |
| `PORT`          | Port the Node server listens on (default: 3000)  |
| `SQLITE_PATH`   | Path to SQLite database file (default: data.db)  |

## Deployment

The app runs on an EC2 instance behind Caddy, which handles HTTPS via Let's Encrypt on a DuckDNS subdomain.

### First-time setup

1. Point a DuckDNS subdomain A record at the EC2 IP
2. On EC2: install Node 20+, pm2, and Caddy
3. Clone the repo, then:
   ```bash
   npm install
   npm run build
   cp .env.example .env   # fill in values
   ```
4. Start the app:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save               # persist across reboots
   pm2 startup            # enable pm2 on system reboot
   ```
5. Start Caddy — the TLS cert auto-provisions on first request:
   ```bash
   caddy start
   ```

### Subsequent deploys

```bash
./deploy.sh
```

The script SSHs to EC2, pulls latest code, runs `npm install && npm run build`, and restarts the pm2 process. Requires `EC2_HOST` to be set.

### Rollback

```bash
pm2 stop app
# revert git commit on server
pm2 start ecosystem.config.cjs
```

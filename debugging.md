# Debugging Deployments & the App

Practical reference for diagnosing production and local issues: where the logs
live, how to read them, and the common failure modes for the backend, Caddy,
Let's Encrypt certs, and the deploy pipeline.

The production server is an EC2 instance. Unless noted, commands run on the
server as `ec2-user`, and the app lives in `/home/ec2-user/track-web`
(`$APP_DIR`).

---

## Log files at a glance

| What | Location | How it's written |
|------|----------|------------------|
| Backend stdout | `$APP_DIR/logs/out.log` | pm2 (`ecosystem.config.cjs`) |
| Backend errors | `$APP_DIR/logs/error.log` | pm2 |
| Deploy runs | `$APP_DIR/logs/deploy.log` | `scripts/build-deploy.sh` + `lib/deploy.ts` |
| DB backup cron | `$APP_DIR/logs/export-push.log` | `scripts/export-push.sh` cron job |
| Session prune cron | `$APP_DIR/logs/prune-sessions.log` | `prune-sessions` cron job |
| Caddy (proxy, TLS, ACME) | systemd journal | `journalctl -u caddy` |

The `logs/` directory is gitignored (`.gitignore` → `/logs/`), so these files
exist only on the machine that produced them.

The first four logs (`out.log`, `error.log`, `deploy.log`, `export-push.log`)
are also readable from the **Admin app** (`admin.branam.us`, user 1 only) — it
tails them over `GET /api/admin/logs/:name` (`src/routes/admin/logs.ts`). Handy
when you don't have SSH open.

---

## Backend (Node / Hono, managed by pm2)

The backend runs as a single pm2 process named **`track-web`**
(`ecosystem.config.cjs`), executing `./out/src/index.js`.

```bash
pm2 status                      # is track-web online? how many restarts?
pm2 logs track-web              # live tail of out.log + error.log
pm2 logs track-web --lines 200  # last 200 lines
pm2 logs track-web --err        # errors only
pm2 restart track-web           # restart (picks up new code after a build)
pm2 restart track-web --update-env   # also re-read .env
pm2 describe track-web          # full config: script path, env file, log paths
```

Or read the files directly:

```bash
tail -f $APP_DIR/logs/out.log
tail -n 200 $APP_DIR/logs/error.log
```

**Deploy-related log lines** are prefixed `[deploy]` (webhook verification,
manual triggers, spawn errors) — grep for them:

```bash
grep '\[deploy\]' $APP_DIR/logs/out.log
```

### Common backend failures

- **Process keeps restarting / `errored` in `pm2 status`.** Check
  `logs/error.log`. Usual causes: bad/missing `.env` (env validation in
  `src/env.ts` throws on startup), a `better-sqlite3` native-module mismatch
  after a Node upgrade (rebuild: `npm rebuild better-sqlite3` or
  `npm ci`), or the SQLite file path (`SQLITE_PATH`) not being writable.
- **Port already in use (`EADDRINUSE`).** A stale process is holding `PORT`
  (default 3000). `pm2 delete track-web` then start fresh, or find it with
  `lsof -i :3000`.
- **Sessions all logged out after a restart.** Expected — sessions are stored
  server-side but the store is rebuilt; a restart invalidates in-memory state.
  Not a bug.
- **Env change not taking effect.** pm2 caches env. Use
  `pm2 restart track-web --update-env` (plain `restart` does **not** re-read
  `.env`).

---

## Caddy (reverse proxy + TLS)

Caddy runs as a **systemd service** (set up in `setup.md` §3), serving each
app's static `dist/` folder and proxying `/api/*` to `localhost:3000`
(`Caddyfile`). All its output — access errors, config reloads, and ACME / TLS
certificate activity — goes to the **systemd journal**, not to a file.

```bash
sudo systemctl status caddy         # running? enabled? last log lines
sudo journalctl -u caddy            # full history
sudo journalctl -u caddy -f         # live tail
sudo journalctl -u caddy --since "1 hour ago"
sudo journalctl -u caddy -n 200     # last 200 lines
```

### Config changes

The systemd service points at the repo's `Caddyfile` directly. After editing it:

```bash
caddy fmt --overwrite Caddyfile     # normalize (tabs, not spaces — see file header)
caddy validate --config Caddyfile --adapter caddyfile   # check before applying
sudo systemctl reload caddy         # or: caddy reload --config Caddyfile --adapter caddyfile
```

`scripts/build-deploy.sh` reloads Caddy automatically at the end of every deploy,
so a pushed `Caddyfile` change is applied without manual intervention.

### Common Caddy failures

- **405 Method Not Allowed on `/api/*`.** The `handle /api/*` block is missing
  or ordered wrong for that subdomain — `file_server` is intercepting the
  request. Every API-backed subdomain needs an explicit `handle /api/*` block
  (see the header comment in `Caddyfile`).
- **404 / blank page on an app.** The `root` path for that subdomain points at a
  `dist/` folder that wasn't built. Confirm the build step exists in
  `scripts/build-deploy.sh` and the folder exists on disk.
- **New subdomain not routing.** Check the CLAUDE.md "keep in sync" list —
  `Caddyfile`, `Caddyfile.local`, `build-deploy.sh`, etc. all need the new app.

---

## Let's Encrypt / TLS certificates

Caddy auto-obtains and renews certificates from Let's Encrypt on the first
request to each hostname (`branam.us` has a wildcard DNS record, so no DNS
change is needed to add a subdomain — Caddy handles issuance on first hit).
All cert activity is logged to the Caddy journal.

**Check cert provisioning / renewal activity:**

```bash
# All Caddy logs
sudo journalctl -u caddy

# Follow live (e.g. while forcing a re-provision by hitting a new subdomain)
sudo journalctl -u caddy -f

# Filter to ACME / certificate activity
sudo journalctl -u caddy | grep -iE "acme|certificate|obtain|renew|tls"
```

**Inspect the served certificate directly:**

```bash
# From anywhere — shows issuer, validity dates, SANs
echo | openssl s_client -servername time.branam.us -connect time.branam.us:443 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates

# On the server — Caddy stores certs under its data dir
sudo ls -R /var/lib/caddy/.local/share/caddy/certificates/ 2>/dev/null
# (path can also be ~/.local/share/caddy/certificates when Caddy runs as a user)
```

### Common cert failures

- **Cert not issued / stuck on the ACME challenge.** Ports **80 and 443** must
  be open in the EC2 security group and reachable from the internet — Let's
  Encrypt validates over HTTP-01/TLS-ALPN. Confirm with
  `sudo journalctl -u caddy | grep -i acme`; look for challenge failures.
- **Rate limited.** Let's Encrypt caps issuance per domain per week. Repeatedly
  restarting/reconfiguring can trip it — the journal will say so. Wait it out or
  use the staging CA while debugging.
- **Wrong / self-signed cert in the browser.** Usually the request reached a
  different server, or Caddy fell back to its internal CA because ACME failed.
  Check the journal and the `openssl s_client` issuer line above.

---

## Deploys

Two ways a deploy happens, both ending in `scripts/build-deploy.sh`:

1. **GitHub webhook** — push to `main` → GitHub POSTs to
   `https://time.branam.us/api/deploy` → HMAC-SHA256 verified with
   `DEPLOY_SECRET` (`src/routes/deploy.ts`) → `runDeploy()` spawns a detached
   `server-deploy.sh`.
2. **Admin app** — user 1 clicks Deploy → `POST /api/admin/deploy`
   (`src/routes/admin/deploy.ts`) → same `runDeploy()`.
3. **Manual from laptop** — `EC2_HOST=... ./deploy.sh` SSHes in and runs
   `server-deploy.sh` over the connection.

`server-deploy.sh` does `git pull --ff-only` then execs
`scripts/build-deploy.sh`, which: writes `version.json`, `npm install`, builds
every client + the server, `pm2 restart`, `pm2 save`, and `caddy reload`. Every
step is timestamped and logged.

**Watch a deploy:**

```bash
tail -f $APP_DIR/logs/deploy.log
```

Each step is bracketed with `RUNNING:` / `COMPLETED:` lines; a failure logs
`ERROR: deploy failed (exit N) at line L`. Grep the tail for the last outcome:

```bash
grep -E 'ERROR|=== (Build started|Deploy complete)' $APP_DIR/logs/deploy.log | tail
```

**Confirm what's actually deployed** — the build writes `version.json` at the
repo root with the short SHA, commit time, and build time:

```bash
cat $APP_DIR/version.json
# {"sha":"9ed2467","commitTime":"...","buildTime":"..."}
```

Compare that `sha` against `git -C $APP_DIR rev-parse --short HEAD` to verify the
running build matches the checked-out commit.

### Common deploy failures

- **Webhook does nothing.** Look for `[deploy]` lines in `logs/out.log`. `Not
  configured` (503) means `DEPLOY_SECRET` is unset in `.env`; signature
  mismatch (403) means the GitHub webhook secret and `.env` value differ. Also
  note only pushes to `refs/heads/main` trigger a build — other branches log
  `OK` and stop.
- **`git pull --ff-only` fails.** The server's working tree has diverged or has
  local changes. `git -C $APP_DIR status`, then reset/stash. Nothing after the
  pull runs until this is clean.
- **Build fails partway.** `deploy.log` shows which `RUNNING:` step had no
  matching `COMPLETED:`. A native-module failure (`better-sqlite3`) during
  `npm install` is the usual culprit after a Node version change — see the
  memory note: run `npm install` on the server when new workspace packages are
  added.
- **Deploy "succeeded" but the site is unchanged.** Check `version.json` sha vs
  HEAD (above), and confirm `pm2 restart` actually ran (tail `deploy.log`). A
  stale browser/service-worker cache can also mask a good deploy — hard-reload.
- **`pm2: command not found` / `caddy: command not found` during a webhook
  deploy.** The detached process's `PATH` doesn't include the nvm/`/usr/local`
  bins. This is the same PATH gotcha documented for cron in `setup.md` §9b.

---

## Local development

`npm run dev` runs the backend (`tsx watch`) + the time frontend (Vite)
concurrently; other clients have their own `build:*`/dev scripts. For on-device
testing over the LAN and the local Caddy setup, see `local-testing.md`.

- Backend logs stream to the terminal running `npm run dev` — there is no
  `logs/` file locally unless you start it under pm2.
- **Not a secure context over LAN HTTP** (`http://<ip>:<port>`): iOS
  `DeviceMotionEvent.requestPermission`, Web Crypto, and other secure-context
  APIs silently fail. Test those against the production HTTPS URL instead. See
  the "Local Testing" section in `CLAUDE.md`.
- Local Caddy (`Caddyfile.local`) is a separate config from production — a
  routing bug may exist in one and not the other. Keep both in sync.

---

## Quick triage checklist

1. **Site down entirely?** `sudo systemctl status caddy` and `pm2 status` — is
   each process up?
2. **Loads but API errors?** `pm2 logs track-web --err` — backend crash or 500s.
3. **TLS / cert warning?** `sudo journalctl -u caddy | grep -i acme` and the
   `openssl s_client` check.
4. **Just deployed and something broke?** `tail $APP_DIR/logs/deploy.log` and
   compare `version.json` sha to HEAD.
5. **One app 404/405 but others fine?** Its `Caddyfile` block (`handle /api/*`,
   `root`, or a missing build step).

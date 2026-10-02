# Running a second, throwaway instance

The developer keeps a server and client running at all times, and those must not
be killed or restarted. An agent that needs to drive the UI in a browser
therefore has two problems: it has no account on the running instance, and
creating one would write to the developer's dev database.

The fix is a second instance beside the first — its own port, its own SQLite
file, its own user. It is disposable: delete the directory and it is gone.

## Recipe

All commands run from the repo root. `.agent-instance/` is gitignored.

```bash
# 1. Create the database and a login. A fresh SQLITE_PATH self-migrates on
#    first open (getDb() calls migrate()), so there is no separate seed step.
SQLITE_PATH=.agent-instance/agent.db \
  npx tsx scripts/admin.ts users:create agent@example.com 'TEMP' --name 'Agent Verify'

# 2. Server on 3100
PORT=3100 \
SQLITE_PATH=.agent-instance/agent.db \
  npx tsx src/index.ts > .agent-instance/server.log 2>&1 &

# 3. Client on 6135, proxying to that server rather than the default 3000
VITE_DEV_PORT=6135 VITE_API_TARGET=http://localhost:3100 \
  npx vite --config client-games/vite.config.ts client-games \
  > .agent-instance/client.log 2>&1 &
```

Then browse `http://localhost:6135` and sign in as `agent@example.com` / `TEMP`.

Tear down by killing those two processes and deleting `.agent-instance/`. Both
processes belong to the agent, so — unlike the developer's instance — they are
safe to stop.

## What makes this work

- **`client-games/vite.config.ts` reads `VITE_DEV_PORT` and `VITE_API_TARGET`**,
  defaulting to `dev-ports.json` and `http://localhost:3000`. Without the second
  variable a client on any port still proxies `/api` to the developer's server,
  which is the whole thing this avoids. Every other client's `vite.config.ts` has the same two lines
  (`client-proto` has no proxy, so only the port).
- **A fresh `SQLITE_PATH` needs no seeding.** `src/db.ts`'s `getDb()` runs
  `migrate()` on first open.
- **`scripts/seed-test-data.sh` is not needed** for a login. It exists to
  populate groups, connections, and sample content — useful if a feature under
  test needs them, unnecessary if it does not.

## The preview instance

A long-lived variant of the same recipe, for trying merged work from another
machine (Tailscale host dalek, 100.100.189.100). Ports are dev port + 100,
recorded in `packages/config/preview-ports.json`: server 3100; clients 6110 time,
6115 watch, 6120 proto, 6125 trips, 6130 play, 6135 games, 6140 admin, 6145 me,
6150 home, 6155 talks. Clients listen with `--host`.

```bash
scripts/preview.sh start|stop|restart|status [app]   # app: server or a client name
```

State lives in `.agent-instance/preview/`: `preview.db`, a login
`preview@example.com` / `preview` (created on first start), and `<app>.pid` /
`<app>.log` per process. `stop` kills only the pid in the app's pidfile, and
only if that pid's command line is the preview process; it never looks up or
kills whatever holds a port. Only the manager runs it (rule `dev-servers`).

## Two things that are easy to get wrong

- **`EMAIL` and `PASSWORD_HASH` in `.env` are vestigial.** `src/env.ts` does not
  read them. Authentication goes through the `users` table, so
  `users:create` is the whole story and there is no hash to place in an env file.
- **`scripts/hash-password.ts` is optional.** `users:create` takes a plaintext
  password and hashes it. Pass `--hashed` only when you already hold a bcrypt
  hash.

## Ports — never take the developer's

`3100` and `6135` sit clear of `dev-ports.json` (6010-6055) and the default
server port **deliberately**. Never start an agent process on 3000, 6035, or any
registered dev port: the developer must always be able to start their own server
if it is not already running, and a process squatting a standard port silently
blocks them.

They are a convention for this workflow, not a registered allocation — if a
second agent instance is needed at the same time, pick another pair rather than
adding these to the registry.

**Stop what you start.** On 2026-08-21 six agent-started processes were found
holding 3000, 4300, 5177, and 6035 across two days; the developer had assumed
they were their own and left them alone.

**Telling the two apart:** an agent-started server has its log open inside the
Claude scratchpad directory (`/private/tmp/claude-501/.../scratchpad/`, or
`.agent-instance/` for this recipe); a developer-started one does not.
`lsof -nP -p <pid>` shows the open files, and that is a more reliable signal than
the port or the command line.

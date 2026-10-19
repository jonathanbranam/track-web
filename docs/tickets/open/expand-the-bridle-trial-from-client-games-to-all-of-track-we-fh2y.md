---
id: tw-fh2y
title: Expand the bridle trial from client-games to all of track-web
kind: epic
created: 2026-10-19
created_by: external:aide
repos: [track-web]
changes: []
specs: []
blocked_by: []
related: [tw-t4wa]
---

## The ask

The human, 2026-10-19 ~08:20 AM ET, via aide: "Long term: the trial should expand to all of track web. Idk what all that entails but that should begin now."

Work out and carry out what it takes to move bridle's scope on track-web from client-games/ (minus Dungeon Tactics) to the whole repo. Start by listing what it entails for the human, e.g. .bridle/rules/scope.md (what stays off-limits: deploy files, .env, data.db, exports/, the dungeon-engine pairing with pi/harness?), [commands] check (today vitest client-games + build:games only; the whole repo's npm test + npm run build is heavy), preview instances and ports for every client, the CLAUDE.md keep-in-sync list, worktree setup, and whether to widen in steps (e.g. client-home, then other clients, then the server). Bring any choice with a real tradeoff to the human; the go-ahead to begin is given above.

## Stage-1 plan (trial-plan, 2026-10-19)

Docs only; nothing below is applied yet. The human's staging (thread): widen in
stages; stage 1 = client-home, client-play, client-time plus other small/easy
clients; client-admin later; `src/`, `packages/`, deploy files and
dungeon-engine stay out.

### Which clients (size from `src/` line counts, tests, risk)

| Client | LOC | Tests | `@repo/*` used | Call |
|---|---|---|---|---|
| client-home | 130 | none | auth, config | stage 1 |
| client-play | 1552 | 1 file | auth, ui | stage 1 |
| client-time | 1196 | none | auth, ui | stage 1 |
| client-trips | 1223 | 1 file | auth, ui | stage 1 (no side effects beyond own data) |
| client-proto | 2368 | none | ui | stage 1 (sandbox, no auth, no real data) |
| client-me | 464 | none | auth, ui | stage 2: small, but password change, invites and connections are account-affecting |
| client-watch | 3230 | 1 file | auth, ui | stage 2: biggest of the ordinary apps, TMDB import |
| client-talks | 6098 | 8 files | ui | stage 2: Phaser (CDN external, see CLAUDE.md), public site |
| client-admin | 870 | none | auth, ui | later (human agreed): drives deploy, backups, users, tokens |

Proposed stage 1: **home, play, time, trips, proto**. Trips and proto are the
"other small/easy" picks; swap them if the human prefers.

### 1. Check commands

`commands.check` is one string, today `npx vitest run client-games && npm run
build:games`. Per client (`build:<app>` is `tsc -b && vite build`, so the build
is also the typecheck):

| Client | Test | Build |
|---|---|---|
| home | none | `npm run build:home` |
| play | `npx vitest run client-play` | `npm run build:play` |
| time | none | `npm run build:time` |
| trips | `npx vitest run client-trips` | `npm run build:trips` |
| proto | none | `npm run build:proto` |
| games (today) | `npx vitest run client-games` | `npm run build:games` |

Two problems with one fixed string: (a) running every client's build on each
task is slow on the laptop; (b) `vitest run client-home` with no matching test
files exits 1 ("No test files found"), so a naive `&&` chain fails.

Proposal: add `scripts/bridle-check.sh` and set `check = "scripts/bridle-check.sh"`.
It lists the `client-*` dirs changed by `git diff --name-only dev...HEAD`
(plus uncommitted), maps each to its vitest filter (only if it has
`*.test.*` files) and `build:<app>`, and runs just those; with no client
changed (docs, specs) it runs the games check as today. The existing games
check stays a subset. Exit status is all a worker reads, as now. Rejected:
`npm test && npm run build` (all of `src/`, server tests and 11 builds; heavy,
and fails on out-of-scope breakage); one check string per stage (every task
would pay for every client).

Vitest include list (`vitest.config.mts`) names watch, games, trips, play,
talks, config, dungeon-engine and `src/`, **not** time, home, proto, me, admin.
None of those has tests, so nothing breaks today. A first test in one of them
needs its glob added to that shared file. Prevent the collision: task A adds
the `client-time`, `client-home`, `client-proto`, `client-me`, `client-admin`
globs once, up front.

### 2. Rule and config changes to admit stage 1

Nothing here is applied; the manager/orchestrator applies it on the human's go.

**`.bridle/rules/scope.md`**, proposed full text:

```
This trial covers the clients listed below, minus Dungeon Tactics. Change
files under those clients' directories and nowhere else, except the specs for
them (`openspec/specs/`, `**App**:` tag of an in-scope app), the docs for them
(`docs/<app>/`), and a test or fixture the change needs.

In scope (stage 1, 2026-10-19): `client-games/` (minus Dungeon Tactics),
`client-home/`, `client-play/`, `client-time/`, `client-trips/`,
`client-proto/`.

Don't touch, even for a small fix:
- `client-games/src/games/dungeon-tactics-solo/**` and `packages/dungeon-engine/**`
  (harness consumes the engine; changes there need paired work that bridle
  can't do yet);
- the other clients (`client-admin`, `client-me`, `client-watch`,
  `client-talks`), `src/` (the server), `packages/`, `scripts/pixellab/`;
- deploy files (`deploy.sh`, `server-deploy.sh`, `ecosystem.config.cjs`,
  `Caddyfile*`), `.env`, `.mcp.json`, `data.db`, `exports/`;
- the shared sync-list files (root `package.json`, `package-lock.json`,
  `vitest.config.mts`, `openapi.yaml`, `CLAUDE.md`, `dev-local.sh`,
  `scripts/build-deploy.sh`), except as "Shared files" says.

Shared files: a task may edit `README.md`, `llm-context.md` and
`client-home/src/pages/DirectoryPage.tsx` only for a line about an in-scope
app. Anything else on the sync list needs the manager's go first.

If a task seems to need any of these, stop and say so to the manager, who
asks the orchestrator.

Why: the human is vetting bridle one client at a time (2026-09-29), and on
2026-10-19 chose to widen in stages (ticket tw-fh2y).

Exception, preview upkeep (tw-da8e): [unchanged]
```

The one-time edits of task A (`scripts/bridle-check.sh`, `vitest.config.mts`)
are allowed by naming them in task A's brief, not by the rule.

`packages/` stays out, but every stage-1 client imports `@repo/auth` and/or
`@repo/ui`: a task that needs a change there stops and asks (risk 2).

**`.bridle/rules/specs.md`**: change "Keep the `**App**: games` tag on each
spec" to "Keep the `**App**:` tag on each spec; a task edits specs whose tag
is an in-scope app (`games`, `home`, `play`, `time`, `trips`, `proto`)".
Existing tags use `home`, `play`, `client-trips`, `client-proto`, `games`;
`time` has no spec yet.

**`.bridle/config.toml`**: (i) `commands.check = "scripts/bridle-check.sh"`,
and fix the "client-games only" header comments; (ii) `[budget] max_workers`
is 1: stage-1 tasks mostly touch different dirs, so 2 would work; leave at 1
until the human says (risk 4); (iii) roles' allowed paths need no change: they
are tool-based, not path-based (no per-path write key), so `scope.md` is the
only path boundary; (iv) `web-reviewer` already targets clients 6110-6155;
`playtester` stays games-only.

**`.bridle/rules/dev-servers.md` and preview**: `packages/config/preview-ports.json`,
`scripts/preview.sh` and each client's `VITE_DEV_PORT`/`VITE_API_TARGET` lines
already cover all ten clients (every `vite.config.ts` reads `VITE_DEV_PORT`),
so **no preview change is needed for stage 1**. Only the rule's first
sentence ("No browser verification in this trial") conflicts with the base
rule `verify-ui-in-a-browser` for UI tasks; see risk 1.

### 3. Shared-file hazards

| File | Hazard | Rule for tasks |
|---|---|---|
| `package.json`, lockfile | `workspaces`, `build:*`, combined `build` list | Stage 1 should not need edits. A dependency add edits the lockfile for everyone: say so in the handoff and serialize those tasks. |
| `vitest.config.mts` | one `include` line; any two edits conflict | Task A adds all missing client globs once; later tasks don't edit it. |
| `Caddyfile*`, `dev-local.sh`, `scripts/build-deploy.sh`, `packages/config/dev-ports.json` | sync list for adding or renaming apps | Out of scope. No stage-1 task adds or renames an app. |
| `README.md` (Apps table), `llm-context.md`, `openapi.yaml` | sync list; edits to the same table collide textually | One-line change about the task's own app only. `openapi.yaml` changes mean the server: out of scope. |
| `client-home/src/pages/DirectoryPage.tsx` | card list touched by every cross-app task (tw-t4wa just did) | Only a home task or a new-app task edits it. |
| `CHANGELOG.md` | every task adds a line | Top of the right section, as now. |
| `CLAUDE.md` | sync list and conventions | Tasks don't edit it; propose changes to the manager. |
| `docs/<app>/planning.md` | per-app backlog | Own app's doc only. |
| `packages/ui`, `packages/auth` | shared by every client | Out of scope; a needed change stops the task. |

To avoid collisions: one task per client at a time, and no two tasks that
both edit a hazard-table file in flight together. After A and B, tasks C-G are
standalone and may run in any order.

### 4. Stage-1 tasks (S = under an hour, M = longer)

- **A. Check script and test globs (S).** Add `scripts/bridle-check.sh`; add
  the five missing client globs to `vitest.config.mts`. Accept:
  `scripts/bridle-check.sh` exits 0 on an unchanged branch and on one touching
  only `client-home/`, prints which apps it ran, and exits nonzero when a
  stage-1 build is broken (try a deliberate type error, then revert);
  `npx vitest run` still finds the same tests.
- **B. Rule and config edits (S; manager/orchestrator, not a worker).** Apply
  section 2 on `dev` (scope.md, specs.md, config.toml). Order: scope.md and
  specs.md before C-G; the `check` line only after A lands. Accept:
  `bridle ticket check` clean; a following worker task on client-home is not
  stopped by scope.
- **C. client-home first task (S).** A pipeline test: a tiny change or a docs/spec
  pass (e.g. align the `home-app-directory` spec with the cards). Accept:
  `npm run build:home` green, spec matches `DirectoryPage.tsx`.
- **D. client-play (M).** Accept: `npx vitest run client-play && npm run build:play`.
- **E. client-time (M).** No tests: the first task adds a minimal test around
  one pure helper (the glob exists from A). Accept: `npx vitest run
  client-time && npm run build:time`.
- **F. client-trips (M).** Accept: `npx vitest run client-trips && npm run
  build:trips`.
- **G. client-proto (S).** Sandbox; may need no behaviour spec. Accept:
  `npm run build:proto`.

C-G are "first task in this client" slots: the actual change comes from the
human's backlog (`docs/<app>/planning.md`); I did not invent features.

### 5. Risks and open questions for the human

1. **Browser verification.** `dev-servers` says no browser verification, but
   the base rule `verify-ui-in-a-browser` (must) requires it for UI tasks.
   Home, play, time and trips are mostly UI. Keep workers build-and-test only
   (manager or web-reviewer checks on the preview instance), or let workers use
   the preview instance? Recommendation: manager-only through stage 1.
2. **Shared packages stay out.** All stage-1 clients depend on `packages/ui`
   and/or `packages/auth`, so a real UI fix may need a change there.
   Recommendation: keep them out and stop-and-ask per task, until a later
   stage adds `packages/` (without `dungeon-engine`).
3. **No tests in time, home, proto.** The build is the only check there.
   Accept, or make the first task in each add a seed test (task E does for
   time)?
4. **Parallelism.** `max_workers = 1`; raise to 2 for stage 1?
5. **Extras.** Trips and proto are my pick; me and watch are deferred as
   above. Say if you want them in stage 1.
6. **Blast radius.** A push to `main` deploys all apps and stays the human's;
   unchanged by this plan, but time and home are used daily, so a bad merge to
   `dev` costs more than a bad games one.
7. **Specs.** `time` has no spec; should its first task write one? The
   `**App**:` values are inconsistent (`client-trips` vs `home`); left alone.
8. **Later stages (not planned yet):** stage 2 me, watch, talks; stage 3
   client-admin (side effects through the server); stage 4 `packages/`; then
   `src/` and its tests; deploy files, `.env` and `data.db` last or never;
   dungeon-engine waits for paired harness work.

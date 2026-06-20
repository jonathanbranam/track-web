## Context

Currently there is no way to verify which commit is running after a deploy — the admin Deploy page triggers a fire-and-forget script with no feedback about what version is now live. Each client app is a PWA with service-worker caching, meaning the running client bundle may lag behind the server by one deploy cycle without any visible indication.

The goal is to surface git commit SHA and timestamps in two places: full detail in the admin Deploy page, and a gesture-gated overlay in each app for quick spot-checking.

## Goals / Non-Goals

**Goals:**
- Make the running server version inspectable without SSH (via `/api/version`)
- Show each client's baked-in build SHA and compare it to the server SHA (to catch stale PWA caches)
- Provide a hidden gesture in each app that reveals version info without any persistent UI chrome
- Give the admin Deploy page a live confirmation loop: SHA changes → deploy succeeded

**Non-Goals:**
- Semantic versioning or git tags — SHA + timestamps are sufficient
- Per-app version endpoints — one server endpoint is the source of truth
- Persisting version history or deploy audit log (the deploy log file handles that)
- External monitoring integration (the public endpoint enables it, but wiring it up is out of scope)

## Decisions

### Decision: Two sources, one endpoint

**Client version** is baked in at Vite build time via `define` constants (`__COMMIT_SHA__`, `__BUILD_TIME__`). This is zero-cost at runtime and available offline.

**Server version** is written to `version.json` by the deploy script at the very start of each deploy run (before any build step), and read by the server at startup. It's exposed via `GET /api/version` with no auth requirement — version info is not sensitive and curl-ability from anywhere is useful for monitoring.

Alternative considered: reading git state live in the server process. Rejected because it requires git to be installed and accessible in the production process, and couples the server to the repo structure.

Alternative considered: single source (only build-time or only server-side). Rejected because build-time alone can't confirm what's deployed, and server-side alone can't reveal a stale PWA client.

### Decision: `version.json` written by deploy script, not server startup

Writing at deploy start (before builds) means the `buildTime` in `version.json` reflects when the deploy ran. The server reads it once at startup. If the file is missing (first run, local dev), the server returns `{ sha: "unknown", commitTime: null, buildTime: null }`.

### Decision: Shared gesture hook + overlay in `@repo/ui`

All client apps already depend on `@repo/ui`. Adding `useVersionGesture(ref)` and `VersionOverlay` there avoids duplicating gesture logic across 6+ apps. Each app's `App.tsx` mounts `<VersionOverlay clientSha={__COMMIT_SHA__} buildTime={__BUILD_TIME__} />` in its shell — the overlay handles fetching `/api/version` internally when triggered.

### Decision: Gesture = 3-finger touch + triple-click on nav logo

3-finger `touchstart` (`touches.length >= 3`) anywhere on the screen handles mobile. Triple-click on the nav app name/logo (via a ref passed to `useVersionGesture`) handles desktop/mouse, since touch is unavailable there. Both bind to the same callback.

Alternative considered: shake gesture. Rejected because some games already use shake and interference would be confusing.

Alternative considered: long-press. Rejected because long-press on iOS triggers text selection and context menus, requiring `preventDefault` that could suppress other interactions.

### Decision: Admin Deploy page polls `/api/version` post-trigger

After `POST /api/admin/deploy` returns 202, the Deploy page polls `GET /api/version` every 5s. When the SHA changes from the pre-deploy value, it stops polling and shows the new SHA as a success confirmation. Timeout after 3 minutes (36 polls) — if SHA hasn't changed, show a warning.

### Decision: Admin CLI command for `/api/version`

Per project convention, every API operation has a CLI counterpart. Adding `scripts/admin.ts version` (or similar) that prints version info and supports `--json`.

## Risks / Trade-offs

- **Stale `version.json` on first deploy**: If the file doesn't exist (fresh checkout), the server returns `"unknown"`. Mitigation: server falls back gracefully; deploy script creates it unconditionally.
- **`execSync` in vite.config.ts fails outside a git repo**: Local dev without git history (unlikely but possible). Mitigation: wrap in try/catch, fall back to `"dev"`.
- **3-finger tap conflicts with iOS accessibility**: Zoom or VoiceOver gestures can intercept multi-touch. Mitigation: acceptable for a personal app; add `passive: true` to the listener to avoid blocking scroll.
- **PWA overlay fetch fails offline**: `useVersionGesture` triggers a fetch to `/api/version` — if offline, it fails. Mitigation: show client SHA and `server: offline` label rather than hiding the overlay.
- **Deploy polling timeout**: Deploy takes longer than 3 minutes on a slow server. Mitigation: show a "still deploying…" message rather than an error; user can manually refresh.

## Migration Plan

1. Update `server-deploy.sh` — write `version.json` as first step after `git pull`
2. Add `GET /api/version` server route — reads `version.json`, no auth, registered before auth middleware
3. Update each `client-*/vite.config.ts` — add `define` block (try/catch around `execSync`)
4. Add `useVersionGesture` hook and `VersionOverlay` component to `packages/ui/src/`
5. Mount `<VersionOverlay>` in each `client-*/src/App.tsx`
6. Update `client-admin` Deploy page — add version section + polling logic
7. Add `version` subcommand to `scripts/admin.ts`

No database migrations. No Caddy changes. No rollback complexity — removing the overlay is a trivial one-liner if needed.

## Open Questions

- Should `VersionOverlay` auto-dismiss after a fixed timeout (e.g., 4s), require manual tap to dismiss, or both? (Proposal says auto-dismiss + tap — keep that default.)
- Is `admin.ts version` the right CLI command name, or should it be a subcommand of something else (e.g., `admin.ts deploy status`)?

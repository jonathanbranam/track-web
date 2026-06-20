## 1. Deploy Script

- [ ] 1.1 Add version.json write step to `server-deploy.sh` immediately after `git pull` — output `{ sha, commitTime, buildTime }` using `git rev-parse --short HEAD` and `git log -1 --format=%cI`

## 2. Server Route

- [ ] 2.1 Create `src/routes/version.ts` — reads `version.json` from project root, returns `{ sha, commitTime, buildTime }` with graceful fallback to `{ sha: "unknown", commitTime: null, buildTime: null }` if file missing
- [ ] 2.2 Register `GET /api/version` in `src/app.ts` before auth middleware (public route, no session required)
- [ ] 2.3 Write a test for `GET /api/version` covering: file present, file missing, unauthenticated access

## 3. Vite Build-Time Constants

- [ ] 3.1 Add TypeScript declarations for `__COMMIT_SHA__` and `__BUILD_TIME__` globals (add to `vite-env.d.ts` or a shared declarations file)
- [ ] 3.2 Update `client-time/vite.config.ts` — add `define` block with `__COMMIT_SHA__` and `__BUILD_TIME__` (try/catch `execSync`, fallback to `"dev"` and build ISO timestamp)
- [ ] 3.3 Update `client-watch/vite.config.ts` — same `define` block
- [ ] 3.4 Update `client-admin/vite.config.ts` — same `define` block
- [ ] 3.5 Update `client-games/vite.config.ts` — same `define` block
- [ ] 3.6 Update `client-play/vite.config.ts` — same `define` block
- [ ] 3.7 Update `client-trips/vite.config.ts` — same `define` block
- [ ] 3.8 Update `client-proto/vite.config.ts` — same `define` block

## 4. Shared UI Components

- [ ] 4.1 Add `useVersionGesture(navLogoRef)` hook to `packages/ui/src/` — binds 3-finger `touchstart` listener on `document` (passive) and triple-click listener on the provided ref element (3 clicks within 600ms); calls provided callback on either trigger
- [ ] 4.2 Add `VersionOverlay` component to `packages/ui/src/` — accepts `clientSha` and `buildTime` props; on reveal fetches `/api/version`; displays client SHA, build time (US/Eastern), server SHA, and match/mismatch indicator; auto-dismisses after 4s or on tap/click; shows "offline" for server SHA when fetch fails
- [ ] 4.3 Export `useVersionGesture` and `VersionOverlay` from `packages/ui/src/index.ts`

## 5. Per-App Integration

- [ ] 5.1 Mount `<VersionOverlay clientSha={__COMMIT_SHA__} buildTime={__BUILD_TIME__} />` in `client-time/src/App.tsx`
- [ ] 5.2 Mount `<VersionOverlay>` in `client-watch/src/App.tsx`
- [ ] 5.3 Mount `<VersionOverlay>` in `client-admin/src/App.tsx`
- [ ] 5.4 Mount `<VersionOverlay>` in `client-games/src/App.tsx`
- [ ] 5.5 Mount `<VersionOverlay>` in `client-play/src/App.tsx`
- [ ] 5.6 Mount `<VersionOverlay>` in `client-trips/src/App.tsx`
- [ ] 5.7 Mount `<VersionOverlay>` in `client-proto/src/App.tsx`

## 6. Admin Deploy Page

- [ ] 6.1 Add version section to `client-admin/src/pages/DeployPage.tsx` — fetch `/api/version` on load, display short SHA, commit time, and build time (US/Eastern)
- [ ] 6.2 Add post-deploy polling — after 202 response, store pre-deploy SHA, poll `/api/version` every 5s until SHA changes (show new SHA + success indicator) or 3-minute timeout (show warning)

## 7. Admin CLI

- [ ] 7.1 Add `version` subcommand to `scripts/admin.ts` — fetches `GET /api/version` from the configured server base URL, prints SHA, commit time, and build time; supports `--json` flag

## 8. Documentation

- [ ] 8.1 Update `openapi.yaml` — add `GET /api/version` with response schema `{ sha: string, commitTime: string | null, buildTime: string | null }`
- [ ] 8.2 Update `llm-context.md` — note the public `GET /api/version` endpoint under API conventions

## 9. Verification

- [ ] 9.1 Build all affected clients (`npm run build:time`, `build:watch`, `build:admin`, `build:games`, `build:play`, `build:trips`, `build:proto`) and confirm zero TypeScript errors
- [ ] 9.2 Build server (`npm run build:server`) and confirm zero TypeScript errors
- [ ] 9.3 Run existing tests (`npx vitest run`) and confirm all pass
- [ ] 9.4 Start dev server and verify the version overlay appears (3-finger or triple-click) in the time app, showing client SHA and server SHA
- [ ] 9.5 Verify admin Deploy page shows version info and that polling works (can test by temporarily shortening the interval)

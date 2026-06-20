## Why

After triggering a deploy it's currently impossible to verify what version is running without SSHing into the server or reading logs. Adding version info (git SHA + timestamps) closes the feedback loop: the admin app can confirm the new SHA is live, and a hidden gesture in each client app lets you spot-check the running version at any time without cluttering the UI.

## What Changes

- The deploy script writes a `version.json` (short SHA, commit time, build time) before building
- The server exposes `GET /api/version` (public, no auth) returning the contents of that file
- Each Vite app bakes its own short SHA and build time into the bundle via `define` constants at build time
- A shared `@repo/ui` component (`VersionOverlay`) and gesture hook (`useVersionGesture`) let each app reveal version info via a hidden gesture
- The gesture is: 3-finger tap anywhere (mobile) OR triple-click the app name/logo in the nav bar (desktop)
- The overlay shows: client short SHA, client build time, server short SHA — with a match/mismatch indicator
- The admin Deploy page gains a version section showing the live server SHA + timestamps, polling every 5s after a deploy fires until the SHA changes (visual confirmation)

## Capabilities

### New Capabilities

- `build-version-info`: Version metadata pipeline — deploy script writes `version.json`, server exposes `GET /api/version`, Vite `define` constants bake client SHA/build-time into each bundle, shared `VersionOverlay` component + `useVersionGesture` hook, per-app gesture-triggered overlay showing client vs server version

### Modified Capabilities

- `admin-deploy`: Adding a version display section to the Deploy page that shows current server SHA + timestamps and polls post-deploy until the SHA changes to confirm success

## Impact

- `server-deploy.sh` — writes `version.json` at deploy start (before any build step)
- `src/app.ts` or new `src/routes/version.ts` — registers `GET /api/version` route (public)
- `client-*/vite.config.ts` — adds `define` block with `__COMMIT_SHA__` and `__BUILD_TIME__` for all client apps
- `packages/ui/src/` — adds `VersionOverlay` component and `useVersionGesture` hook
- `client-*/src/App.tsx` — each app mounts `<VersionOverlay>` in its shell
- `client-admin/src/pages/DeployPage.tsx` — adds version display and polling logic
- No database changes, no new dependencies expected

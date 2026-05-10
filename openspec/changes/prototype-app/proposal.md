## Why

UI exploration for this app requires running live on a real mobile device, but there's no good place to host throwaway screens without polluting the production apps. A dedicated prototype client gives a safe, low-friction space to build and compare UI variations on real hardware without touching any working app.

## What Changes

- New `client-proto` Vite + React app added to the monorepo, following the same build/serve pattern as `client-time`, `client-watch`, and `client-food`
- Mobile-first, dark-only — no backend routes, no auth, no data persistence
- Prototype variations are registered by name; the app can display multiple named screen variations for a single prototype
- A variation-switcher mechanism lets the user cycle through variations without interfering with normal app interactions — either a hidden gesture (two-finger swipe or three-finger tap) or a named "pick prototype" entry screen with a floating X to return
- Deployed under its own subdomain (e.g., `proto.`) with updates to Caddyfile, Caddyfile.local, server-deploy.sh, and dev-local.sh

## Capabilities

### New Capabilities

- `proto-app-shell`: The new `client-proto` client app — Vite config, React 19 entry point, Tailwind CSS 4, PWA shell, mobile safe areas, monorepo wiring (build scripts, proxy config, deploy config)
- `proto-variation-switcher`: Mechanism for switching between named variations within a prototype — gesture-based (two-finger swipe or three-finger tap, unlikely to fire in normal use) or a top-level picker screen with a floating X button to return; both modes should be available as an implementation choice

### Modified Capabilities

_(none — this change introduces entirely new infrastructure)_

## Impact

- New `client-proto/` directory with its own `package.json`, `vite.config.ts`, and `src/`
- `Caddyfile` and `Caddyfile.local` — new route/subdomain for proto app
- `server-deploy.sh` — new build step for `client-proto`
- `dev-local.sh` — new tmux pane for proto dev server
- No changes to existing apps or backend routes
- No database schema changes

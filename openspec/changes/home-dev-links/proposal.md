## Why

The home app directory's cards always link to production URLs (`https://<app>.branam.us`), even when the directory itself is being viewed locally during development — over `localhost`, a LAN IP (for phone testing), or a `*-branam-us.duckdns.org` hostname (via the local Caddy proxy in `Caddyfile.local`). This forces a manual port lookup every time, in every one of these environments, to reach the actual running dev server for another app.

## What Changes

- Home app directory cards detect whether they're running under the Vite dev server (`import.meta.env.DEV`) and, if so, rewrite each card's link target based on how the page itself was reached:
  - `localhost` or a LAN IP address → same host, target app's dev port
  - a `*-branam-us.duckdns.org` hostname (local Caddy + DuckDNS phone testing) → matching `-branam-us.duckdns.org` hostname for the target app, port unchanged
  - anything else (a production build) → unchanged `https://<app>.branam.us` URLs, exactly as today
- Introduce a shared dev-port table (`dev-ports.json`, in a new `packages/config` workspace) as the single source of truth for each client app's local Vite dev server port, consumed by `client-home` to build the rewritten links
- Open design decision: whether every `client-*/vite.config.ts` also sources its `server.port` from `dev-ports.json` instead of a hardcoded literal, closing the existing duplication between `Caddyfile.local` and each app's `vite.config.ts` down to one fewer copy

## Capabilities

### New Capabilities
*(none — this extends the existing home app directory capability)*

### Modified Capabilities
- `home-app-directory`: the "App cards link to correct subdomain" requirement is extended so link targets are environment-aware — pointing at the matching local dev server when viewed on `localhost`, a LAN IP, or a `*-branam-us.duckdns.org` hostname, and at the production subdomain otherwise (unchanged from today)

## Impact

- `client-home/src/pages/DirectoryPage.tsx` — new link-resolution logic, gated on `import.meta.env.DEV`
- New `packages/config/dev-ports.json` (plus a small helper) — shared dev port table, following the existing `packages/ui` / `packages/auth` shared-package pattern
- Possibly every `client-*/vite.config.ts` — sourcing `server.port` from the shared file rather than a literal (pending the design decision above)
- No backend/API changes. No change to production behavior, `Caddyfile`, or deployed routing — production card links are byte-for-byte identical to today.

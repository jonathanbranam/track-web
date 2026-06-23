## Why

As the branam.us platform has grown to seven apps across time, watch, trips, games, me, food, and admin, there is no single place for users to discover what exists or navigate between apps. Family and friends who are invited to trips or watch events land on individual app URLs with no awareness of the broader suite.

## What Changes

- New `client-home` npm workspace serving `home.branam.us` — React 19 + Vite + Tailwind 4, same structure as other client apps
- App directory page showing a card grid: time, watch, trips, games, me, food ("Coming soon"), admin (admin-only), proto (admin-only)
- Cards link to the respective app subdomain with a name and short description of purpose
- Auth required: unauthenticated users see a login page; identity from existing `GET /api/auth/me` (no new endpoints)
- Role-based visibility: `admin.branam.us` and `proto.branam.us` cards shown only when `userId === 1`
- Deployment wiring: `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`

## Capabilities

### New Capabilities

- `home-app-shell`: New `client-home` npm workspace and deployment wiring — Vite config, dev port, Caddy virtual host, build step, dev pane
- `home-app-directory`: App directory UI on `home.branam.us` — authenticated card grid with role-based visibility and a "Coming soon" state for food

### Modified Capabilities

## Impact

- No backend changes — uses existing `/api/auth/me` endpoint
- No changes to any existing client apps
- `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh` each get a `home.branam.us` / `client-home` entry
- No new DNS records needed (wildcard `*.branam.us` covers it)

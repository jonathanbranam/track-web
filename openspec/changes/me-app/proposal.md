## Why

Social management (People, Groups, Invite Codes) lives in both the watch and food apps purely by historical accident — it's cross-app social infrastructure that has no natural home in either. A dedicated `me.branam.us` app gives every user a single place for their identity and social graph, removes the duplication, and provides a clean home for account self-admin (password and display name) that isn't the admin console.

## What Changes

- New `client-me` workspace serving `me.branam.us` — React 19 + Vite + Tailwind 4 + PWA, same structure as other client apps
- `me.branam.us` provides three sections: Account (password, display name), People (connections), and Social (groups, invite codes)
- All `@repo/ui` social components (`PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, `RedeemInviteCode`) consumed by the new app, unchanged
- New backend endpoints: `PUT /api/users/me/password` and `PUT /api/users/me/display-name` for authenticated self-admin
- **BREAKING**: People tab removed from `client-watch` and `client-food` nav
- **BREAKING**: `/people` route removed from `client-watch` and `client-food`

## Capabilities

### New Capabilities

- `me-app-shell`: New `client-me` npm workspace and deployment wiring — Vite config, dev port, Caddy virtual host, build step, dev pane
- `me-social`: Social hub on `me.branam.us` — People (connections), Groups, and Codes tabs; consumes existing `@repo/ui` components; all existing `/api/social/*` endpoints unchanged
- `me-account`: Account self-admin on `me.branam.us` — `PUT /api/users/me/password` (rotates session nonce, invalidating other sessions) and `PUT /api/users/me/display-name`; UI with current display name pre-filled and password change form

### Modified Capabilities

- `social-ui`: The "People tab in watch and food apps" requirement is removed — watch and food no longer include the People nav tab or `/people` route

## Impact

- **`client-watch`**: Remove People nav tab and `/people` route; remove `PeoplePage` component
- **`client-food`**: Same removals as client-watch
- **Backend**: Two new routes (`PUT /api/users/me/password`, `PUT /api/users/me/display-name`) under standard auth middleware (any authenticated user); password change MUST rotate `session_nonce`
- **`openspec/specs/social-ui/spec.md`**: "People tab in watch and food apps" requirement replaced with a note that the hub lives at `me.branam.us`
- **Deployment**: `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh` each get a `me.branam.us` / `client-me` entry
- No new DNS records needed (wildcard `*.branam.us` covers it)
- No changes to `@repo/ui` components or `/api/social/*` endpoints

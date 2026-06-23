## Context

The project is a monorepo with a Hono + SQLite backend and several React 19 + Vite + Tailwind 4 client apps. Social management components (`PeopleTab`, `GroupList`, `GroupEditor`, `InviteCodePanel`, `RedeemInviteCode`) live in `@repo/ui` and are currently consumed by `client-watch` and `client-food` (planned). A new `client-me` workspace at `me.branam.us` consolidates these into one cross-app home, and adds self-service account management (password + display name) that currently has no user-facing path.

Existing dev ports: 6010 (time), 6015 (watch), 6020 (proto), 6025 (trips), 6030 (play), 6035 (games), 6040 (admin). `client-me` uses **6045**.

## Goals / Non-Goals

**Goals:**
- New `client-me` workspace at `me.branam.us` accessible to any authenticated user
- Two backend routes for self-service account management: change password, change display name
- `me.branam.us` hosts People, Groups, and Invite Codes tabs (reusing `@repo/ui` components unchanged)
- People tab and `/people` route removed from `client-watch`; same removal from `client-food` when that app is built

**Non-Goals:**
- Changes to `@repo/ui` social components or any `/api/social/*` endpoint
- Admin-only features (user list, delete user, tokens, backup, etc.) — those stay in `client-admin`
- Invite link / account-claim flow (tracked separately in `user-invite-and-self-admin`)
- Profile photos or any data beyond display name and password

## Decisions

### New workspace: `client-me`
Mirror the pattern of `client-admin`: its own npm workspace (`@repo/me`), `vite.config.ts`, `tsconfig.json`, `index.html`, dev port 6045, output to `client-me/dist/`. No new shared packages needed — consumes `@repo/auth` (login page) and `@repo/ui` (social components).

### Nav structure: two tabs
Bottom nav with **Account** and **People** tabs. The People tab reproduces the existing three sub-tabs (Connections | Groups | Codes) from `client-watch`'s `PeoplePage` — moving that component to `client-me` directly or re-implementing it identically. No reason to add more top-level tabs for the initial scope.

### Self-service backend routes under `/api/users/me`
Two new routes protected by standard `authMiddleware` (any authenticated user, no admin guard):
- `PUT /api/users/me/password` — body: `{ currentPassword, newPassword }`. Validates current password with bcrypt before updating. Rotates `session_nonce` on success (invalidating all sessions including the caller's). Returns 204.
- `PUT /api/users/me/display-name` — body: `{ displayName }`. Validates non-empty string, max 100 chars. Returns 200 `{ displayName }`.

These live in a new `src/routes/users.ts` file (separate from `src/routes/auth.ts` to keep auth concerns isolated).

### Password change forces re-login
After `PUT /api/users/me/password` the `session_nonce` rotates, invalidating the caller's own cookie. The UI must inform the user ("You'll be logged out on all devices after saving") and redirect to login on the resulting 401. No special re-issuance of a new session — this matches the existing invariant applied to admin-initiated password changes and keeps the implementation simple.

### Admin CLI: `users:set-display-name`
The design rules require a CLI equivalent for every API operation. `users:update-password` already covers password changes. A new `users:set-display-name <email> <displayName>` command covers the display-name path. It does not rotate the nonce (display name change is not a security event). No `--json` flag needed (mutation, no data returned).

### Removing People tab from client-watch
Remove the `/people` route and `PeoplePage` import from `client-watch/src/App.tsx`, delete `client-watch/src/pages/PeoplePage.tsx`, and remove the People nav entry. No redirect is added — the tab simply disappears. `client-food` does not exist yet so no removal is needed there; its planning doc should note that People tab is excluded.

### Deployment wiring
Follows the same checklist as every other new client app:
- `Caddyfile`: `me.branam.us` virtual host, static `client-me/dist` + `/api/*` reverse-proxy to backend
- `Caddyfile.local`: `me-branam-us.duckdns.org:80` → `localhost:6045`
- `server-deploy.sh`: add `npm run build:me` step
- `dev-local.sh`: add `client-me` Vite pane
- `package.json`: add `build:me` script

## Risks / Trade-offs

- **People tab removal is a breaking UX change** → users who relied on the tab in watch will find it gone. No redirect planned; low risk given small user count, but worth communicating.
- **Re-login after password change is disruptive** → deliberate; matches existing admin behavior and avoids session-issuance complexity. Mitigated by prominent UI warning before submit.
- **Port 6045 assumption** → if another app claims 6045 before this ships, pick the next available and update Caddy configs accordingly.

## Open Questions

- Should `PUT /api/users/me/display-name` also update the value returned by `/api/auth/me` immediately (it will, since `me` reads from DB)? No action needed, but worth confirming in tests.
- When `client-food` is built, its People tab should be excluded from the start. The `food` change planning doc should note this dependency.

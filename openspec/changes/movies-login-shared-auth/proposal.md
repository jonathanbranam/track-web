## Why

The movies client is a bare stub with no auth; it needs login-gated routing before any real features can be added. Both clients share the same backend auth endpoints, so the auth UI logic (login page, auth context, API calls, guard component) should live in a shared package rather than being copied.

## What Changes

- Create `packages/auth` — a shared React auth package exporting `useAuth`/`AuthProvider`, `LoginPage`, `BetaPage`, `AuthGuard`, and `api.auth`
- Update `client-tracker` to import auth from `packages/auth` instead of local files; remove the now-duplicated local copies
- Wire up `client-movies` with full auth-gated routing (`App.tsx`, `AuthProvider`, `AuthGuard`) using `packages/auth`
- `LoginPage` accepts an app-name and icon prop so tracker shows "Track" and movies shows "Movies" branding

## Capabilities

### New Capabilities
- `shared-client-auth`: Shared `packages/auth` React package exporting auth primitives (`useAuth`, `AuthProvider`, `LoginPage`, `BetaPage`, `AuthGuard`, `api.auth`) used by all frontend clients
- `movies-login`: Movies client has auth-protected routing — unauthenticated users are redirected to a login page; authenticated users reach the app shell

### Modified Capabilities
- `user-auth`: The honeypot login UI requirement moves from being tracker-specific to being the canonical shared login component used by all apps

## Impact

- `packages/auth/` — new package, new `package.json`
- `client-tracker/src/hooks/useAuth.tsx`, `client-tracker/src/pages/LoginPage.tsx`, `client-tracker/src/pages/BetaPage.tsx` — replaced with imports from `packages/auth`
- `client-tracker/src/api.ts` — `auth.*` methods extracted to `packages/auth`; tracker-specific entries methods remain local
- `client-movies/src/main.tsx` — replaced with full `App.tsx` + routing setup
- `tsconfig.json` / `package.json` — path alias for `@track/auth` pointing to `packages/auth`

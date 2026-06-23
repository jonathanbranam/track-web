## 1. Backend: self-admin API routes

- [x] 1.1 Create `src/routes/users.ts` with `PUT /api/users/me/display-name` — validates non-empty, max 100 chars, updates `users.display_name`, returns 200 `{ displayName }`
- [x] 1.2 Add `PUT /api/users/me/password` to `src/routes/users.ts` — verifies current password with bcrypt, updates hash, rotates `session_nonce`, returns 204
- [x] 1.3 Register `/api/users` router in `src/app.ts` under `authMiddleware`
- [x] 1.4 Update `openapi.yaml` with `PUT /api/users/me/display-name` and `PUT /api/users/me/password`

## 2. Admin CLI: set-display-name command

- [x] 2.1 Add `users:set-display-name <email> <displayName>` CLI command that updates `display_name` in the DB; exits with error if email not found
- [x] 2.2 Update `README.md` with the new `users:set-display-name` command

## 3. client-me workspace scaffold

- [x] 3.1 Create `client-me/` directory with `package.json` (name `@repo/me`, same deps as other client apps)
- [x] 3.2 Create `client-me/vite.config.ts` — port 6045, `/api` proxy to `localhost:3000`, PWA plugin, Tailwind 4
- [x] 3.3 Create `client-me/tsconfig.json` and `client-me/tsconfig.app.json` mirroring `client-admin` structure
- [x] 3.4 Create `client-me/index.html`
- [x] 3.5 Create `client-me/src/main.tsx` and `client-me/src/index.css` (Tailwind import)
- [x] 3.6 Copy PWA icons into `client-me/public/icons/` (192 and 512 variants)
- [x] 3.7 Add `client-me` to workspaces in root `package.json`; add `"build:me": "npm run build -w client-me"` script

## 4. me app: routing and auth guard

- [x] 4.1 Create `client-me/src/App.tsx` with React Router v7 setup, `AuthGuard` (redirects unauthenticated to `/login`), and routes for `/account` and `/people`
- [x] 4.2 Create `client-me/src/api.ts` (fetch wrapper with `credentials: 'include'`)
- [x] 4.3 Create `client-me/src/hooks/useAuth.tsx` (auth context providing `userId`, `displayName`, `logout`)
- [x] 4.4 Create `client-me/src/components/NavBar.tsx` — fixed bottom nav with Account and People tabs, safe-area padding

## 5. me app: Account page

- [x] 5.1 Create `client-me/src/pages/AccountPage.tsx` — shows email (read-only) and display name pre-filled from `GET /api/auth/me`
- [x] 5.2 Add display name form: submits `PUT /api/users/me/display-name`, shows success/error feedback
- [x] 5.3 Add password change form with current password, new password, confirmation fields; show warning "You'll be signed out on all devices after changing your password"
- [x] 5.4 On 401 response following a password change, clear auth context and redirect to `/login`

## 6. me app: People page

- [x] 6.1 Create `client-me/src/pages/PeoplePage.tsx` — three sub-tabs (Connections, Groups, Codes) using `SegmentedControl` from `@repo/ui`
- [x] 6.2 Connections sub-tab: renders `PeopleTab` from `@repo/ui`
- [x] 6.3 Groups sub-tab: renders `GroupList` and `GroupEditor` from `@repo/ui` (same pattern as `client-watch/src/pages/PeoplePage.tsx`)
- [x] 6.4 Codes sub-tab: renders `InviteCodePanel` and `RedeemInviteCode` from `@repo/ui`

## 7. client-watch: remove People tab

- [x] 7.1 Remove People nav entry and `/people` route from `client-watch/src/App.tsx`
- [x] 7.2 Delete `client-watch/src/pages/PeoplePage.tsx`

## 8. Deployment wiring

- [x] 8.1 Add `me.branam.us` virtual host to `Caddyfile` — static `client-me/dist`, `/api/*` reverse-proxy to backend
- [x] 8.2 Add `me-branam-us.duckdns.org:80 → localhost:6045` to `Caddyfile.local`
- [x] 8.3 Add `npm run build:me` step to `server-deploy.sh`
- [x] 8.4 Add `client-me` Vite dev pane to `dev-local.sh`

## 9. Build verification and documentation

- [x] 9.1 Run `npm run build:me` — confirm zero TypeScript errors
- [x] 9.2 Run `npm run build:watch` — confirm zero TypeScript errors after People tab removal
- [x] 9.3 Run `npm run build:server` — confirm zero TypeScript errors
- [x] 9.4 Update `llm-context.md` — add `me.branam.us` app, note social hub moved from watch, document new self-admin endpoints

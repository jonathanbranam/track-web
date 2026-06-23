## Context

The branam.us platform has grown to seven apps (time, watch, trips, games, me, food, admin, proto) with no shared entry point. Users navigate by remembering subdomains directly. The home app is a new `client-home` workspace following the same structure as all other client workspaces — React 19 + Vite + Tailwind 4 + PWA.

No backend changes are needed. `GET /api/auth/me` already returns `{ userId, displayName }`, which is sufficient to authenticate users and determine admin status (`userId === 1`).

## Goals / Non-Goals

**Goals:**
- A single authenticated landing page listing all apps with descriptions and links
- Role-based card visibility (admin/proto hidden from non-admins)
- Consistent tooling with all other client workspaces
- No new backend surface

**Non-Goals:**
- Notifications or activity feed (future enhancement)
- Deep linking or per-user customization
- Any changes to existing apps

## Decisions

### Reuse `@repo/auth` for authentication
The shared `AuthProvider`, `AuthGuard`, `LoginPage`, and `useAuth` hook are used unchanged. `useAuth()` exposes `userId`; admin detection is `userId === 1` on the client. No new guard component is needed — `AuthGuard` alone is sufficient (unlike the admin app which also has `AdminGuard`).

*Alternative considered*: Custom auth hook calling `/api/auth/me` directly. Rejected — the shared package already wraps this cleanly and is used by every other app.

### No bottom NavBar
The home app is a single directory page with no internal navigation sections. A `NavBar` would be meaningless. Logout is accessible via a header element (small button top-right, consistent with single-page patterns).

*Alternative considered*: Minimal nav with only a logout entry. Rejected — a full nav bar communicates multiple destinations; using it for one action is misleading.

### App directory as static config, not API-driven
The card inventory (name, description, URL, admin-only flag, coming-soon flag) is defined as a static array in the component. Adding or removing an app requires a code change and redeploy — acceptable given how rarely the app list changes.

*Alternative considered*: Backend endpoint returning the card list so it can be updated without a frontend deploy. Rejected — the list changes at most a few times per year and is already coupled to deployment wiring anyway.

### Card grid layout
Two columns on mobile, three on wider screens. Each card is a rounded box with:
- App name (bold)
- Short description (muted text)
- "Coming soon" badge in place of a link for food

Cards for admin/proto are rendered only when `userId === 1`. The check is purely client-side; the underlying app subdomains already enforce their own auth.

## Risks / Trade-offs

- **Stale card list**: If a new app ships without updating `client-home`, the directory falls behind. Mitigation: the CLAUDE.md "Keep in sync" checklist already covers Caddyfile, deploy scripts, etc. — add `client-home/src/pages/DirectoryPage.tsx` (or equivalent) to that list.
- **Admin card visible in source**: Non-admin users can read the compiled JS and discover `admin.branam.us` exists. Acceptable — the admin app has its own auth guard; obscurity is not a security requirement here.

## Migration Plan

No migrations required. The new workspace is purely additive:
1. Scaffold `client-home` workspace
2. Wire deployment files
3. Deploy — Caddy auto-provisions SSL for `home.branam.us` on first request (wildcard DNS already covers it)

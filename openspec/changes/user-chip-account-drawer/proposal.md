## Why

When client apps are installed as iOS PWA home screen apps, the URL bar is hidden and there is no way to navigate to `/logout` or see who is currently signed in. All client apps need an always-accessible identity widget that surfaces logout and account info directly within the UI.

## What Changes

- Add a floating `UserChip` component: a fixed-position circle showing the user's initials, rendered in the upper-right corner of the app shell
- Tapping the chip opens a bottom drawer with the user's email, display name, a link to `me.branam.us` for account management, and a logout button
- Apps control chip visibility (hidden by default on certain screens such as in-game views or full-screen overlays); visible on all main navigable pages by default
- `/api/auth/me` response extended to include `email`
- `AuthContext` extended to expose `email` alongside existing `userId`, `displayName`, and `logout`
- `@repo/auth` exports `UserChip` for use by all client apps
- All 7 client apps (`client-time`, `client-games`, `client-watch`, `client-me`, `client-play`, `client-admin`, `client-trips`) render `<UserChip />` in their app shell

## Capabilities

### New Capabilities

- `user-chip`: Floating user identity widget — a fixed-position initials circle in the upper-right corner that opens a bottom drawer with email, display name, account management link, and logout

### Modified Capabilities

- `user-auth`: `/api/auth/me` now returns `email` in addition to `userId` and `displayName`
- `shared-client-auth`: `AuthContext` gains an `email` field; `@repo/auth` exports a new `UserChip` component

## Impact

- **Backend**: `src/routes/auth.ts` — add `email` to `/api/auth/me` response
- **Shared package `@repo/auth`**: `authApi.ts` (return type), `useAuth.tsx` (context type + state), new `UserChip.tsx` + bottom drawer component, `index.ts` (export)
- **All client apps** (`client-*/src/App.tsx`): import and render `<UserChip />` inside `AuthProvider`; pass a visibility override for screens where the chip should be hidden
- **No database schema changes** — email already stored in `users` table, just not exposed via the API
- **No new routes or Caddyfile changes** — the chip is purely client-side UI

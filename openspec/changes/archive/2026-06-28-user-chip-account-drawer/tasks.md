## 1. Backend — Extend /me response

- [x] 1.1 Update `src/routes/auth.ts` — add `email` to the `GET /api/auth/me` JSON response alongside `userId` and `displayName`
- [x] 1.2 Update `openapi.yaml` — add `email: string` to the `/api/auth/me` 200 response schema

## 2. @repo/auth — Update auth context and API types

- [x] 2.1 Update `packages/auth/src/authApi.ts` — add `email: string` to the `me()` return type
- [x] 2.2 Update `packages/auth/src/useAuth.tsx` — add `email: string | null` to `AuthContextType`; initialize from `authApi.me()` response; clear to null in the `logout` function alongside `userId` and `displayName`

## 3. @repo/auth — Build UserChip component

- [x] 3.1 Create `packages/auth/src/UserChip.tsx` — chip button: `position: fixed; top: calc(var(--sat) + 6px); right: 12px; z-index: 50`; accept a `hidden?: boolean` prop that returns null when true; return null when `userId` is null
- [x] 3.2 Implement initials logic in `UserChip.tsx`: split `displayName` on whitespace → take first char of first word + first char of last word (uppercase); if `displayName` is null/empty, strip `@domain` from email, replace dots with spaces, apply same first/last rule; fall back to person outline SVG if both unavailable
- [x] 3.3 Implement bottom drawer in `UserChip.tsx`: `useState(open)` controls visibility; fixed semi-transparent backdrop (`z-40`, inset-0) closes drawer on tap; drawer panel slides up from bottom (`z-50`); displays userId (small secondary label), displayName, email, `<a href="https://me.branam.us" target="_blank" rel="noopener noreferrer">Manage account</a>`, and a logout button that calls `logout()` then navigates to `/login`
- [x] 3.4 Export `UserChip` from `packages/auth/src/index.ts`

## 4. Wire UserChip into all client apps

- [x] 4.1 `client-time/src/App.tsx` — render `<UserChip />` inside `AppShell`, after the routes, guarded by `userId`
- [x] 4.2 `client-games/src/App.tsx` — render `<UserChip hidden={inGame} />` inside `AppShell` using the existing `inGame` boolean
- [x] 4.3 `client-watch/src/App.tsx` — render `<UserChip />` inside `AppShell`, guarded by `userId`; hidden on `/ratings`
- [x] 4.4 `client-me/src/App.tsx` — render `<UserChip />` inside `AppShell`, guarded by `userId`
- [x] 4.5 `client-play/src/App.tsx` — render `<UserChip />` inside `AppShell`, guarded by `userId`
- [x] 4.6 `client-admin/src/App.tsx` — render `<UserChip />` inside `AppShell`, guarded by `isAdmin`
- [x] 4.7 `client-trips/src/App.tsx` — render `<UserChip />` inside `AppShell`, guarded by `userId`

## 5. Build and verify

- [x] 5.1 Run `npm run build` and confirm zero TypeScript errors across all packages and client apps
- [x] 5.2 Open client-time in the browser — confirm chip appears in upper-right on the home page
- [x] 5.3 Tap chip — confirm drawer opens with correct userId, displayName, email, account link, and logout button
- [x] 5.4 Tap logout in drawer — confirm session is cleared and redirect to `/login` occurs
- [x] 5.5 Open client-games — confirm chip is visible on the home page and hidden when navigating into a game

## 6. Documentation

- [x] 6.1 Update `llm-context.md` — document the `UserChip` component (location: `@repo/auth`, prop: `hidden`), the email field now present in `AuthContext` and `/api/auth/me`, and the drawer behavior

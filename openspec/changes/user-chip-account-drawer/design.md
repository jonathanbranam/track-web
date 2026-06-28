## Context

All client apps already include `/logout` as a route and use `@repo/auth` for session management. The `AuthProvider` already fetches and exposes `displayName` from `/api/auth/me`. The missing piece is a UI affordance that is always reachable without the URL bar — specifically needed for iOS PWA home screen installs where the address bar is unavailable.

The upper-right corner of every app's main pages is currently unused. Apps apply `paddingTop: var(--sat)` to content but leave the area above that padding bare.

## Goals / Non-Goals

**Goals:**
- Provide a floating initials chip in the upper-right corner of every client app, reachable without URL navigation
- Tapping the chip opens a bottom drawer with email, display name, account management link, and logout
- Apps can suppress the chip on specific pages (e.g., in-game views) via a `hidden` prop
- Add email to the auth context so the drawer can display it without a second API call

**Non-Goals:**
- Not a general-purpose bottom sheet or drawer component — built specifically for this use case
- Not replacing or duplicating client-me's full AccountPage functionality
- Not adding new routes to any client app
- Not handling multi-account switching

## Decisions

### 1. Component lives in `@repo/auth`, not `@repo/ui`

`@repo/auth` already has `useAuth()` and uses `react-router-dom` (`LogoutPage` uses `useNavigate`). A self-contained `UserChip` there requires no new cross-package dependencies. If placed in `@repo/ui`, that package would need to depend on `@repo/auth`, creating an inappropriate coupling (UI primitives depending on auth logic).

**Alternative considered**: Accept props `({ displayName, email, onLogout })` and put in `@repo/ui` to keep it pure UI. Rejected because it pushes wiring into every app rather than one place.

### 2. Visibility controlled by a `hidden` prop, defaulting to `false`

Each app renders `<UserChip hidden={someCondition} />` in its App shell, using whatever routing logic it already has (e.g., `hidden={inGame}` in client-games). When `hidden` is true the component returns null.

**Alternative considered**: The component reads the current route internally and accepts a `hideOn` route list. Rejected — it couples the component to each app's route structure, which varies widely across 7 apps.

### 3. Bottom drawer built inline with React state, no portal

A simple `useState(open)` controls drawer visibility. The chip and drawer are `position: fixed`, so they already escape normal document flow without needing `createPortal`. A semi-transparent backdrop sits below the drawer and above page content; clicking it closes the drawer.

The drawer displays: userId (as a small secondary label for debugging), displayName, email, a link to `me.branam.us`, and a logout button.

Stack from bottom:
```
z-40  backdrop (fixed, inset-0, bg-black/50)
z-50  chip (fixed, top-right)
z-50  drawer panel (fixed, bottom-0, left-0, right-0)
```

**Alternative considered**: `createPortal` to `document.body`. Unnecessary since fixed positioning already achieves the layering goal.

### 4. Initials derived from `displayName`, falling back to email local part

**Primary**: Split `displayName` on whitespace, take first character of the **first** word and first character of the **last** word (same word when only one), uppercase. This handles middle names in display names correctly.

**Fallback**: If `displayName` is null or empty, use the local part of `email` (strip `@domain`), replace dots (`.`) with spaces, then apply the same first/last rule. This ensures email-style names like `bill.j.smith` produce `BS`, not `BJ`.

**Final fallback**: Person outline SVG if both are unavailable (defensive only; should not occur in practice).

```
displayName "Jon"              → "J"
displayName "Jon Branam"       → "JB"
displayName "Jon J. Branam"    → "JB"   (first=Jon, last=Branam)
displayName null, email "bill.j.smith@gmail.com"
  → local "bill.j.smith" → "bill j smith" → first=bill, last=smith → "BS"
displayName null, email "jon@branam.us"
  → local "jon" → "jon" → first=last=jon → "J"
```

### 5. Email added to `/api/auth/me` and `AuthContext`

The `users` table already stores `email`. The `/api/auth/me` handler adds it to its JSON response alongside `userId` and `displayName`. `authApi.me()` return type gains `email: string`. `AuthContext` gains an `email: string | null` field, set from the `/me` response on mount and cleared on logout.

This avoids a second round-trip when the drawer opens.

### 6. Chip positioned below the safe-area-top inset

```css
position: fixed;
top: calc(var(--sat) + 6px);
right: 12px;
z-index: 50;
```

`--sat` is `env(safe-area-inset-top, 0px)` defined in each app's `index.css`. This places the chip just below the Dynamic Island / notch on iOS, matching where the app's own content starts.

### 7. Account management link opens `me.branam.us` in a new tab

`<a href="https://me.branam.us" target="_blank" rel="noopener noreferrer">`. On iOS PWA, `target="_blank"` opens Safari, which is the correct behavior — the user leaves the PWA to manage their account in a full browser context.

## Risks / Trade-offs

- **Chip overlaps page content in top-right** → Mitigated by `hidden` prop; each app hides it where needed. Chip is small (32–36px circle) and positioned at the very edge.
- **Safe-area value unavailable** → `--sat` falls back to `0px` on non-iOS or desktop; chip renders at top: 6px, which is acceptable.
- **`displayName` null before auth resolves** → Chip is only rendered when `userId !== null` (guarded at App level), so the auth loading phase is already past by the time the chip mounts.
- **client-me already has a logout path** → Redundant but harmless; consistent UX across all apps is worth the minor overlap.

## Migration Plan

1. Backend change ships first (email added to `/me`) — additive, no breaking change to existing callers
2. `@repo/auth` updates ship with the backend (monorepo deploy); `AuthContext` email field is null-safe
3. App shell changes (`<UserChip />`) ship in the same deploy — all 7 apps updated together

No rollback complexity: removing `<UserChip />` from an app shell is a one-line revert per app.

## Open Questions

- Should the chip be hidden automatically on `/login`, `/logout`, and `/beta` routes (which have no NavBar), or does the `userId === null` guard at App level already prevent it from rendering there?
  - Current assumption: the `userId` guard is sufficient since those pages are only shown to unauthenticated users.

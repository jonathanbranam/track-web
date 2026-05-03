## 1. Create `packages/auth` package

- [x] 1.1 Create `packages/auth/package.json` with name `@repo/auth`, mirroring the `@repo/ui` shape (`"main": "./src/index.ts"`, `"exports": { ".": "./src/index.ts" }`)
- [x] 1.2 Add `"packages/auth"` to the `workspaces` array in root `package.json`
- [x] 1.3 Create `packages/auth/src/authApi.ts` with a self-contained `fetchApi` helper and `authApi` object exposing `login`, `logout`, `me`, and `forgot`
- [x] 1.4 Create `packages/auth/src/useAuth.tsx` with `AuthProvider` and `useAuth` hook (extracted from `client-tracker/src/hooks/useAuth.tsx`, importing `authApi` locally)
- [x] 1.5 Create `packages/auth/src/AuthGuard.tsx` with spinner-while-loading and redirect-to-/login-when-unauthenticated logic (extracted from inline `AuthGuard` in `client-tracker/src/App.tsx`)
- [x] 1.6 Create `packages/auth/src/LoginPage.tsx` accepting required `appName: string` and `appIcon: React.ReactNode` props; replace hardcoded "Track" and clock icon with those props
- [x] 1.7 Create `packages/auth/src/BetaPage.tsx` (extracted from `client-tracker/src/pages/BetaPage.tsx`, no changes needed)
- [x] 1.8 Create `packages/auth/src/index.ts` re-exporting `AuthProvider`, `useAuth`, `AuthGuard`, `LoginPage`, `BetaPage`, and `authApi`

## 2. Link workspace

- [x] 2.1 Run `npm install` from the repo root to register `@repo/auth` in the npm workspace

## 3. Migrate `client-tracker` to `@repo/auth`

- [x] 3.1 Add `"@repo/auth": "*"` to `client-tracker/package.json` `dependencies`
- [x] 3.2 Update `client-tracker/src/api.ts`: import `authApi` from `@repo/auth` and replace the local `auth` methods with a re-export (`auth: authApi`)
- [x] 3.3 Update `client-tracker/src/App.tsx`: import `AuthProvider`, `AuthGuard`, `LoginPage`, `BetaPage` from `@repo/auth`; remove the inline `AuthGuard` function; pass `appName="Track"` and the clock SVG as `appIcon` to `LoginPage`
- [x] 3.4 Delete `client-tracker/src/hooks/useAuth.tsx`
- [x] 3.5 Delete `client-tracker/src/pages/LoginPage.tsx`
- [x] 3.6 Delete `client-tracker/src/pages/BetaPage.tsx`
- [x] 3.7 Build tracker to confirm no type errors: `npm run build:tracker`

## 4. Wire up `client-movies` with auth

- [x] 4.1 Add `"@repo/auth": "*"` to `client-movies/package.json` `dependencies`
- [x] 4.2 Create `client-movies/src/App.tsx` with `BrowserRouter` → `AuthProvider` → `AppShell`; `AppShell` wraps `Routes` with `AuthGuard` on `/`; `/login` redirects to `/` if already authenticated; `*` redirects to `/`; initial authenticated view is a placeholder `<h1>Movies</h1>`; pass `appName="Movies"` and a film icon SVG as `appIcon` to `LoginPage`
- [x] 4.3 Update `client-movies/src/main.tsx` to import and render `<App />`
- [x] 4.4 Build movies to confirm no type errors: `npm run build:movies`

## 5. Verify full build

- [x] 5.1 Run `npm run build` from the repo root and confirm all three targets (tracker, movies, server) succeed

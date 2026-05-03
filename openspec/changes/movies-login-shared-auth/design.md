## Context

The monorepo has two frontend clients (`client-tracker`, `client-movies`) and an existing shared package infrastructure (`packages/ui`, `@repo/ui`). The tracker client has a complete auth implementation (login page, BetaPage, `useAuth`/`AuthProvider`, `AuthGuard`, `api.auth`). The movies client is a bare stub. Both clients hit the same backend auth endpoints (`/api/auth/*`) and share the same session cookie.

## Goals / Non-Goals

**Goals:**
- Extract tracker auth code into a new `packages/auth` (`@repo/auth`) workspace package
- Both clients import auth from `@repo/auth` — no duplication
- Movies client has full auth-gated routing identical in behavior to tracker
- LoginPage supports per-app branding (name + icon) via props

**Non-Goals:**
- Changing backend auth behavior or endpoints
- Adding movies-specific API routes or app features beyond the auth shell
- Migrating `packages/ui` — it stays a separate concern

## Decisions

### 1. New `packages/auth` package, not extending `packages/ui`

Auth primitives (context, hooks, API calls) are behavioral, not visual. Mixing them into the UI package would blur the abstraction. A separate `@repo/auth` package mirrors the existing `@repo/ui` pattern and makes the dependency explicit.

**Alternative considered**: Put everything in `packages/ui`. Rejected because auth logic (fetch calls, context state) is not a UI concern.

### 2. Follow the `@repo/ui` package shape exactly

`packages/auth/package.json` uses the same structure as `packages/ui`: `"main": "./src/index.ts"`, `"exports": { ".": "./src/index.ts" }`, no build step — Vite in each consuming client resolves the TypeScript source directly. No separate tsconfig needed in the package itself.

**Alternative considered**: Compile the package separately. Unnecessary complexity for an in-repo package consumed only by Vite clients.

### 3. `LoginPage` accepts `appName: string` and `appIcon: React.ReactNode` props

The only difference between tracker and movies login pages is the header (app name + icon). Passing these as props gives each client its own branding without forking the component. Default values are not provided — both callers must supply them explicitly.

**Alternative considered**: Separate `TrackerLoginPage` / `MoviesLoginPage` components. Defeats sharing; any future change to login behavior requires two edits.

### 4. `api.auth` extracted to `packages/auth`; each client owns its app-specific API

`packages/auth` exports a standalone `authApi` object (login, logout, me, forgot) using a self-contained `fetchApi` helper. Each client's local `api.ts` imports `authApi` and composes it alongside its own domain methods. The client-level `api` object structure stays unchanged from the caller's perspective.

**Alternative considered**: Export a full `createApi` factory from `packages/auth`. Overkill — the auth methods are small and the tracker's entries API is unrelated to auth.

### 5. Add `packages/auth` to root workspace; clients declare it as a dependency

Root `package.json` workspaces array gets `"packages/auth"`. Both `client-tracker/package.json` and `client-movies/package.json` add `"@repo/auth": "*"` under dependencies. This is consistent with how `@repo/ui` would be consumed if it had exports.

### 6. Movies `App.tsx` mirrors tracker structure exactly

Movies gets a `client-movies/src/App.tsx` with `BrowserRouter` → `AuthProvider` → `AppShell` (with `AuthGuard`) — identical pattern to tracker. The initial authenticated view is a placeholder until movies features are built. `main.tsx` is updated to render `<App />`.

## Risks / Trade-offs

- **Tracker regression**: Replacing tracker's local auth imports with `@repo/auth` imports is mechanical but must be done completely — a missed import leaves the old local copy alive. Mitigation: delete the local files after migrating imports so the compiler catches any missed references.
- **LoginPage prop requirement**: Making `appName`/`appIcon` required means any future client must supply them. This is intentional strictness, but worth noting as a small onboarding cost.
- **No build step in packages/auth**: Source is consumed directly by each client's Vite/tsc. This is fine for in-repo packages but means `packages/auth` cannot be published as-is. Not a concern for this self-hosted project.

## Migration Plan

1. Create `packages/auth/` with `package.json` and `src/index.ts` exporting the shared primitives
2. Add `packages/auth` to root workspaces; run `npm install` to link
3. Add `@repo/auth` dependency to `client-tracker/package.json` and `client-movies/package.json`
4. Update tracker to import from `@repo/auth`; delete local copies of migrated files
5. Build and verify tracker is unaffected
6. Wire up `client-movies/src/App.tsx` using `@repo/auth`; update `main.tsx`
7. Build and verify movies client renders login page correctly

Rollback: revert file deletions and re-add local copies to tracker (all changes are local, no backend or data migrations involved).

## Open Questions

- Should the movies `AppShell` spinner and loading state be extracted to `@repo/ui` eventually? Deferred — out of scope for this change.

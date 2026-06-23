## 1. Workspace Scaffold

- [x] 1.1 Create `client-home/` directory with `package.json` (`@repo/home`), `tsconfig.json`, `tsconfig.app.json`, `index.html`, and `vite.config.ts` (port 6050, `/api` proxy to `localhost:3000`), following the structure of `client-admin`
- [x] 1.2 Create `client-home/src/` with `main.tsx`, `App.tsx`, `vite-env.d.ts`, and a `pages/` directory
- [x] 1.3 Run `npm install` from the repo root to register the new workspace

## 2. App Shell

- [x] 2.1 Implement `App.tsx` using `AuthProvider`, `AuthGuard`, `LoginPage` from `@repo/auth` — login route at `/login`, directory at `/`, all other routes redirect to `/`
- [x] 2.2 Add a minimal header with app name and logout button (no bottom NavBar)

## 3. Directory Page

- [x] 3.1 Create `pages/DirectoryPage.tsx` with a static app config array (name, description, url, adminOnly flag, comingSoon flag)
- [x] 3.2 Render a responsive card grid (2-col mobile, 3-col wider) using `useAuth()` to filter admin-only cards when `userId !== 1`
- [x] 3.3 Style coming-soon cards as muted/disabled with no link; all other cards link to their subdomain URL

## 4. Deployment Wiring

- [x] 4.1 Add `home.branam.us` virtual host to `Caddyfile` (static `client-home/dist`, `/api/*` reverse-proxied to backend)
- [x] 4.2 Add `home.branam.us` local mapping to `Caddyfile.local` (port 6050)
- [x] 4.3 Add `build:home` step to `server-deploy.sh`
- [x] 4.4 Add `client-home` dev pane to `dev-local.sh`
- [x] 4.5 Add `build:home` script to root `package.json` and include `client-home` in the root `build` script

## 5. Build Verification

- [x] 5.1 Run `npm run build:home` and confirm zero TypeScript errors and clean output in `client-home/dist/`
- [x] 5.2 Run `npm run build` and confirm all client apps and server build cleanly

## 6. Context Updates

- [x] 6.1 Add `home.branam.us` entry to `llm-context.md` app list
- [x] 6.2 Add `client-home/src/pages/DirectoryPage.tsx` to the CLAUDE.md "Keep in sync" checklist so it stays current when apps are added or removed

## 1. Scaffold the client-talks workspace

- [ ] 1.1 Create `client-talks/package.json` (name `@repo/talks`, private, module type) based on `client-home`'s scripts and dependencies (react 19, react-dom, react-router-dom 7, Tailwind 4, Vite, TypeScript); omit `vite-plugin-pwa`
- [ ] 1.2 Create `client-talks/vite.config.ts` based on `client-home` with `server.port: 6055`, but **remove the `VitePWA` plugin** (no PWA/manifest/service worker)
- [ ] 1.3 Create `client-talks/tsconfig.json` and `client-talks/tsconfig.app.json` copied from `client-home`
- [ ] 1.4 Create `client-talks/index.html`, `client-talks/src/main.tsx`, `client-talks/src/index.css` (Tailwind entry with a standalone public-site style, not the dark app shell), and `client-talks/src/vite-env.d.ts`

## 2. Talk content and pages

- [ ] 2.1 Create `client-talks/src/talks.ts` exporting a typed array of talks (`slug`, `title`, `description`) seeded with "Developing with AI and My Story of Learning to Be an Engineer and Using AI Coding Agents"
- [ ] 2.2 Create the landing page component that maps over the talks array and renders one card per talk (title + short description) linking to `/talks/:slug`, opening in the same tab, using the standalone public-site styling
- [ ] 2.3 Create the per-talk page component that looks up the talk by `slug` and renders its title with a placeholder body ("content coming soon"), and a not-found state for unknown slugs
- [ ] 2.4 Create `client-talks/src/App.tsx` with React Router routes for `/` (landing) and `/talks/:slug` (talk page) plus a not-found fallback

## 3. Build and workspace registration

- [ ] 3.1 Add `client-talks` to the root `package.json` `workspaces` array
- [ ] 3.2 Add a `build:talks` script (`npm run build -w client-talks`) and include `npm run build:talks` in the `build` concurrently command
- [ ] 3.3 Run `npm install` so the new workspace is linked, then `npm run build:talks` to verify the app builds to `client-talks/dist/`

## 4. Deploy and proxy wiring

- [ ] 4.1 Add a `talks.branam.us` virtual host to `Caddyfile`: static `client-talks/dist` SPA with `try_files → index.html` and an explicit `handle /api/* { reverse_proxy localhost:3000 }` block
- [ ] 4.2 Add a `talks-branam-us.duckdns.org:80` → `localhost:6055` mapping to `Caddyfile.local`; run `caddy fmt --overwrite` on both files
- [ ] 4.3 Add the `build:talks` step to `scripts/build-deploy.sh` and `server-deploy.sh`
- [ ] 4.4 Add a `client-talks` dev pane to `dev-local.sh`

## 5. Cross-app surfacing and docs

- [ ] 5.1 Add a Talks card (`talks.branam.us`, "Presentations and talk content") to the `APPS` array in `client-home/src/pages/DirectoryPage.tsx` and update card-count expectations if present
- [ ] 5.2 Update `llm-context.md` to mention the talks app; add any follow-ups to `docs/app/planning.md`

## 6. Verify

- [ ] 6.1 Run `npm run dev -w client-talks`, confirm the landing page lists the seed talk card and the card links to a working talk page at `/talks/:slug`
- [ ] 6.2 Confirm an unknown talk slug renders the not-found state, and `npm run build` builds all apps including talks

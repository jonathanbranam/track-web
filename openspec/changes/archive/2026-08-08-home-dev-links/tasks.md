## 1. Shared dev-ports package

- [x] 1.1 Create the `packages/config` workspace: `package.json` (`@repo/config`, private, `"type": "module"`, `exports` mapping both `"."` → `./src/index.ts` and `"./dev-ports.json"` → `./dev-ports.json`)
- [x] 1.2 Create `packages/config/dev-ports.json` with the current port for every client app: `time` 6010, `watch` 6015, `proto` 6020, `trips` 6025, `play` 6030, `games` 6035, `admin` 6040, `me` 6045, `home` 6050, `talks` 6055
- [x] 1.3 Implement `packages/config/src/index.ts`: re-export the port table and the `getAppUrl(slug, prodUrl)` helper (per `design.md` decision 3 — DEV gate, then localhost/IPv4 port-swap, `*-branam-us.duckdns.org` hostname-swap, else `prodUrl`)
- [x] 1.4 Add `packages/config` to the root `package.json` `workspaces` array

## 2. Wire vite.config.ts to the shared port table

- [x] 2.1 Add `@repo/config` as a dependency in every `client-*/package.json` (time, watch, proto, trips, play, games, admin, me, home, talks)
- [x] 2.2 Update `client-time/vite.config.ts` `server.port` to read `devPorts.time` from `@repo/config/dev-ports.json`
- [x] 2.3 Update `client-watch/vite.config.ts` `server.port` to read `devPorts.watch`
- [x] 2.4 Update `client-proto/vite.config.ts` `server.port` to read `devPorts.proto`
- [x] 2.5 Update `client-trips/vite.config.ts` `server.port` to read `devPorts.trips`
- [x] 2.6 Update `client-play/vite.config.ts` `server.port` to read `devPorts.play`
- [x] 2.7 Update `client-games/vite.config.ts` `server.port` to read `devPorts.games`
- [x] 2.8 Update `client-admin/vite.config.ts` `server.port` to read `devPorts.admin`
- [x] 2.9 Update `client-me/vite.config.ts` `server.port` to read `devPorts.me`
- [x] 2.10 Update `client-home/vite.config.ts` `server.port` to read `devPorts.home`
- [x] 2.11 Update `client-talks/vite.config.ts` `server.port` to read `devPorts.talks`

## 3. DirectoryPage link resolution

- [x] 3.1 Add a `slug` field to each `AppEntry` in `client-home/src/pages/DirectoryPage.tsx` (`time`, `watch`, `trips`, `games`, `me`, `talks`, `food`, `admin`, `proto`)
- [x] 3.2 Replace each card's `href={app.url}` with `href={getAppUrl(app.slug, app.url)}`, importing `getAppUrl` from `@repo/config`
- [x] 3.3 Enable `resolveJsonModule: true` in `client-home/tsconfig.app.json`

## 4. Testing

- [x] 4.1 Add unit tests for `getAppUrl` (vitest) covering: `localhost`, a LAN IP hostname, a `*-branam-us.duckdns.org` hostname, and `import.meta.env.DEV === false` (production passthrough) — including the no-dev-port-entry fallback case
- [x] 4.2 Run `npm test` and confirm all tests, existing and new, pass

## 5. Build and manual verification

- [x] 5.1 Run `npm run build` and confirm every client app and the server build with zero TypeScript errors
- [x] 5.2 Start each `client-*` dev server (individually or via `dev-local.sh`) and confirm each still binds its original, unchanged port
- [x] 5.3 Manually verify `client-home`'s directory cards resolve to the correct dev server address in all three local scenarios: plain `localhost`, a LAN IP, and via `caddy run --config Caddyfile.local` on a `*-branam-us.duckdns.org` hostname (see `local-testing.md`)
- [x] 5.4 Manually verify a production build (`vite build` output, or `vite preview -w client-home`) still shows the original `https://*.branam.us` links, unchanged

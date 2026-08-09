## Context

`client-home`'s `DirectoryPage.tsx` renders a static `APPS` array of `{ name, description, url }`, where `url` is always the production `https://<app>.branam.us` address. There's no existing mechanism for a client app to know or reach another client app's local dev server address.

Dev port numbers already live in two places that must be kept in sync by hand: each `client-*/vite.config.ts`'s `server.port`, and `Caddyfile.local` (which reverse-proxies `<app>-branam-us.duckdns.org` to the matching `localhost:<port>` for phone testing, per `local-testing.md`). The ports form a clean sequence (`time` 6010, `watch` 6015, `proto` 6020, `trips` 6025, `play` 6030, `games` 6035, `admin` 6040, `me` 6045, `home` 6050, `talks` 6055) but nothing enforces that mapping today.

Local dev is reached three distinct ways, and each needs a different link-rewriting strategy:

```
   (1) At the desk              (2) Phone, direct IP        (3) Phone, via local Caddy
   http://localhost:6050        http://10.0.0.113:6050      http://home-branam-us
                                                               .duckdns.org  (port 80)
        │                              │                            │
        ▼                              ▼                            ▼
   vite dev server                same vite dev server,        Caddy.local reverse-
   on the Mac                     reached by LAN IP             proxies to the same
                                  (allowedHosts: true)           vite dev server
```

(1) and (2) are "same host, swap port." (3) is "swap hostname prefix, same port (80, implicit)." Production (`https://home.branam.us`) needs no rewriting at all.

## Goals / Non-Goals

**Goals:**
- Home directory cards link to the correct running dev server, automatically, in all three local-dev access patterns above, with zero manual steps.
- Production behavior is provably unchanged — same URLs, same markup, when not running under the Vite dev server.
- Establish one shared source of truth for per-app dev ports, so adding a new client app updates one file instead of two.

**Non-Goals:**
- Auto-generating `Caddyfile.local` from the shared port table. Caddy's config format can't import JSON without an extra build/templating step, and this file changes rarely (only when a new client app is added) — not worth the added tooling here.
- Auto-detecting whether the target app's dev server is actually running. If you click a card for an app you haven't started, you get a connection error, same as typing the URL by hand today. Out of scope.
- Changing anything about how cards are chosen/filtered (admin-only visibility, coming-soon styling) — only the resolved `href` for the non-disabled cards changes.

## Decisions

### 1. Detection: `import.meta.env.DEV` as the gate, `location.hostname` to pick the strategy

`import.meta.env.DEV` is a Vite compile-time constant — `true` when the bundle was produced by `vite dev`, `false` for `vite build`. It's a more reliable "am I local dev" signal than sniffing the URL alone, because it's set once at build time regardless of which of the three hostnames (localhost / LAN IP / duckdns) happens to be in the address bar, and it's `false` for every production build unconditionally — no hostname pattern can accidentally trigger dev-link behavior in production.

`location.hostname` is only consulted *after* that gate passes, purely to decide which of the two rewrite strategies applies (port-swap vs. hostname-swap) — see Decision 3.

**Alternative considered:** hostname sniffing alone (check if `hostname === 'localhost'`). Rejected — it only covers scenario (1) and does nothing for (2) or (3), which is exactly the case the proposal is scoped to cover (all three).

### 2. Shared port table lives in a new `packages/config` workspace

Following the existing `packages/ui` / `packages/auth` pattern (private workspace, `"main": "./src/index.ts"`, consumed via `@repo/*`), add `packages/config/`:

```
packages/config/
  package.json        # name: "@repo/config"
  dev-ports.json       # { "time": 6010, "watch": 6015, ... }
  src/index.ts          # re-exports dev-ports.json + getAppUrl() helper
```

`package.json` exports both the raw JSON (for `vite.config.ts` files, which run in a plain Node/esbuild context with no browser globals) and the `src/index.ts` module (for browser code, which needs `getAppUrl`):

```json
"exports": {
  ".": "./src/index.ts",
  "./dev-ports.json": "./dev-ports.json"
}
```

**Alternative considered:** a root-level `dev-ports.json` imported by relative path. Rejected — every other cross-app shared file in this repo is a `packages/*` workspace; a root-level import would be the only file crossing a `client-*` package's boundary by relative path instead of package name, breaking the established convention.

### 3. `getAppUrl(slug, prodUrl)` — pure function, three branches

```ts
function getAppUrl(slug: string, prodUrl: string): string {
  if (!import.meta.env.DEV) return prodUrl

  const { hostname, protocol } = window.location
  const port = devPorts[slug]
  if (port === undefined) return prodUrl

  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  if (hostname === 'localhost' || isIPv4) {
    return `${protocol}//${hostname}:${port}`
  }

  const duckdnsMatch = hostname.match(/-branam-us\.duckdns\.org$/)
  if (duckdnsMatch) {
    return `${protocol}//${slug}${duckdnsMatch[0]}`
  }

  return prodUrl
}
```

No React state or effects — it's called directly during render, using `window.location` at click-render time. Each `AppEntry` gains an explicit `slug` field (`'time'`, `'watch'`, …) used both as the `devPorts` key and to build the duckdns hostname, rather than parsing it back out of the `url` string.

The `port === undefined` guard covers apps with no dev server yet (there currently are none without one, but it keeps the function total instead of emitting `localhost:undefined`).

### 4. Close the port-duplication loop: `vite.config.ts` reads from `dev-ports.json` too

Each `client-*/vite.config.ts` changes:

```diff
- server: { port: 6010, ... }
+ server: { port: devPorts.time, ... }
```

Confirmed viable: `vite.config.ts` is never included in any `tsconfig`'s `include` array (checked `tsconfig.json` and `client-home/tsconfig.app.json`) — it's not part of the `tsc -b` build, only loaded directly by Vite's own esbuild-based config loader, which resolves JSON imports natively. No tsconfig changes needed on this side.

This was flagged as an open question in the proposal; resolving it here as **yes** — it's a mechanical, low-risk change (same literal port numbers, just sourced from one place), and it's the entire reason `dev-ports.json` was proposed as a *shared* table rather than a `client-home`-only constant.

**Alternative considered:** leave `vite.config.ts` ports as hardcoded literals, let `dev-ports.json` be a second copy that must be kept in sync by hand alongside them. Rejected — that's strictly worse than today (three copies instead of two: `Caddyfile.local`, each `vite.config.ts`, *and* `dev-ports.json`), and defeats the "single source of truth" goal.

### 5. TypeScript: `resolveJsonModule` needs enabling in `client-home/tsconfig.app.json`

`client-home/tsconfig.app.json` doesn't currently set `resolveJsonModule`. Once `DirectoryPage.tsx` transitively imports `packages/config/dev-ports.json` (via `@repo/config`'s `src/index.ts`), `tsc -b` needs that flag to type-check the import. Root `tsconfig.json` (server-side) already has it set; this just brings `client-home`'s client-side config in line. No other client app's tsconfig needs it, since only `client-home` imports the browser-facing `@repo/config` module — the others only touch `dev-ports.json` from `vite.config.ts`, which isn't type-checked at all.

### 6. Testing

`getAppUrl` is a pure function with no DOM dependency beyond reading `window.location` — straightforward to unit test with `vitest` (already configured at the repo root) by setting `import.meta.env.DEV` and stubbing `window.location` per case: localhost, LAN IP, duckdns hostname, and `DEV: false` (production passthrough). This is the main place automated coverage is worth adding for this change; the visual card-grid rendering is already manually verified per `CLAUDE.md`'s UI-change guidance.

## Risks / Trade-offs

- **[Risk]** Editing every `client-*/vite.config.ts`'s `server.port` is a repo-wide mechanical change — a copy-paste slip could silently change a dev port. → **Mitigation:** keep every literal port number identical to today (no renumbering), and manually start each dev server after the change to confirm it still binds its historical port.
- **[Risk]** The IPv4-literal regex is a broad match (`\d{1,3}(\.\d{1,3}){3}`) — technically valid for any dotted-quad, not just LAN addresses. → **Mitigation:** irrelevant in practice, since this branch is only reachable when `import.meta.env.DEV` is `true`; no production build can ever reach it regardless of what hostname serves it.
- **[Risk]** If a future client app is added to `DirectoryPage.tsx`'s `APPS` list before its `dev-ports.json` entry exists, `getAppUrl` would fall back to `prodUrl` silently rather than erroring. → **Mitigation:** acceptable — it degrades to today's exact behavior (link to production) rather than breaking, and `Food` (coming-soon, no client app yet) already exercises this path today via the disabled-card branch, not `getAppUrl` at all.

## Migration Plan

1. Create `packages/config` (`package.json`, `dev-ports.json`, `src/index.ts` with `getAppUrl` + re-exported port map); add it to the root `workspaces` array.
2. Add `@repo/config` as a dependency of `client-home`, and of every other `client-*` app (for the `vite.config.ts` port import).
3. Enable `resolveJsonModule` in `client-home/tsconfig.app.json`.
4. Update `DirectoryPage.tsx`: add `slug` to each `AppEntry`, replace the raw `app.url` href with `getAppUrl(app.slug, app.url)`.
5. Update each `client-*/vite.config.ts` to source `server.port` from `@repo/config/dev-ports.json` instead of a literal.
6. Manually verify all three dev scenarios (`localhost`, LAN IP, duckdns via `caddy run --config Caddyfile.local`) plus a production build (`vite build` + inspect output, or `vite preview`) to confirm links are unchanged there.

No data migration, no backend involvement, no deploy-order dependency — a straight revert undoes the whole change if needed.

## Open Questions

None outstanding. Package name resolved as `packages/config`, consistent with the broad naming of `packages/ui` / `packages/auth`.

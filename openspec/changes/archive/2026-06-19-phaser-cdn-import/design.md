## Context

`client-games` currently bundles Phaser (`^3.88.2`) directly via Vite/Rollup. `PhaserGame.tsx` imports `Phaser` from `'phaser'`, which Rollup includes in full (~1MB+ minified). Minification is CPU-bound; on a small EC2 instance this is the dominant cost of the games client build.

The fix is to declare `phaser` as an external module in Vite's Rollup config and load it at runtime via a `<script>` CDN tag in `index.html`. The TypeScript types stay in `node_modules` (dev-only) and the import syntax in source files is unchanged.

## Goals / Non-Goals

**Goals:**
- Remove Phaser from the Vite bundle output, eliminating its minification cost
- Load Phaser at runtime from a CDN `<script>` tag before React boots
- Keep all existing game code (`PhaserGame.tsx`, scenes) unchanged

**Non-Goals:**
- Changing any game logic or scene behavior
- Adding a local fallback CDN (out of scope for a single-user self-hosted app)
- Migrating away from Phaser or changing the Phaser version

## Decisions

### 1. CDN source: jsDelivr

Use `https://cdn.jsdelivr.net/npm/phaser@3.88.2/dist/phaser.min.js`.

**Rationale:** jsDelivr is widely used, serves from npm directly, and supports HTTPS with versioned paths. Pinning the exact version prevents unexpected changes from CDN-served semver ranges.

**Alternative considered:** `unpkg.com` — functionally equivalent, jsDelivr preferred for its broader PoP coverage and explicit SRI support.

### 2. Vite externals + Rollup globals

```ts
build: {
  rollupOptions: {
    external: ['phaser'],
    output: { globals: { phaser: 'Phaser' } }
  }
}
```

**Rationale:** This is the standard Vite/Rollup pattern for browser globals. When Rollup sees `import Phaser from 'phaser'`, it rewrites it to `const Phaser = globalThis.Phaser` (the global the CDN script exposes). No source changes required.

### 3. Pin exact version on CDN

Use `phaser@3.88.2` on the CDN URL, not a range. The `package.json` devDependency can stay as `^3.88.2` for types.

**Rationale:** npm ranges on CDN URLs can resolve to different versions as new releases publish. Exact pinning ensures the bundled types and runtime binary stay in sync.

## Risks / Trade-offs

- **CDN availability** → For a self-hosted personal app, jsDelivr downtime is acceptable risk; games simply won't load. No mitigation needed.
- **Version drift** (package.json vs CDN URL) → Must update both together when upgrading Phaser. The CDN URL in `index.html` is the authoritative version; update `package.json` devDep to match.
- **CSP headers** → If a Content-Security-Policy header is ever added, `cdn.jsdelivr.net` must be in `script-src`. Not applicable today (no CSP configured).

## Migration Plan

1. Add `<script>` CDN tag to `client-games/index.html` (before `<script type="module">`)
2. Add `rollupOptions.external` and `output.globals` to `client-games/vite.config.ts`
3. Verify local `npm run dev` for games still works (Vite dev server doesn't bundle externals either; the CDN tag loads Phaser in browser)
4. Build and verify `client-games/dist/` no longer contains Phaser source
5. Deploy; confirm games load on production

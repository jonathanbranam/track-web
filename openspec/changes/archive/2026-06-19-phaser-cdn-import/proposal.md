## Why

Building `client-games` on the EC2 server is slow because Phaser (~1MB+) is bundled and minified as part of the Vite build — a CPU-bound operation that is painful on small instances. Loading Phaser from a CDN eliminates it from the bundle entirely, making builds dramatically faster with no change to runtime behavior.

## What Changes

- Externalize `phaser` in `client-games/vite.config.ts` via `rollupOptions.external` and `rollupOptions.output.globals`
- Add a `<script>` CDN tag for Phaser to `client-games/index.html` so it loads at runtime
- Remove `phaser` from the bundled output (it will no longer appear in `client-games/dist/`)

## Capabilities

### New Capabilities

_None — this is a build infrastructure change with no new user-facing capabilities._

### Modified Capabilities

_None — no spec-level behavioral requirements change. Phaser games continue to work identically at runtime._

## Impact

- **Files changed**: `client-games/vite.config.ts`, `client-games/index.html`
- **Build output**: `phaser` removed from the JS bundle; loaded from CDN at runtime instead
- **Dependencies**: Adds a CDN dependency on `cdn.jsdelivr.net` (or similar) for Phaser at runtime
- **CI/deploy**: Faster `npm run build` on the EC2 server for the games client
- **No API, data, or auth changes**

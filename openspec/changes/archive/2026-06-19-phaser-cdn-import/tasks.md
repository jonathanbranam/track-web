## 1. Update index.html

- [x] 1.1 Add `<script src="https://cdn.jsdelivr.net/npm/phaser@3.88.2/dist/phaser.min.js"></script>` to `client-games/index.html` before the `<script type="module">` entry point

## 2. Update Vite config

- [x] 2.1 Add `rollupOptions.external: ['phaser']` and `rollupOptions.output.globals: { phaser: 'Phaser' }` to the `build` section of `client-games/vite.config.ts`

## 3. Verify

- [x] 3.1 Run `npm run dev` and confirm the games app loads in the browser and Phaser games function correctly
- [x] 3.2 Run `npm run build:games` (or equivalent) and confirm the `client-games/dist/` output does not contain a Phaser chunk
- [x] 3.3 Confirm zero TypeScript errors in `client-games/` after the change

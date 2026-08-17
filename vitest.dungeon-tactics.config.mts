import { defineConfig } from 'vitest/config'
import { quickpickle } from 'quickpickle'

// Dedicated Vitest config for dungeon-tactics-solo's Gherkin `.feature`
// tests, kept out of the shared root `vitest.config.mts`/`npm test` so every
// other workspace's tests don't pay for importing quickpickle's Cucumber
// parsing/expression libraries. Run via `npm run test:dungeon-tactics` —
// only needed when working on the dungeon-tactics game. See
// `client-games/src/games/dungeon-tactics-solo/features/README.md`.
export default defineConfig({
  plugins: [quickpickle()],
  test: {
    environment: 'node',
    include: ['client-games/src/games/dungeon-tactics-solo/features/*.feature'],
    setupFiles: ['./client-games/src/games/dungeon-tactics-solo/features/steps/index.ts'],
  },
})

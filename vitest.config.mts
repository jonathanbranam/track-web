import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'client-watch/src/**/*.test.ts', 'client-games/src/**/*.test.ts', 'client-trips/src/**/*.test.ts', 'client-play/src/**/*.test.ts', 'client-talks/src/**/*.test.ts'],
    env: {
      SESSION_SECRET: 'test-secret',
    },
  },
})

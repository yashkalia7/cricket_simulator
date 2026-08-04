import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /*
     * `node` and not `jsdom`. If a test in this package ever needs a DOM, the
     * thing under test does not belong in packages/domain.
     */
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});

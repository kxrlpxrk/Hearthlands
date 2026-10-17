import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    // Full-map generation is CPU-bound; avoid competing suites on small CI runners.
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 10_000,
  },
});

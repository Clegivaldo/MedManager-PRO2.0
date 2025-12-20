import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    setupFiles: ['test/setup.ts'],
    environment: 'node',
    clearMocks: true,
    testTimeout: 60000,
    include: ['src/tests/**/*.test.ts', 'test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
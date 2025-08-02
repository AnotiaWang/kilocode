import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test-helpers/**',
        '**/types/**',
        '**/__mocks__/**',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.json'],
  },
});
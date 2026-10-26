import { defineConfig } from 'vitest/config';

// Runs only against the Firestore emulator: npm run test:rules
export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});

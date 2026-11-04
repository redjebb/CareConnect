import { defineConfig } from '@playwright/test';

// End-to-end tests run against `npm run demo`: local Firebase emulators with
// seeded fake data and the real security rules.
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run demo',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 180_000
  }
});

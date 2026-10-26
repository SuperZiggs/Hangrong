import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['json', { outputFile: process.env.ACCEPTANCE_REPORT_FILE ?? 'test-results/acceptance-results.json' }]],
  outputDir: process.env.ACCEPTANCE_ARTIFACT_DIR ?? 'test-results/artifacts',
  use: {
    baseURL: process.env.ACCEPTANCE_BASE_URL ?? 'http://127.0.0.1:5187',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'browser', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
});

import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: /hosting\.spec\.ts/,
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 8000 },
  reporter: [['list'], ['json', { outputFile: resolve('test-results/hosting-acceptance-results.json') }]],
  outputDir: '../../test-results/hosting-acceptance-artifacts',
  use: { baseURL: 'http://127.0.0.1:5206', trace: 'retain-on-failure', ...devices['Desktop Chrome'], channel: 'chrome' },
});

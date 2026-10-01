import {defineConfig, devices} from '@playwright/test';
import {chromiumExecutable} from './scripts/prepare-chromium.mjs';

const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/__screenshots__',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', {open: 'never', outputFolder: 'playwright-report'}]]
    : 'list',
  timeout: 60_000,
  expect: {toHaveScreenshot: {maxDiffPixelRatio: 0.015, timeout: 20_000}},
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    reducedMotion: 'no-preference',
    launchOptions: {
      executablePath: chromiumExecutable,
    },
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command:
          'node scripts/write-e2e-env.mjs && CI=1 SHOPIFY_CLI_NO_ANALYTICS=1 npx shopify hydrogen dev --env-file .env.e2e --host --port 3000 --disable-version-check',
        url: `${baseURL}/health.json`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
});

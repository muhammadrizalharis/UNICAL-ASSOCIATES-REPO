import { defineConfig, devices } from '@playwright/test';

/**
 * Uji UI end-to-end terhadap stack Docker yang berjalan (nginx :48080).
 *
 * Jalankan: lihat docs/pengujian-ui.md
 * Kredensial akun QA dipasok lewat env E2E_QA_EMAIL / E2E_QA_PASSWORD.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/output',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'e2e/report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:48080',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'id-ID',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

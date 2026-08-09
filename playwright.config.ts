import { defineConfig, devices } from '@playwright/test'

const isDirectedSesionesRun = process.argv.some((argument) =>
  /(?:^|[\\/])sesiones-ejecucion\.spec\.ts$/.test(argument),
)

const externalE2EBaseUrl = process.env.E2E_BASE_URL
const baseURL = externalE2EBaseUrl ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Las sesiones se autentican por página y no necesitan la fixture de clonación.
  globalSetup: isDirectedSesionesRun ? undefined : './e2e/support/clone-auth.ts',
  globalTeardown: './e2e/support/clone-global-teardown.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: externalE2EBaseUrl ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})

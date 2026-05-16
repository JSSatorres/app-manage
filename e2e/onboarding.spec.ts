import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'juansataz.devaws@gmail.com'
const TEST_PASSWORD = 'Lamala123'
const BASE_URL = 'http://localhost:3000'

test('Onboarding o dashboard: tras login siempre llega al panel', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Contraseña').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /^Entrar$/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  await page.screenshot({ path: 'test-results/onboarding-01-after-login.png' })

  const needsOnboarding = await page.getByRole('heading', { name: 'Bienvenido a SportApp' }).isVisible()

  if (needsOnboarding) {
    // Flujo onboarding: sin workspace previo
    await expect(page.getByText('Empieza creando tu club')).toBeVisible()
    await page.screenshot({ path: 'test-results/onboarding-02-form-visible.png' })

    await page.getByLabel('Nombre del club').fill('Club Atlético Test')
    await page.screenshot({ path: 'test-results/onboarding-03-filled.png' })

    await page.getByRole('button', { name: /Crear mi club/i }).click()
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/onboarding-04-after-create.png' })

    // Tras crear el club, debe desaparecer el form de onboarding
    await expect(page.getByRole('heading', { name: 'Bienvenido a SportApp' })).not.toBeVisible({ timeout: 10000 })
  }

  // En ambos casos debe mostrarse el dashboard con workspace activo
  await page.screenshot({ path: 'test-results/onboarding-05-dashboard.png' })
  await expect(page.getByRole('heading', { name: 'Panel de rendimiento' })).toBeVisible({ timeout: 10000 })
})

import { test, expect } from '@playwright/test'

test.describe('Navegación', () => {
  test('debería redirigir de / a /login sin sesión', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('debería tener el footer', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('footer')).toBeAttached()
  })
})

test.describe('Responsive', () => {
  test('debería funcionar en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/login')

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('debería mostrar el formulario de login en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
  })
})

test.describe('Accesibilidad', () => {
  test('debería tener lang="es" en html', async ({ page }) => {
    await page.goto('/login')

    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'es')
  })

  test('no debería tener errores de consola críticos en login', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('manifest') &&
        !e.includes('404') &&
        !e.includes('supabase') &&
        !e.includes('NEXT_PUBLIC')
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test('los inputs deberían tener labels asociados', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.getByLabel('Email')
    const passwordInput = page.getByLabel('Password')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })
})

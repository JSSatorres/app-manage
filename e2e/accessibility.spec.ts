import { test, expect, Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Navegación', () => {
  test('debería navegar a login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /login/i })
    await loginLink.click()
    
    await expect(page).toHaveURL(/\/login/)
  })

  test('debería tener el footer', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible()
  })
})

test.describe('Responsive', () => {
  test('debería funcionar en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Accesibilidad', () => {
  test('debería tenerlang en html', async ({ page }) => {
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'es')
  })

  test('no debería tener errores de consola críticos', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('manifest') &&
      !e.includes('404')
    )
    
    expect(criticalErrors).toHaveLength(0)
  })
})

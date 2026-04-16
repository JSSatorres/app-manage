import { test, expect } from '@playwright/test'

test.describe('Página Principal', () => {
  test('debería cargar la página principal', async ({ page }) => {
    await page.goto('/')
    
    await expect(page).toHaveTitle(/Manage Sport/)
  })

  test('debería mostrar el nombre de la app', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('body')).toContainText('Manage Sport')
  })
})

test.describe('Login', () => {
  test('debería mostrar el formulario de login', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
  })

  test('debería mostrar errores de validación', async ({ page }) => {
    await page.goto('/login')
    
    const submitButton = page.getByRole('button', { name: /entrar/i })
    await submitButton.click()
    
    await expect(page.locator('text=/requerido/i')).toBeVisible()
  })
})

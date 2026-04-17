import { test, expect } from '@playwright/test'

test.describe('Página Principal', () => {
  test('debería cargar la página principal', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Manage Sport/)
  })

  test('debería redirigir al login cuando no hay sesión', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Login', () => {
  test('debería mostrar el formulario de login', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('debería mostrar los campos de email y password', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('debería tener el botón de entrar deshabilitado con campos vacíos', async ({ page }) => {
    await page.goto('/login')

    const submitButton = page.getByRole('button', { name: /^Entrar$/i })
    await expect(submitButton).toBeDisabled()
  })

  test('debería habilitar el botón de entrar con credenciales válidas', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('test@test.com')
    await page.getByLabel('Password').fill('password123')

    const submitButton = page.getByRole('button', { name: /^Entrar$/i })
    await expect(submitButton).toBeEnabled()
  })

  test('debería mostrar botón de Google', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: /continuar con google/i })).toBeVisible()
  })

  test('debería mostrar botón de crear cuenta', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible()
  })
})

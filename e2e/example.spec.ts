import { test, expect } from '@playwright/test'
import {
  getE2EAuthCredentials,
  hasE2EAuthCredentials,
  missingE2EAuthCredentialsReason,
} from './support/auth'

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
    await expect(page.getByLabel('Contraseña')).toBeVisible()
  })

  test('debería tener el botón de entrar deshabilitado con campos vacíos', async ({ page }) => {
    await page.goto('/login')

    const submitButton = page.getByRole('button', { name: /^Entrar$/i })
    await expect(submitButton).toBeDisabled()
  })

  test('debería habilitar el botón de entrar con credenciales válidas', async ({ page }) => {
    test.skip(!hasE2EAuthCredentials, missingE2EAuthCredentialsReason)
    const { email, password } = getE2EAuthCredentials()
    await page.goto('/login')

    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña').fill(password)

    const submitButton = page.getByRole('button', { name: /^Entrar$/i })
    await expect(submitButton).toBeEnabled()
  })

  test('debería mostrar botón de Google', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: /continuar con google/i })).toBeVisible()
  })

  test('debería mostrar botón de crear cuenta', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: /unirme a la lista de espera/i })).toBeVisible()
  })
})

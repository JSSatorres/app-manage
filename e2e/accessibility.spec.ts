import { test, expect } from '@playwright/test'
import {
  E2E_BASE_URL,
  hasE2EAuthCredentials,
  loginAsE2ETestUser,
  missingE2EAuthCredentialsReason,
} from './support/auth'

const VERCEL_ANALYTICS_DEBUG_SCRIPT = 'https://va.vercel-scripts.com/v1/script.debug.js'

function isSandboxBlockedVercelAnalyticsRequest({
  error,
  url,
}: {
  error: string | undefined
  url: string
}) {
  return error === 'net::ERR_NETWORK_ACCESS_DENIED' && url === VERCEL_ANALYTICS_DEBUG_SCRIPT
}

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
    const failedRequests: Array<{ error: string | undefined; url: string }> = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    page.on('requestfailed', (request) => {
      failedRequests.push({
        error: request.failure()?.errorText,
        url: request.url(),
      })
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const expectedNetworkBlocks = failedRequests.filter(isSandboxBlockedVercelAnalyticsRequest)
    const unexpectedFailedRequests = failedRequests.filter(
      (request) => !isSandboxBlockedVercelAnalyticsRequest(request),
    )
    let ignoredExpectedNetworkErrorCount = 0
    const criticalErrors = errors.filter((error) => {
      if (
        error === 'Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED' &&
        ignoredExpectedNetworkErrorCount < expectedNetworkBlocks.length
      ) {
        ignoredExpectedNetworkErrorCount += 1
        return false
      }

      return (
        !error.includes('favicon') &&
        !error.includes('manifest') &&
        !error.includes('404') &&
        !error.includes('supabase') &&
        !error.includes('NEXT_PUBLIC')
      )
    })

    expect([...criticalErrors, ...unexpectedFailedRequests]).toHaveLength(0)
  })

  test('los inputs deberían tener labels asociados', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.getByLabel('Email')
    const passwordInput = page.getByLabel('Contraseña')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })
})

// Task 3.2 — FormField (label htmlFor/id) y DataTable (roles ARIA).
test.describe('Accesibilidad — FormField y DataTable (Task 3.2)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasE2EAuthCredentials, missingE2EAuthCredentialsReason)
    await loginAsE2ETestUser(page)
  })

  test('FormField: el label del formulario de entrenador está asociado al input por htmlFor/id', async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/entrenadores`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /^nuevo$/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const nombreLabel = dialog.locator('label', { hasText: 'Nombre' }).first()
    await expect(nombreLabel).toBeVisible()

    const forAttr = await nombreLabel.getAttribute('for')
    expect(forAttr).toBeTruthy()

    const nombreInput = dialog.getByLabel('Nombre')
    await expect(nombreInput).toBeVisible()
    await expect(nombreInput).toHaveAttribute('id', forAttr!)

    // getByLabel confirma la asociación programática para el resto de campos
    // simples del form (misma FormField compartida). "Nombre" es `required`
    // (el label incluye "*" en el nombre accesible, de ahí el match parcial).
    await expect(dialog.getByLabel('Apellidos')).toBeVisible()
    await expect(dialog.getByLabel('Email', { exact: true })).toBeVisible()
  })

  test('DataTable: la tabla de entrenadores expone semántica y roles ARIA', async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/entrenadores`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('table')).toBeVisible()

    const nombreHeader = page.getByRole('columnheader', { name: /nombre/i })
    await expect(nombreHeader).toBeVisible()
    await expect(nombreHeader).toHaveAttribute('aria-sort', 'none')

    await nombreHeader.getByRole('button').click()
    await expect(nombreHeader).toHaveAttribute('aria-sort', 'ascending')

    const searchInput = page.getByRole('textbox', { name: /buscar/i })
    await expect(searchInput).toBeVisible()
  })
})

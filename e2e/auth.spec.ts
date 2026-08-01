import { test, expect, Page } from '@playwright/test'

/**
 * Task 4.3 — E2E de logout y callback OAuth.
 *
 * Reconocimiento (`docs/plans/2026-07-12-auditoria-estado-y-roadmap.md`, Task 4.3): el auth de
 * este proyecto es 100% client-side. La sesión la gestiona `@supabase/supabase-js`
 * (`persistSession: true`) guardándola en `localStorage` bajo la clave
 * `sb-<project-ref>-auth-token` (`src/services/supabase.ts`). NO existe `middleware.ts`
 * (Task 0.4, diferida): `/dashboard/*` solo se protege con `AuthGate`
 * (`src/components/auth/AuthGate.tsx`), que redirige a `/login` tras montar en el cliente y
 * comprobar `useAuth().session`. Estos tests verifican ese comportamiento REAL — el layout llega
 * a servirse y solo después se redirige — no el 307 server-side que tendría un middleware.
 */

const TEST_EMAIL = 'juansataz.devaws@gmail.com'
const TEST_PASSWORD = 'Lamala123'
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Contraseña').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /^Entrar$/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  await page.waitForLoadState('networkidle')
}

/** ¿Hay un token de sesión de Supabase persistido en `localStorage`? */
async function hasSupabaseAuthToken(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Object.keys(window.localStorage).some(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token') && !!window.localStorage.getItem(key),
    ),
  )
}

test.describe('Registro público cerrado', () => {
  test('redirige la ruta de alta y el CTA del login a la lista de espera', async ({ page }) => {
    await page.goto(`${BASE_URL}/register?invite=token-antiguo`)
    await page.waitForURL((url) => url.pathname === '/landing' && url.hash === '#lista-espera')
    await expect(page.getByLabel('Correo electrónico')).toBeVisible()

    await page.goto(`${BASE_URL}/login`)
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible()
    await page.getByRole('button', { name: 'Unirme a la lista de espera' }).click()

    await page.waitForURL((url) => url.pathname === '/landing' && url.hash === '#lista-espera')
    await expect(page.getByLabel('Correo electrónico')).toBeVisible()
  })
})

test.describe('Logout', () => {
  // El botón "Menú de usuario" (con logout) solo existe en el `TopBar` de escritorio
  // (`src/components/shared/TopBar.tsx`); en móvil el logout vive en la hoja "Más" de
  // `BottomNav` (`src/components/shared/BottomNav.tsx`), un flujo de UI distinto. Forzamos
  // viewport desktop para que el test sea el mismo en cualquier proyecto de Playwright.
  test.use({ viewport: { width: 1280, height: 800 } })

  test('cierra sesión, limpia el token de Supabase de localStorage y vuelve a proteger /dashboard', async ({ page }) => {
    await login(page)

    // Tras login la sesión queda persistida en localStorage (comportamiento client-side).
    expect(await hasSupabaseAuthToken(page)).toBe(true)

    await page.getByRole('button', { name: /menú de usuario/i }).click()
    await page.getByRole('menuitem', { name: /cerrar sesión/i }).click()

    await page.waitForURL(/\/login/, { timeout: 10000 })

    // El token de sesión de Supabase debe haber desaparecido de localStorage tras signOut().
    expect(await hasSupabaseAuthToken(page)).toBe(false)

    // Comportamiento REAL sin middleware server-side (Task 0.4 diferida): navegar directamente
    // a /dashboard sin sesión redirige a /login vía `AuthGate` (client-side, tras montar).
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('Callback OAuth (/auth/callback)', () => {
  // src/app/auth/callback/page.tsx: sin sesión activa tras `getSession()`, muestra un mensaje
  // de error y redirige a /login. No se prueba el flujo OAuth real (requiere credenciales de
  // Google no disponibles en este entorno de test) — se cubre que la página no crashea y
  // resuelve el caso de código ausente/inválido sin dejar al usuario en una pantalla rota.
  test('sin código ni sesión activa: no crashea y redirige a /login', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto(`${BASE_URL}/auth/callback`)
    await page.waitForURL(/\/login/, { timeout: 15000 })

    expect(pageErrors).toHaveLength(0)
  })

  test('con un código inválido: no crashea y termina redirigiendo a /login', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto(`${BASE_URL}/auth/callback?code=invalid-test-code-000`)
    await page.waitForURL(/\/login/, { timeout: 15000 })

    expect(pageErrors).toHaveLength(0)
  })
})

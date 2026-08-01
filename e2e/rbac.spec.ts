import { test, expect, Page, Locator } from '@playwright/test'

/**
 * Task 4.3 — E2E de RBAC (módulo Usuarios).
 *
 * Reconocimiento (`docs/plans/2026-07-12-auditoria-estado-y-roadmap.md`, Task 4.3):
 * - El rol canónico vive en `workspace_members.role` y se expone como `rol` en
 *   `useWorkspaceContext()` (`src/lib/workspaceContext.tsx`).
 * - La matriz de permisos vive en `src/lib/permisos.ts` (`can(rol, recurso, accion)`). Para el
 *   recurso `usuarios`: `view` = superadmin/admin/gerente_sede (el rol `entrenador` NO puede ni
 *   ver la sección) y `mutate` = solo superadmin/admin.
 * - La UI aplica ese gate en dos sitios: `RequireRol` (`src/components/shared/RequireRol.tsx`,
 *   usado por `src/app/(dashboard)/usuarios/page.tsx`) muestra "No tienes acceso" si el rol no
 *   tiene `view`; y `AppSidebar` (`src/components/shared/AppSidebar.tsx`) oculta el botón de
 *   navegación "Usuarios" del menú lateral con el mismo `can(...)`.
 * - No existe middleware server-side (Task 0.4, diferida): el gate de RBAC es 100% client-side,
 *   estos tests verifican ese comportamiento REAL (se sirve el layout y luego se oculta/deniega
 *   en el cliente), no una respuesta 403/redirect de servidor.
 *
 * Mecanismo de test con un único usuario de test (`TEST_USER_EMAIL`/`TEST_USER_PASSWORD` en
 * `.env.local`): no hay credenciales de un segundo usuario con rol distinto en este entorno,
 * pero el usuario de test pertenece a **dos workspaces con roles distintos** (verificado vía la
 * API de Supabase el 12/07/2026):
 *   - "Club Atlético Test" → rol `admin`       (workspace activo por defecto: alfabéticamente
 *     primero, sin nada en `localStorage`)
 *   - "liones der"         → rol `entrenador`
 * Cambiando de club activo desde el selector "Club" del TopBar (`SedeSwitcher`,
 * `src/components/shared/SedeSwitcher.tsx`) se prueba el gate RBAC real con un rol no-admin, sin
 * necesitar credenciales adicionales. Si esta membresía cambia (por ejemplo, si el usuario de
 * test deja de pertenecer a un segundo workspace), el test se salta con `test.skip` en vez de
 * fallar en falso o dar una falsa sensación de cobertura.
 */

const TEST_EMAIL = 'juansataz.devaws@gmail.com'
const TEST_PASSWORD = 'Lamala123'
const BASE_URL = 'http://localhost:3000'

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Contraseña').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /^Entrar$/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  await page.waitForLoadState('networkidle')
}

/** Trigger visible del selector "Club" en el TopBar (`SedeSwitcher`). Forzamos un viewport
 *  desktop en el describe para que sea siempre el TopBar -y no la cabecera móvil, que monta el
 *  mismo componente oculto con `md:hidden`- el único visible en cualquier proyecto de Playwright. */
function clubSwitcherTrigger(page: Page): Locator {
  return page.locator('[data-slot="select-trigger"]:visible').filter({ hasText: 'Club' }).first()
}

/**
 * Cambia el club activo a uno distinto del actual (si el usuario de test pertenece a más de
 * uno). Devuelve `false` si solo hay un club disponible: en ese caso no se puede probar RBAC
 * entre roles distintos sin credenciales de un segundo usuario.
 */
async function switchToOtherClub(page: Page): Promise<boolean> {
  const trigger = clubSwitcherTrigger(page)
  // El selector "Club" solo se monta cuando `useWorkspaceContext().ready` es `true`: el
  // bootstrap (perfil + memberships + sedes) sigue en marcha justo después del login.
  const appeared = await trigger
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false)
  if (!appeared) return false

  const currentClub = (await trigger.innerText()).replace(/^CLUB\s*/i, '').trim()
  await trigger.click()

  const options = page.getByRole('option')
  // El popup del Select anima su apertura: esperamos a que al menos una opción sea visible
  // antes de contar (si no, `.count()` puede leer el DOM justo antes de que se monte el popup).
  await options.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
  const count = await options.count()
  if (count < 2) {
    await page.keyboard.press('Escape')
    return false
  }

  for (let i = 0; i < count; i++) {
    const option = options.nth(i)
    const text = (await option.innerText()).trim()
    if (text !== currentClub) {
      await option.click()
      await page.waitForTimeout(300)
      return true
    }
  }
  await page.keyboard.press('Escape')
  return false
}

test.describe('RBAC — Usuarios', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('control positivo: con rol admin (club por defecto) ve Usuarios y puede invitar', async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/usuarios`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /añadir usuario/i })).toBeVisible()
  })

  test('con rol entrenador (otro club) NO puede ver ni crear/editar/eliminar usuarios', async ({ page }) => {
    await login(page)

    const switched = await switchToOtherClub(page)
    test.skip(
      !switched,
      'El usuario de test solo tiene un club disponible en este entorno: no se puede probar RBAC entre roles distintos cambiando de club.',
    )

    // El botón de navegación "Usuarios" desaparece del menú lateral para un rol sin permiso de vista.
    await expect(page.getByRole('button', { name: 'Usuarios', exact: true })).toHaveCount(0)

    // Navegación directa a /usuarios: el gate `RequireRol` bloquea la vista completa (no solo
    // el botón de crear), que es el comportamiento real sin middleware server-side.
    await page.goto(`${BASE_URL}/usuarios`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'No tienes acceso' })).toBeVisible()
    await expect(page.getByText('Tu rol no tiene permisos para ver esta sección.')).toBeVisible()
    await expect(page.getByRole('button', { name: /añadir usuario/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Usuarios', exact: true })).toHaveCount(0)

    await page.screenshot({ path: 'test-results/rbac-usuarios-entrenador-denegado.png' })
  })
})

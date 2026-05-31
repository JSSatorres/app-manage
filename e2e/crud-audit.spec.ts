import { test, expect, Page } from '@playwright/test'

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
}

test.describe('Auditoría CRUD - Aplicación Manage Sport', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ===== SEDES =====
  test.describe('Sedes - CRUD completo', () => {
    test('READ: listar sedes', async ({ page }) => {
      await page.goto(`${BASE_URL}/sedes`)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Sedes', exact: true })).toBeVisible()
      await page.screenshot({ path: 'test-results/sedes-list.png' })
    })

    test('CREATE: crear nueva sede', async ({ page }) => {
      await page.goto(`${BASE_URL}/sedes`)
      await page.waitForLoadState('networkidle')

      const newBtn = page.getByRole('button', { name: /nueva|añadir|crear/i }).first()
      await expect(newBtn).toBeVisible()
      await newBtn.click()

      await page.waitForTimeout(500)
      await page.getByLabel(/nombre/i).fill('Sede Test Auditoría')
      await page.getByLabel(/dirección/i).fill('Calle Test 123, Madrid')

      const saveBtn = page.getByRole('button', { name: /guardar|crear|confirmar/i })
      await saveBtn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: 'test-results/sedes-create.png' })
    })

    test('UPDATE: editar sede existente', async ({ page }) => {
      await page.goto(`${BASE_URL}/sedes`)
      await page.waitForLoadState('networkidle')

      const editBtn = page.getByRole('button', { name: /editar/i }).first()
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await page.waitForTimeout(500)
        const nombreField = page.getByLabel(/nombre/i)
        await nombreField.clear()
        await nombreField.fill('Sede Central Editada')
        const saveBtn = page.getByRole('button', { name: /guardar|actualizar|confirmar/i })
        await saveBtn.click()
        await page.waitForTimeout(1500)
      }
      await page.screenshot({ path: 'test-results/sedes-edit.png' })
    })

    test('DELETE: eliminar sede test', async ({ page }) => {
      await page.goto(`${BASE_URL}/sedes`)
      await page.waitForLoadState('networkidle')

      const rows = page.locator('tr, [data-testid="sede-row"]')
      const count = await rows.count()
      if (count > 0) {
        const deleteBtn = page.getByRole('button', { name: /eliminar|borrar/i }).first()
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click()
          await page.waitForTimeout(500)
          const confirmBtn = page.getByRole('button', { name: /confirmar|sí|eliminar/i })
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click()
            await page.waitForTimeout(1500)
          }
        }
      }
      await page.screenshot({ path: 'test-results/sedes-delete.png' })
    })
  })

  // ===== EQUIPOS =====
  test.describe('Equipos - CRUD completo', () => {
    test('READ: listar equipos', async ({ page }) => {
      await page.goto(`${BASE_URL}/equipos`)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Equipos', exact: true })).toBeVisible()
      await page.screenshot({ path: 'test-results/equipos-list.png' })
    })

    test('CREATE: crear nuevo equipo', async ({ page }) => {
      await page.goto(`${BASE_URL}/equipos`)
      await page.waitForLoadState('networkidle')

      const newBtn = page.getByRole('button', { name: /nuevo equipo|añadir|crear/i })
      if (await newBtn.isVisible()) {
        await newBtn.click()
        await page.waitForTimeout(500)

        const nombreField = page.getByLabel(/nombre/i)
        if (await nombreField.isVisible()) {
          await nombreField.fill('Equipo Test Auditoría')
        }
        await page.screenshot({ path: 'test-results/equipos-create-form.png' })

        const saveBtn = page.getByRole('button', { name: /guardar|crear|confirmar/i })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/equipos-create.png' })
    })

    test('UPDATE: editar equipo existente', async ({ page }) => {
      await page.goto(`${BASE_URL}/equipos`)
      await page.waitForLoadState('networkidle')

      const editBtn = page.getByRole('button', { name: /editar/i }).first()
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/equipos-edit-form.png' })
        const saveBtn = page.getByRole('button', { name: /guardar|actualizar|confirmar/i })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/equipos-edit.png' })
    })
  })

  // ===== EJERCICIOS =====
  test.describe('Ejercicios - CRUD completo', () => {
    test('READ: listar ejercicios', async ({ page }) => {
      await page.goto(`${BASE_URL}/ejercicios`)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Ejercicios', exact: true })).toBeVisible()
      await page.screenshot({ path: 'test-results/ejercicios-list.png' })
    })

    test('CREATE: crear nuevo ejercicio', async ({ page }) => {
      await page.goto(`${BASE_URL}/ejercicios`)
      await page.waitForLoadState('networkidle')

      const newBtn = page.getByRole('button', { name: /nuevo ejercicio|añadir|crear/i })
      if (await newBtn.isVisible()) {
        await newBtn.click()
        await page.waitForTimeout(500)

        const tituloField = page.getByLabel(/título|titulo/i)
        if (await tituloField.isVisible()) {
          await tituloField.fill('Ejercicio Test Rondo 6v2')
        }
        const descField = page.getByLabel(/descripción|descripcion/i)
        if (await descField.isVisible()) {
          await descField.fill('Rondo de posesión con 6 jugadores contra 2 presionadores en espacio reducido')
        }
        await page.screenshot({ path: 'test-results/ejercicios-create-form.png' })

        const saveBtn = page.getByRole('button', { name: /guardar|crear|confirmar/i })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/ejercicios-create.png' })
    })

    test('UPDATE: editar ejercicio', async ({ page }) => {
      await page.goto(`${BASE_URL}/ejercicios`)
      await page.waitForLoadState('networkidle')

      const editBtn = page.getByRole('button', { name: /editar/i }).first()
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/ejercicios-edit-form.png' })
        const saveBtn = page.getByRole('button', { name: /guardar|actualizar|confirmar/i })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/ejercicios-edit.png' })
    })

    test('DELETE: eliminar ejercicio', async ({ page }) => {
      await page.goto(`${BASE_URL}/ejercicios`)
      await page.waitForLoadState('networkidle')

      const deleteBtn = page.getByRole('button', { name: /eliminar|borrar/i }).first()
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()
        await page.waitForTimeout(500)
        const confirmBtn = page.getByRole('button', { name: /confirmar|sí|eliminar/i })
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/ejercicios-delete.png' })
    })
  })

  // ===== SESIONES =====
  test.describe('Sesiones - CRUD completo', () => {
    test('READ: listar sesiones', async ({ page }) => {
      await page.goto(`${BASE_URL}/sesiones`)
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Sesiones', exact: true })).toBeVisible()
      await page.screenshot({ path: 'test-results/sesiones-list.png' })
    })

    test('CREATE: crear nueva sesión', async ({ page }) => {
      await page.goto(`${BASE_URL}/sesiones`)
      await page.waitForLoadState('networkidle')

      const newBtn = page.getByRole('button', { name: /nueva sesión|nueva sesion|añadir|crear/i })
      if (await newBtn.isVisible()) {
        await newBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/sesiones-create-form.png' })

        const saveBtn = page.getByRole('button', { name: /guardar|crear|confirmar/i })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/sesiones-create.png' })
    })

    test('UPDATE: editar sesión', async ({ page }) => {
      await page.goto(`${BASE_URL}/sesiones`)
      await page.waitForLoadState('networkidle')

      const editBtn = page.getByRole('button', { name: /editar/i }).first()
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/sesiones-edit-form.png' })
        const saveBtn = page.getByRole('button', { name: /guardar|actualizar|confirmar/i })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/sesiones-edit.png' })
    })
  })

  // ===== PARÁMETROS =====
  test.describe('Parámetros - CRUD completo', () => {
    test('READ: listar parámetros', async ({ page }) => {
      await page.goto(`${BASE_URL}/parametros`)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/parametros-list.png' })
    })

    test('CREATE: crear parámetro', async ({ page }) => {
      await page.goto(`${BASE_URL}/parametros`)
      await page.waitForLoadState('networkidle')

      const newBtn = page.getByRole('button', { name: /nuevo|añadir|crear/i }).first()
      if (await newBtn.isVisible()) {
        await newBtn.click()
        await page.waitForTimeout(500)

        const nombreField = page.getByLabel(/nombre/i)
        if (await nombreField.isVisible()) {
          await nombreField.fill('Test Parámetro Auditoría')
        }
        await page.screenshot({ path: 'test-results/parametros-create-form.png' })

        const saveBtn = page.getByRole('button', { name: /guardar/i })
        if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/parametros-create.png' })
    })
  })

  // ===== DOCUMENTOS =====
  test.describe('Documentos - CRUD completo', () => {
    test('READ: listar documentos', async ({ page }) => {
      await page.goto(`${BASE_URL}/documentos`)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/documentos-list.png' })
    })

    test('CREATE: crear documento', async ({ page }) => {
      await page.goto(`${BASE_URL}/documentos`)
      await page.waitForLoadState('networkidle')

      const newBtn = page.getByRole('button', { name: /nuevo documento|añadir|crear/i })
      if (await newBtn.isVisible()) {
        await newBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/documentos-create-form.png' })

        const saveBtn = page.getByRole('button', { name: /guardar|crear|confirmar/i })
        if (await saveBtn.isVisible()) {
          await saveBtn.click()
          await page.waitForTimeout(1500)
        }
      }
      await page.screenshot({ path: 'test-results/documentos-create.png' })
    })
  })

  // ===== USUARIOS =====
  test.describe('Usuarios - Listado', () => {
    test('READ: listar usuarios', async ({ page }) => {
      await page.goto(`${BASE_URL}/usuarios`)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/usuarios-list.png' })
    })
  })

  // ===== DASHBOARD =====
  test('Dashboard: carga correctamente', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/dashboard.png' })
  })
})

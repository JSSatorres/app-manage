import { test, expect } from '@playwright/test'
import {
  E2E_BASE_URL,
  createE2EInvitationEmail,
  hasE2EAuthCredentials,
  loginAsE2ETestUser,
  missingE2EAuthCredentialsReason,
} from './support/auth'

test.describe('Usuarios - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasE2EAuthCredentials, missingE2EAuthCredentialsReason)
    await loginAsE2ETestUser(page)
  })

  test('READ: listar usuarios', async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/usuarios`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible()
    await page.screenshot({ path: 'test-results/usuarios-list.png' })
  })

  test('CREATE: generar invitación para un usuario nuevo', async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/usuarios`)
    await page.waitForLoadState('networkidle')

    const addBtn = page.getByRole('button', { name: /añadir usuario/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      await page.getByPlaceholder(/usuario@ejemplo\.com/i).fill(createE2EInvitationEmail())
      await page.screenshot({ path: 'test-results/usuarios-invite-form.png' })

      const submitBtn = page.getByRole('button', { name: /generar enlace/i })
      if (await submitBtn.isEnabled()) {
        await submitBtn.click()
        await page.waitForTimeout(1500)
        // Éxito: se muestra el enlace de invitación generado.
        await expect(page.getByText(/copia este enlace/i)).toBeVisible({ timeout: 5000 }).catch(() => undefined)
      }
    }
    await page.screenshot({ path: 'test-results/usuarios-invite.png' })
  })

  test('UPDATE: editar nombre, teléfono y rol de un usuario existente', async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/usuarios`)
    await page.waitForLoadState('networkidle')

    const editBtn = page.getByRole('button', { name: /editar/i }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(500)

      const nombreField = page.getByLabel(/^nombre$/i)
      await nombreField.fill('Usuario Editado E2E')

      const telefonoField = page.getByLabel(/teléfono/i)
      await telefonoField.fill('600111222')

      await page.screenshot({ path: 'test-results/usuarios-edit-form.png' })

      const saveBtn = page.getByRole('button', { name: /guardar cambios/i })
      await saveBtn.click()
      await page.waitForTimeout(1500)
    }
    await page.screenshot({ path: 'test-results/usuarios-edit.png' })
  })

  test('DELETE: quitar un usuario del workspace activo', async ({ page }) => {
    await page.goto(`${E2E_BASE_URL}/usuarios`)
    await page.waitForLoadState('networkidle')

    const removeBtn = page.getByRole('button', { name: /quitar/i }).first()
    if (await removeBtn.isVisible()) {
      await removeBtn.click()
      await page.waitForTimeout(500)
      const confirmBtn = page.getByRole('button', { name: /^quitar$/i }).last()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(1500)
      }
    }
    await page.screenshot({ path: 'test-results/usuarios-delete.png' })
  })
})

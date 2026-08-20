import { expect, test, type Locator, type Page } from '@playwright/test'

async function clickAtCenter(page: Page, locator: Locator) {
  const box = await locator.boundingBox()

  if (!box) {
    throw new Error('El control esperado no est\u00e1 visible para recibir un puntero real.')
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test.describe('Bloqueo global de solicitudes', () => {
  test('bloquea una segunda solicitud y la navegaci\u00f3n mientras env\u00eda la lista de espera', async ({ page }) => {
    let waitlistRequests = 0
    let releaseWaitlistResponse: (() => void) | undefined
    const waitlistResponseBarrier = new Promise<void>((resolve) => {
      releaseWaitlistResponse = resolve
    })

    await page.route('**/api/waitlist', async (route) => {
      waitlistRequests += 1
      await waitlistResponseBarrier
      await route.fulfill({
        body: '{}',
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/landing')

    const email = page.getByLabel('Correo electr\u00f3nico')
    const waitlistForm = page.locator('form').filter({ has: email })
    const submit = waitlistForm.locator('button[type="submit"]')
    const navigationLink = page.getByRole('link', { name: 'SportApp inicio' })
    const processingStatus = page.getByRole('status', { name: 'Procesando solicitud\u2026' })
    const lockedContent = page.getByTestId('request-lock-content')

    await expect(lockedContent).toHaveAttribute('aria-busy', 'false')
    await email.fill('club@example.com')
    await submit.scrollIntoViewIfNeeded()
    await clickAtCenter(page, submit)

    await expect.poll(() => waitlistRequests).toBe(1)
    await expect(processingStatus).toBeVisible()
    await expect(lockedContent).toHaveAttribute('aria-busy', 'true')
    await expect(lockedContent).toHaveAttribute('inert', '')

    await clickAtCenter(page, submit)
    await page.keyboard.press('Enter')
    await clickAtCenter(page, navigationLink)

    expect(waitlistRequests).toBe(1)
    await expect(page).toHaveURL(/\/landing$/)

    if (!releaseWaitlistResponse) {
      throw new Error('No se pudo liberar la respuesta interceptada de la lista de espera.')
    }
    releaseWaitlistResponse()

    await expect(processingStatus).toHaveCount(0)
    await expect(lockedContent).toHaveAttribute('aria-busy', 'false')
    await expect(lockedContent).not.toHaveAttribute('inert')
    await expect(email).toBeEnabled()
    await expect(submit).toBeEnabled()

    await navigationLink.click()
    await expect(page).toHaveURL(/\/landing#top$/)
  })
})

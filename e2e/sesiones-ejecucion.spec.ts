import { expect, test, type Page } from "@playwright/test";
import { authenticateE2EPageForRole, E2E_BASE_URL } from "./support/auth";
test.describe.configure({ mode: "serial" });


const fixtureSesionId = process.env.E2E_SESIONES_FIXTURE_ID;
const PAGE_READY_TIMEOUT = 15_000;

async function openSesiones(page: Page, expectedHeading = "Sesiones") {
  await page.goto(`${E2E_BASE_URL}/sesiones`);
  await expect(page).toHaveURL(/\/sesiones(?:[/?#]|$)/);
  await expect(page.getByRole("heading", { name: expectedHeading, exact: true })).toBeVisible({
    timeout: PAGE_READY_TIMEOUT,
  });
}

async function openRunner(page: Page) {
  if (!fixtureSesionId) {
    test.skip(true, "Falta E2E_SESIONES_FIXTURE_ID, una sesión de prueba con bloques y recurso autorizados.");
  }
  await page.goto(`${E2E_BASE_URL}/sesiones/${fixtureSesionId}/ejecutar`);
  await expect(page).toHaveURL(new RegExp(`/sesiones/${fixtureSesionId}/ejecutar(?:[/?#]|$)`));
  await expect(page.getByRole("heading", { name: "Ejecutar sesi\u00f3n" })).toBeVisible({
    timeout: PAGE_READY_TIMEOUT,
  });
}

test.describe("Sesiones por bloques — acceso anónimo", () => {
  test("deniega el editor y la ejecución a un visitante", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${E2E_BASE_URL}/sesiones`);
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /nueva sesión/i })).toHaveCount(0);
    await context.close();
  });
});

for (const role of ["admin", "gerente_sede", "entrenador"] as const) {
  test.describe(`Sesiones por bloques — ${role}`, () => {
    test.beforeEach(async ({ page }) => {
      const authenticated = await authenticateE2EPageForRole(page, role);
      if (!authenticated) {
        throw new Error(`La identidad E2E ${role} no se autenticó.`);
      }
    });

    test("puede abrir la lista y el editor", async ({ page }) => {
      await openSesiones(page);
      await expect(page.getByRole("heading", { name: "Sesiones", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Nueva", exact: true })).toBeVisible();
    });

    test("el ejecutor comienza parado, permite previsualizar y solo Play activa un bloque", async ({ page }) => {
      await openRunner(page);
      await expect(page.getByRole("heading", { name: "Ejecutar sesión" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Pausa" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Saltar" })).toBeEnabled();

      const previews = page.getByRole("button", { name: /previsualizar/i });
      test.skip((await previews.count()) < 2, "La fixture necesita al menos dos bloques ejecutables.");
      const timer = page.getByRole("timer");
      const initialTimerLabel = await timer.getAttribute("aria-label");
      if (!initialTimerLabel) {
        throw new Error("El temporizador preparado debe exponer un nombre accesible.");
      }

      await page.getByRole("button", { name: "Saltar" }).click();
      await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Pausa" })).toHaveCount(0);
      await expect(timer).not.toHaveAttribute("aria-label", initialTimerLabel);

      const preparedTimerLabel = await timer.getAttribute("aria-label");
      await previews.nth(0).click();
      await expect(page.getByText("Previsualización")).toBeVisible();
      await expect(timer).toHaveAttribute("aria-label", preparedTimerLabel ?? "");

      await page.getByRole("button", { name: "Play" }).click();
      await expect(page.getByRole("button", { name: "Pausa" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Saltar" })).toBeEnabled();
      await expect(page.getByRole("timer")).toBeVisible();
    });
  });
}

test.describe("Sesiones por bloques — jugador", () => {
  test.beforeEach(async ({ page }) => {
    const authenticated = await authenticateE2EPageForRole(page, "jugador");
    if (!authenticated) {
      throw new Error("La identidad E2E jugador no se autenticó.");
    }
  });

  test("no puede crear ni ejecutar sesiones", async ({ page }) => {
    await openSesiones(page, "Acceso no disponible");
    await expect(page.getByRole("button", { name: /nueva sesión/i })).toHaveCount(0);

    if (fixtureSesionId) {
      await page.goto(`${E2E_BASE_URL}/sesiones/${fixtureSesionId}/ejecutar`);
      await expect(page.getByText("No tienes permiso para ejecutar esta sesión.")).toBeVisible();
    }
  });
});

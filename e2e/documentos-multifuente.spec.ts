import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  cleanupDocumentosFixture,
  createDocumentosFixture,
  seedDocumentosFixture,
  setDocumentosFixtureUsage,
  storageStateWithActiveSede,
  type DocumentosFixture,
} from "./fixtures/documentos";
import { E2E_BASE_URL } from "./support/auth";

let fixture: DocumentosFixture | undefined;

async function openDocumentos(browser: Browser, storageState: DocumentosFixture["managerStorageState"]) {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  await page.goto(`${E2E_BASE_URL}/documentos`);
  await expect(page.getByRole("heading", { name: "Documentos", exact: true })).toBeVisible();
  return { context, page };
}

async function closeContext(context: BrowserContext) {
  await context.close();
}

function tab(page: Page, provider: "YouTube" | "Google Drive" | "Almacenamiento") {
  return page.getByRole("tab", { name: new RegExp(`^${provider},`) });
}

test.describe("Documentos multifuente", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    fixture = await createDocumentosFixture();
  });

  test.afterAll(async () => {
    await cleanupDocumentosFixture(fixture);
  });

  test("el gestor ve el tutorial vacío en las tres fuentes", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);

    await expect(tab(page, "YouTube")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: "Configurar Añadir vídeo de YouTube" })).toBeVisible();
    await expect(page.getByText("Configura YouTube", { exact: true })).toBeVisible();

    await tab(page, "Google Drive").click();
    await expect(page.getByRole("region", { name: "Configurar Añadir enlace de Google Drive" })).toBeVisible();
    await expect(page.getByText("Configura Google Drive", { exact: true })).toBeVisible();

    await tab(page, "Almacenamiento").click();
    await expect(page.getByRole("region", { name: "Configurar almacenamiento" })).toBeVisible();
    await expect(page.getByText("Configura Almacenamiento", { exact: true })).toBeVisible();
    await closeContext(context);
  });

  test("el alta de YouTube y Drive persiste activos del workspace y la subida privada pasa a datos", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);
    const youtubeId = "dQw4w9WgXcQ";
    const youtubeDialog = page.getByRole("dialog", { name: "Añadir vídeo de YouTube" });

    await page.getByRole("button", { name: "Añadir vídeo de YouTube" }).click();
    await youtubeDialog.getByLabel("Título").fill("E2E vídeo YouTube");
    await youtubeDialog.getByLabel("Enlace (URL)").fill(`https://youtu.be/${youtubeId}`);
    await youtubeDialog.getByRole("button", { name: "Guardar enlace" }).click();
    await expect(youtubeDialog).toHaveCount(0);
    await expect(page.getByText(`Vídeo ${youtubeId}`, { exact: true })).toBeVisible();

    await tab(page, "Google Drive").click();
    const driveDialog = page.getByRole("dialog", { name: "Añadir enlace de Google Drive" });
    const driveId = "1AbCdEfGhIjKlMn";
    await page.getByRole("button", { name: "Añadir enlace de Google Drive" }).click();
    await driveDialog.getByLabel("Título").fill("E2E enlace Drive");
    await driveDialog.getByLabel("Enlace (URL)").fill(`https://drive.google.com/file/d/${driveId}/view`);
    await driveDialog.getByRole("button", { name: "Guardar enlace" }).click();
    await expect(driveDialog).toHaveCount(0);
    await expect(page.getByText(`Archivo ${driveId}`, { exact: true })).toBeVisible();

    await seedDocumentosFixture(fixture);
    await tab(page, "Almacenamiento").click();
    await expect(page.getByText("fixture-privado.pdf", { exact: true })).toBeVisible();
    await closeContext(context);
  });

  test("previsualiza YouTube integrado, muestra fallback y avisa cuando Drive no da permiso", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);
    const youtubeAsset = fixture.youtubeAssets[0];

    await page.getByRole("row").filter({ hasText: `Vídeo ${youtubeAsset.resourceId}` })
      .getByRole("button", { name: "Ver Vídeo de YouTube" }).click();
    await expect(page.getByTitle("Previsualización de Vídeo de YouTube")).toHaveAttribute(
      "src",
      `https://www.youtube-nocookie.com/embed/${youtubeAsset.resourceId}`,
    );
    await page.getByRole("button", { name: "Cerrar" }).click();

    await page.getByRole("row").filter({ hasText: `Vídeo ${fixture.youtubeFallbackAsset.resourceId}` })
      .getByRole("button", { name: "Ver Vídeo de YouTube" }).click();
    await expect(page.getByText("Este vídeo no permite previsualización integrada.", { exact: false })).toBeVisible();
    await expect(page.getByTitle("Previsualización de Vídeo de YouTube")).toHaveCount(0);
    await page.getByRole("button", { name: "Cerrar" }).click();

    await tab(page, "Google Drive").click();
    await page.getByRole("row").filter({ hasText: fixture.googleDriveUnavailableAsset.resourceId })
      .getByRole("button", { name: "Ver Archivo de Google Drive" }).click();
    await expect(page.getByRole("alert")).toHaveText(/No se puede abrir el archivo con tu sesión actual/);
    await closeContext(context);
  });

  test("separa filtro vacío, paginación y enlaces legacy", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    const filteredState = storageStateWithActiveSede(fixture.managerStorageState, fixture.emptyFilteredSedeId);
    const { context, page } = await openDocumentos(browser, filteredState);

    await expect(page.getByRole("region", { name: "Sin resultados por filtros" })).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(page.getByRole("button", { name: "Página siguiente" })).toBeEnabled();
    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Enlaces anteriores" })).toBeVisible();
    await expect(page.getByText("Enlace conservado de una fuente anterior", { exact: true })).toBeVisible();
    await closeContext(context);
  });

  test("muestra 79, 80 y 100 por ciento; al límite bloquea subida pero conserva lectura y borrado", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);
    await tab(page, "Almacenamiento").click();

    await expect(page.getByRole("progressbar", { name: "Uso de cuota facturable" })).toHaveAttribute("aria-valuenow", "79");
    await setDocumentosFixtureUsage(fixture, 80);
    await page.reload();
    await expect(page.getByRole("progressbar", { name: "Uso de cuota facturable" })).toHaveAttribute("aria-valuenow", "80");
    await expect(page.getByText("Has alcanzado el 80 % de la cuota contratada.", { exact: true })).toBeVisible();

    await setDocumentosFixtureUsage(fixture, 100);
    await page.reload();
    await expect(page.getByRole("progressbar", { name: "Uso de cuota facturable" })).toHaveAttribute("aria-valuenow", "100");
    await expect(page.getByRole("button", { name: "Subir archivo" })).toBeDisabled();
    await expect(page.getByText("Tus archivos existentes siguen disponibles para abrirlos o eliminarlos.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ver fixture-privado.pdf" }).click();
    await expect(page.getByRole("dialog", { name: "Archivo privado" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar" }).click();

    await expect(page.getByRole("button", { name: "Eliminar fixture-privado.pdf" })).toBeVisible();
    await closeContext(context);
  });

  test("registra una solicitud de ampliación desde la cuota", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    await setDocumentosFixtureUsage(fixture, 79);
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);
    await tab(page, "Almacenamiento").click();
    await page.getByRole("button", { name: "Ampliar almacenamiento" }).click();
    const dialog = page.getByRole("dialog", { name: "Ampliar almacenamiento" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Solicitar ampliación" }).click();
    await expect(dialog.getByRole("status")).toHaveText(/Solicitud enviada; la ampliación se activa tras confirmación/);
    await closeContext(context);
  });

  test("un entrenador no puede crear ni leer los activos del workspace del gestor", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    const { context, page } = await openDocumentos(browser, fixture.coachStorageState);
    await expect(page.getByText(`Vídeo ${fixture.youtubeAssets[0].resourceId}`, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Añadir vídeo de YouTube" })).toHaveCount(0);
    await expect(page.getByText("Aún no hay contenido disponible; contacta con un gestor.", { exact: true })).toBeVisible();
    await closeContext(context);
  });
});

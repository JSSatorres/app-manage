import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  cleanupDocumentosFixture,
  createDocumentosFixture,
  seedDocumentosFixture,
  setDocumentosFixtureUsage,
  storageStateWithActiveSede,
  type DocumentosFixture,
} from "./fixtures/documentos";
import type { Database } from "@/types/database.types";
import { E2E_BASE_URL, getE2EAuthCredentials } from "./support/auth";

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

async function createAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Documentos E2E requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { email, password } = getE2EAuthCredentials();
  const client = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error("No se pudo autenticar el cliente E2E de documentos.");
  return client;
}

async function createActiveSede(fixture: DocumentosFixture) {
  const client = await createAuthenticatedClient();
  const { data, error } = await client
    .from("sedes")
    .insert({
      nombre: `${fixture.cleanupPrefix} alta YouTube`,
      workspace_id: fixture.managerWorkspaceId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo crear la sede aislada para el alta E2E de YouTube.");
  return { client, sedeId: data.id };
}

test.describe("Documentos multifuente", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    fixture = await createDocumentosFixture();
  });

  test.afterAll(async () => {
    await cleanupDocumentosFixture(fixture);
  });

  test("el gestor ve el estado vacío común y elige entre los tres métodos de subida", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);

    await expect(page.getByText("Sube documentos a tu manera", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await page.getByRole("button", { name: "Subir", exact: true }).click();
    const methodDialog = page.getByRole("dialog", { name: "¿Cómo quieres subir el documento?" });
    await expect(
      methodDialog.locator("button").filter({ hasText: /^(YouTube|Google Drive|Almacenamiento)$/ }),
    ).toHaveCount(3);
    await expect(methodDialog.getByRole("button", { name: "YouTube" })).toBeVisible();
    await expect(methodDialog.getByRole("button", { name: "Google Drive" })).toBeVisible();
    await expect(methodDialog.getByRole("button", { name: "Almacenamiento" })).toBeVisible();

    await methodDialog.getByRole("button", { name: "YouTube" }).click();
    await expect(page.getByRole("dialog", { name: "Añadir vídeo de YouTube" })).toBeVisible();
    await page.getByRole("dialog", { name: "Añadir vídeo de YouTube" }).getByRole("button", { name: "Cancelar" }).click();

    await page.getByRole("button", { name: "Subir", exact: true }).click();
    await methodDialog.getByRole("button", { name: "Google Drive" }).click();
    await expect(page.getByRole("dialog", { name: "Añadir enlace de Google Drive" })).toBeVisible();
    await page.getByRole("dialog", { name: "Añadir enlace de Google Drive" }).getByRole("button", { name: "Cancelar" }).click();

    await page.getByRole("button", { name: "Subir", exact: true }).click();
    await methodDialog.getByRole("button", { name: "Almacenamiento" }).click();
    await expect(page.getByRole("dialog", { name: "Subir archivo" })).toBeVisible();
    await page.getByRole("dialog", { name: "Subir archivo" }).getByRole("button", { name: "Cancelar" }).click();
    await closeContext(context);
  });

  test("el alta de YouTube y Drive persiste activos del workspace y la subida privada pasa a datos", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    const { client, sedeId } = await createActiveSede(fixture);
    const storageState = storageStateWithActiveSede(fixture.managerStorageState, sedeId);
    const { context, page } = await openDocumentos(browser, storageState);
    const youtubeId = "dQw4w9WgXcQ";
    const youtubeDialog = page.getByRole("dialog", { name: "Añadir vídeo de YouTube" });

    await page.getByRole("button", { name: "Subir", exact: true }).click();
    await page.getByRole("dialog", { name: "¿Cómo quieres subir el documento?" })
      .getByRole("button", { name: "YouTube" }).click();
    await youtubeDialog.getByLabel("Título").fill("E2E vídeo YouTube");
    await youtubeDialog.getByLabel("Enlace (URL)").fill(`https://youtu.be/${youtubeId}`);
    await youtubeDialog.getByRole("button", { name: "Guardar enlace" }).click();
    await expect(youtubeDialog).toHaveCount(0);

    await page.goto(`${E2E_BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto(`${E2E_BASE_URL}/documentos`);
    await expect(page.getByRole("heading", { name: "Documentos", exact: true })).toBeVisible();

    const youtubeRow = page.getByRole("row").filter({ hasText: "E2E vídeo YouTube" });
    await expect(youtubeRow).toBeVisible();
    await expect(youtubeRow.getByText("YouTube", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByText("Configura YouTube", { exact: true })).toHaveCount(0);

    const { data: documento, error: documentoError } = await client
      .from("documentos")
      .select("id,content_asset_id,workspace_id")
      .eq("workspace_id", fixture.managerWorkspaceId)
      .eq("titulo", "E2E vídeo YouTube")
      .single();
    expect(documentoError).toBeNull();
    expect(documento?.workspace_id).toBe(fixture.managerWorkspaceId);
    expect(documento?.content_asset_id).toBeTruthy();
    if (!documento?.content_asset_id) throw new Error("El documento E2E de YouTube no se vinculó a un activo.");

    const { data: asset, error: assetError } = await client
      .from("content_assets")
      .select("id,provider,external_resource_id,original_url,workspace_id")
      .eq("id", documento.content_asset_id)
      .single();
    expect(assetError).toBeNull();
    expect(asset).toMatchObject({
      id: documento.content_asset_id,
      provider: "youtube",
      external_resource_id: youtubeId,
      original_url: `https://www.youtube.com/watch?v=${youtubeId}`,
      workspace_id: fixture.managerWorkspaceId,
    });

    const { data: associations, error: associationsError } = await client
      .from("documento_sedes")
      .select("sede_id")
      .eq("documento_id", documento.id);
    expect(associationsError).toBeNull();
    expect(associations?.map((association) => association.sede_id)).toContain(sedeId);

    const driveDialog = page.getByRole("dialog", { name: "Añadir enlace de Google Drive" });
    const driveId = "1AbCdEfGhIjKlMn";
    await page.getByRole("button", { name: "Subir", exact: true }).click();
    await page.getByRole("dialog", { name: "¿Cómo quieres subir el documento?" })
      .getByRole("button", { name: "Google Drive" }).click();
    await driveDialog.getByLabel("Título").fill("E2E enlace Drive");
    await driveDialog.getByLabel("Enlace (URL)").fill(`https://drive.google.com/file/d/${driveId}/view`);
    await driveDialog.getByRole("button", { name: "Guardar enlace" }).click();
    await expect(driveDialog).toHaveCount(0);
    await expect(page.getByText("E2E enlace Drive", { exact: true })).toBeVisible();

    await seedDocumentosFixture(fixture);
    await expect(page.getByText(`${fixture.cleanupPrefix} archivo privado`, { exact: true })).toBeVisible();
    await closeContext(context);
  });

  test("previsualiza YouTube integrado, muestra fallback y avisa cuando Drive no da permiso", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);
    const youtubeAsset = fixture.youtubeAssets[0];

    await page.getByRole("row").filter({ hasText: `${fixture.cleanupPrefix} vídeo ${youtubeAsset.resourceId}` })
      .getByRole("button", { name: `Ver ${fixture.cleanupPrefix} vídeo ${youtubeAsset.resourceId}` }).click();
    await expect(page.getByTitle("Previsualización de Vídeo de YouTube")).toHaveAttribute(
      "src",
      `https://www.youtube-nocookie.com/embed/${youtubeAsset.resourceId}`,
    );
    await page.getByRole("button", { name: "Cerrar" }).click();

    await page.getByRole("row").filter({ hasText: `${fixture.cleanupPrefix} vídeo alternativo` })
      .getByRole("button", { name: `Ver ${fixture.cleanupPrefix} vídeo alternativo` }).click();
    await expect(page.getByText("Este vídeo no permite previsualización integrada.", { exact: false })).toBeVisible();
    await expect(page.getByTitle("Previsualización de Vídeo de YouTube")).toHaveCount(0);
    await page.getByRole("button", { name: "Cerrar" }).click();

    await page.getByRole("row").filter({ hasText: `${fixture.cleanupPrefix} enlace Drive` })
      .getByRole("button", { name: `Ver ${fixture.cleanupPrefix} enlace Drive` }).click();
    await expect(page.getByRole("alert")).toHaveText(/No se puede abrir el archivo con tu sesión actual/);
    await closeContext(context);
  });

  test("muestra el vacío común por sede y conserva legacy sin acciones de gestión", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    const filteredState = storageStateWithActiveSede(fixture.managerStorageState, fixture.emptyFilteredSedeId);
    const { context, page } = await openDocumentos(browser, filteredState);

    await expect(page.getByText("Sube documentos a tu manera", { exact: true })).toBeVisible();
    await closeContext(context);

    const unfiltered = await openDocumentos(browser, fixture.managerStorageState);
    await expect(unfiltered.page.getByRole("region", { name: "Lista de documentos" })).toBeVisible();
    await expect(unfiltered.page.getByRole("button", { name: "Página siguiente" })).toBeEnabled();
    await unfiltered.page.getByRole("button", { name: "Página siguiente" }).click();
    const legacyRow = unfiltered.page.getByRole("row").filter({ hasText: "Enlace conservado de una fuente anterior" });
    await expect(legacyRow).toBeVisible();
    await expect(legacyRow.getByRole("button", { name: `Ver ${fixture.cleanupPrefix} enlace legacy` })).toBeVisible();
    await expect(legacyRow.getByRole("button", { name: `Editar ${fixture.cleanupPrefix} enlace legacy` })).toHaveCount(0);
    await expect(legacyRow.getByRole("button", { name: `Eliminar ${fixture.cleanupPrefix} enlace legacy` })).toHaveCount(0);
    await closeContext(unfiltered.context);
  });

  test("muestra 79, 80 y 100 por ciento; al límite bloquea subida pero conserva lectura y borrado", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);
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
    await page.getByRole("button", { name: `Ver ${fixture.cleanupPrefix} archivo privado` }).click();
    await expect(page.getByRole("dialog", { name: "Archivo privado" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar" }).click();

    await expect(page.getByRole("button", { name: `Eliminar ${fixture.cleanupPrefix} archivo privado` })).toBeVisible();
    await closeContext(context);
  });

  test("registra una solicitud de ampliación desde la cuota", async ({ browser }) => {
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    await seedDocumentosFixture(fixture);
    await setDocumentosFixtureUsage(fixture, 79);
    const { context, page } = await openDocumentos(browser, fixture.managerStorageState);
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
    await expect(
      page.getByText(`${fixture.cleanupPrefix} vídeo ${fixture.youtubeAssets[0].resourceId}`, { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Subir", exact: true })).toHaveCount(0);
    await expect(page.getByText("Sube documentos a tu manera", { exact: true })).toBeVisible();
    await closeContext(context);
  });

  test("un documento global se ve desde todas las sedes del workspace", async ({ browser }) => {
    // Entorno E2E incompleto en esta máquina: falta `SUPABASE_SERVICE_ROLE_KEY` (solo hay un
    // placeholder vacío en `.env.example`), variable que exige `documentosEnvironment()` en
    // `e2e/fixtures/documentos.ts:41-55` para crear la fixture aislada del workspace de prueba.
    // Sin ella, el `beforeAll` de este `describe` ya falla antes de ejecutar cualquier test del
    // archivo (comprobado el 20/08/2026 con `npx playwright test documentos-multifuente`: las 8
    // pruebas, incluidas las 7 preexistentes, quedan en fallo/"did not run"). No se rellena la
    // credencial aquí porque el enunciado prohíbe inventar datos/credenciales E2E; verificar este
    // caso por otra vía (cruce BD↔UI del verifier) hasta que el entorno tenga la variable.
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Falta SUPABASE_SERVICE_ROLE_KEY para las fixtures aisladas de documentos E2E.",
    );
    if (!fixture) throw new Error("La fixture E2E de documentos no se inicializó.");
    // Dos sedes aisladas del mismo workspace de gestor, con el mismo helper que usa
    // "el alta de YouTube y Drive persiste activos del workspace…" (línea ~102) para crear su
    // sede activa. Se limpian solas: `afterAll` -> `cleanupDocumentosFixture` borra todas las
    // filas de `sedes` del workspace temporal (ver `deleteWorkspaceFixture` en fixtures/documentos.ts).
    const { sedeId: sedeAId } = await createActiveSede(fixture);
    const { sedeId: sedeBId } = await createActiveSede(fixture);
    const storageStateSedeA = storageStateWithActiveSede(fixture.managerStorageState, sedeAId);
    const storageStateSedeB = storageStateWithActiveSede(fixture.managerStorageState, sedeBId);
    const youtubeId = "jNQXAC9IVRw";

    const { context: contextA, page: pageA } = await openDocumentos(browser, storageStateSedeA);
    const youtubeDialog = pageA.getByRole("dialog", { name: "Añadir vídeo de YouTube" });

    await pageA.getByRole("button", { name: "Subir", exact: true }).click();
    await pageA.getByRole("dialog", { name: "¿Cómo quieres subir el documento?" })
      .getByRole("button", { name: "YouTube" }).click();
    await youtubeDialog.getByLabel("Título").fill("E2E vídeo global YouTube");
    await youtubeDialog.getByLabel("Enlace (URL)").fill(`https://youtu.be/${youtubeId}`);
    await youtubeDialog.getByRole("switch", { name: /global/i }).click();
    await youtubeDialog.getByRole("button", { name: "Guardar enlace" }).click();
    await expect(youtubeDialog).toHaveCount(0);

    const rowSedeA = pageA.getByRole("row").filter({ hasText: "E2E vídeo global YouTube" });
    await expect(rowSedeA).toBeVisible();
    await expect(rowSedeA.getByText("Todas las sedes (global)", { exact: true })).toBeVisible();
    await closeContext(contextA);

    const { context: contextB, page: pageB } = await openDocumentos(browser, storageStateSedeB);
    const rowSedeB = pageB.getByRole("row").filter({ hasText: "E2E vídeo global YouTube" });
    await expect(rowSedeB).toBeVisible();
    await expect(rowSedeB.getByText("Todas las sedes (global)", { exact: true })).toBeVisible();
    await closeContext(contextB);
  });
});

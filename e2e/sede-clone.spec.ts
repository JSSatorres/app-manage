import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { cleanupCloneSede, type CloneContext } from "./support/clone-auth";
import { E2E_BASE_URL } from "./support/auth";

const cloneStorageState = process.env.E2E_CLONE_STORAGE_STATE;
const nonManagerStorageState = process.env.E2E_CLONE_NON_MANAGER_STORAGE_STATE;
const foreignSedeName = process.env.E2E_CLONE_FOREIGN_SEDE_NAME;
const cloneContextPath = process.env.E2E_CLONE_CONTEXT_PATH;

if (!cloneStorageState || !nonManagerStorageState || !foreignSedeName || !cloneContextPath) {
  throw new Error("El bootstrap de clonaciÃ³n no generÃ³ los estados E2E requeridos.");
}

const cloneContext = JSON.parse(readFileSync(cloneContextPath, "utf8")) as CloneContext;
let createdSede: { id?: string; name: string } | null = null;

interface CloneRpcResponse {
  sede: {
    id: string;
    nombre: string;
  };
  mappings: {
    equipos: Record<string, string>;
    sesiones: Record<string, string>;
  };
  resumen: {
    equipos: number;
    entrenadores: number;
    jugadores: number;
    sesiones: number;
    parametros: number;
    documentos: number;
    ejercicios: number;
  };
}

function cloneName(kind: string) {
  const name = `${cloneContext.cleanupPrefix} ${kind}`;
  createdSede = { name };
  return name;
}

function isCloneRpcResponse(value: unknown): value is CloneRpcResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { sede?: unknown; mappings?: unknown; resumen?: unknown };
  return Boolean(
    candidate.sede &&
      typeof candidate.sede === "object" &&
      "id" in candidate.sede &&
      "nombre" in candidate.sede &&
      typeof candidate.sede.id === "string" &&
      typeof candidate.sede.nombre === "string" &&
    candidate.mappings &&
      typeof candidate.mappings === "object" &&
      candidate.resumen &&
      typeof candidate.resumen === "object",
  );
}

async function openNewSedeForm(page: Page) {
  await page.goto(`${E2E_BASE_URL}/sedes`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nueva sede" }).click();
  await expect(page.getByRole("dialog", { name: "Nueva sede" })).toBeVisible();
}

async function selectCloneSource(page: Page) {
  await page.getByRole("checkbox", { name: "Clonar contenido de otra sede" }).click();
  const source = page.locator("#sede-clone-source");
  await expect(source).toBeVisible();
  await expect(source.locator("option", { hasText: cloneContext.sourceSedeName })).toHaveCount(1);
  await source.selectOption(cloneContext.sourceSedeId);
  await page
    .getByRole("status", { name: /Cargando el contenido de la sede de origen/i })
    .waitFor({ state: "hidden" });
  await expect(page.getByRole("checkbox", { name: "Seleccionar equipos" })).toBeEnabled({ timeout: 15000 });
}

async function cloneAndReadResponse(page: Page): Promise<CloneRpcResponse> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/rest/v1/rpc/clone_sede"),
  );
  await page.getByRole("button", { name: "Clonar sede" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);

  const payload: unknown = await response.json();
  if (!isCloneRpcResponse(payload)) {
    throw new Error("La RPC clone_sede no devolviÃ³ mappings y resumen");
  }
  if (createdSede && payload.sede.nombre === createdSede.name) {
    createdSede.id = payload.sede.id;
  }
  return payload;
}

function expectRemappedIds(mappings: Record<string, string>) {
  for (const [sourceId, destinationId] of Object.entries(mappings)) {
    expect(destinationId).not.toBe(sourceId);
  }
}

test.describe("ClonaciÃ³n de sedes â€” acceso anÃ³nimo", () => {
  test("un visitante anÃ³nimo no puede abrir el flujo de clonaciÃ³n", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${E2E_BASE_URL}/sedes`);
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.getByRole("button", { name: "Nueva sede" })).toHaveCount(0);

    await context.close();
  });
});

test.describe("ClonaciÃ³n de sedes â€” development autenticado", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: cloneStorageState });

  test.afterEach(async () => {
    if (!createdSede) return;
    await cleanupCloneSede(cloneContext, createdSede);
    createdSede = null;
  });

  test("mantiene el alta vacÃ­a sin activar contenido de clonaciÃ³n", async ({ page }) => {
    await openNewSedeForm(page);

    await expect(page.getByRole("checkbox", { name: "Clonar contenido de otra sede" })).toBeVisible();
    await expect(page.locator("#sede-clone-source")).toHaveCount(0);

    await page.getByLabel("Nombre").fill(cloneName("vacÃ­a"));
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("dialog", { name: "Nueva sede" })).toHaveCount(0);
  });

  test("clona una sesión con sus dependencias y valida resumen, remapeos y exclusiones", async ({ page }) => {
    await openNewSedeForm(page);
    await selectCloneSource(page);

    const session = page.getByTestId(`clone-session-${cloneContext.sourceSessionId}`);
    await session.click();
    await expect(session).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("checkbox", { name: cloneContext.sourceTeamName })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("checkbox", { name: cloneContext.sourceTrainerName })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByLabel("Nombre").fill(cloneName("completa"));
    const result = await cloneAndReadResponse(page);

    await expect(page.getByRole("status").filter({ hasText: /Sede clonada correctamente/i })).toBeVisible();

    expect(result.resumen).toEqual({
      equipos: 1,
      entrenadores: 1,
      jugadores: 0,
      sesiones: 1,
      parametros: 0,
      documentos: 0,
      ejercicios: 0,
    });
    expectRemappedIds(result.mappings.equipos);
    expectRemappedIds(result.mappings.sesiones);
    expect(Object.keys(result.mappings.equipos)).toHaveLength(1);
    expect(Object.keys(result.mappings.sesiones)).toHaveLength(1);
  });

  test("la clonaciÃ³n parcial conserva vacÃ­as las categorÃ­as excluidas", async ({ page }) => {
    await openNewSedeForm(page);
    await selectCloneSource(page);

    await page.getByRole("checkbox", { name: "Seleccionar equipos" }).click();
    await expect(page.getByRole("checkbox", { name: "Seleccionar todo" })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await page.getByLabel("Nombre").fill(cloneName("parcial"));
    const result = await cloneAndReadResponse(page);

    expect(result.resumen).toEqual({
      equipos: 1,
      entrenadores: 0,
      jugadores: 0,
      sesiones: 0,
      parametros: 0,
      documentos: 0,
      ejercicios: 0,
    });
    expect(Object.keys(result.mappings.equipos)).toHaveLength(1);
    expect(result.mappings.sesiones).toEqual({});
  });

  test("permite alcanzar mediante scroll una categorÃ­a inferior del contenido clonable", async ({ page }) => {
    await openNewSedeForm(page);
    await selectCloneSource(page);

    const dialog = page.getByRole("dialog", { name: "Nueva sede" });
    const body = dialog.locator('[data-slot="dialog-body"]');
    const scrollState = await body.evaluate((element) => {
      const { clientHeight, scrollHeight } = element;
      element.scrollTop = scrollHeight;
      return { clientHeight, scrollHeight, scrollTop: element.scrollTop };
    });

    expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
    expect(scrollState.scrollTop).toBeGreaterThan(0);
    await expect(page.getByRole("checkbox", { name: "Seleccionar documentos" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Clonar sede" })).toBeVisible();
  });

  test("un origen de otro tenant no se ofrece en el selector", async ({ page }) => {
    await openNewSedeForm(page);
    await page.getByRole("checkbox", { name: "Clonar contenido de otra sede" }).click();

    await expect(page.locator("#sede-clone-source option", { hasText: foreignSedeName })).toHaveCount(0);
  });

  test("una sesiÃ³n seleccionada exige su entrenador asociado", async ({ page }) => {
    await openNewSedeForm(page);
    await selectCloneSource(page);

    await page.getByRole("checkbox", { name: "Seleccionar todo" }).click();

    const destinationName = cloneName("sin-entrenador");
    await page.getByLabel("Nombre").fill(destinationName);
    await page.route("**/rest/v1/rpc/clone_sede", async (route) => {
      const originalPayload: unknown = route.request().postDataJSON();
      if (!originalPayload || typeof originalPayload !== "object") {
        await route.continue();
        return;
      }
      const payload = originalPayload as {
        p_seleccion?: Record<string, unknown>;
      };
      await route.continue({
        postData: JSON.stringify({
          ...payload,
          p_seleccion: {
            ...payload.p_seleccion,
            entrenadores: [],
          },
        }),
      });
    });

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/rest/v1/rpc/clone_sede"),
    );
    await page.getByRole("button", { name: "Clonar sede" }).click();
    const response = await responsePromise;

    expect(response.ok()).toBe(false);
    await expect(page.getByText(destinationName, { exact: true })).toHaveCount(0);
  });
});

test.describe("ClonaciÃ³n de sedes â€” rol sin gestiÃ³n", () => {
  test("no expone el control de alta ni el flujo de clonaciÃ³n", async ({ browser }) => {
    const context: BrowserContext = await browser.newContext({ storageState: nonManagerStorageState });
    const page = await context.newPage();

    await page.goto(`${E2E_BASE_URL}/sedes`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Nueva sede" })).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: "Clonar contenido de otra sede" })).toHaveCount(0);

    await context.close();
  });
});

import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  authenticateE2EPageForRole,
  E2E_BASE_URL,
  getE2EAuthCredentials,
  hasE2EAuthCredentials,
} from "./support/auth";

type EconomyFixture = {
  incomeCategoryId: string;
  expenseCategoryId: string;
  playerId: string;
  workspaceId: string;
};

let createdEntryIds: string[] = [];

function uniqueConcept(testId: string, kind: string) {
  return `E2E economía ${testId} ${kind}`;
}

function e2eDataEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return null;
  }

  return { anonKey, serviceRoleKey, url };
}

async function createReadClient(): Promise<SupabaseClient<Database>> {
  const environment = e2eDataEnvironment();
  if (!environment) throw new Error("Faltan variables Supabase E2E para las lecturas y la limpieza acotada.");

  const { email, password } = getE2EAuthCredentials("admin");
  const client = createClient<Database>(environment.url, environment.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error("No se pudo autenticar el cliente de lectura E2E.");
  return client;
}

function createCleanupClient(): SupabaseClient<Database> {
  const environment = e2eDataEnvironment();
  if (!environment) throw new Error("Faltan variables Supabase E2E para limpiar fixtures económicos.");
  return createClient<Database>(environment.url, environment.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function activeWorkspaceId(page: Page): Promise<string> {
  const workspaceId = await page.evaluate(() => window.localStorage.getItem("sportapp_active_workspace_id"));
  if (!workspaceId) throw new Error("La sesión E2E no resolvió un club activo.");
  return workspaceId;
}

async function readFixture(page: Page): Promise<EconomyFixture> {
  const workspaceId = await activeWorkspaceId(page);
  const client = await createReadClient();
  const [{ data: categories, error: categoriesError }, { data: players, error: playersError }] = await Promise.all([
    client
      .from("economic_categories")
      .select("id,direction")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),
    client.from("jugadores").select("id").eq("workspace_id", workspaceId).limit(1),
  ]);
  if (categoriesError || playersError) throw new Error("No se pudieron leer las fixtures económicas del club E2E.");

  const incomeCategoryId = categories?.find((category) => category.direction === "income")?.id;
  const expenseCategoryId = categories?.find((category) => category.direction === "expense")?.id;
  const playerId = players?.[0]?.id;
  if (!incomeCategoryId || !expenseCategoryId || !playerId) {
    throw new Error("El club E2E necesita una categoría activa de ingreso, otra de gasto y un jugador de prueba.");
  }
  return { incomeCategoryId, expenseCategoryId, playerId, workspaceId };
}

async function openEconomiaAsAdmin(page: Page) {
  const authenticated = await authenticateE2EPageForRole(page, "admin");
  test.skip(!authenticated, "La cuenta E2E debe pertenecer a un workspace con rol admin.");
  await page.goto(`${E2E_BASE_URL}/economia`);
  await expect(page.getByRole("heading", { name: "Gestión económica", exact: true })).toBeVisible();
}

async function createEntry(
  page: Page,
  fixture: EconomyFixture,
  testId: string,
  type: "player_charge" | "income" | "expense",
) {
  const concept = uniqueConcept(testId, type);
  await page.getByRole("button", { name: "Nueva entrada" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva entrada económica" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Tipo").selectOption(type);
  await dialog.getByLabel("Categoría").selectOption(type === "expense" ? fixture.expenseCategoryId : fixture.incomeCategoryId);
  if (type === "player_charge") await dialog.getByLabel("Jugador").selectOption(fixture.playerId);
  if (type !== "player_charge") await dialog.getByLabel("Proveedor o contraparte").fill("Fixture E2E");
  await dialog.getByLabel("Concepto").fill(concept);
  await dialog.getByLabel("Importe").fill(type === "player_charge" ? "100,00" : "25,00");
  await dialog.getByLabel("Vencimiento").fill("2030-12-31");
  await dialog.getByRole("button", { name: "Crear entrada" }).click();
  await expect(dialog.getByRole("status", { name: "Entrada creada correctamente." })).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar" }).click();

  const client = await createReadClient();
  await expect
    .poll(async () => {
      const { data, error } = await client
        .from("economic_entries")
        .select("id,workspace_id")
        .eq("workspace_id", fixture.workspaceId)
        .eq("concept", concept)
        .maybeSingle();
      if (error) throw error;
      return data;
    })
    .not.toBeNull();

  // `expect.poll` has asserted the row exists; read it once to retain the exact scoped ID for cleanup.
  const { data, error } = await client
    .from("economic_entries")
    .select("id,workspace_id")
    .eq("workspace_id", fixture.workspaceId)
    .eq("concept", concept)
    .single();
  if (error || !data) throw error ?? new Error("La entrada económica creada no se pudo localizar.");
  createdEntryIds.push(data.id);
  return { concept, id: data.id };
}

async function cleanupCreatedEntries() {
  if (createdEntryIds.length === 0) return;
  const client = createCleanupClient();
  const entryIds = [...createdEntryIds];
  createdEntryIds = [];

  const { error: attemptsError } = await client.from("stripe_payment_attempts").delete().in("entry_id", entryIds);
  if (attemptsError) throw new Error("No se pudieron borrar los intentos Stripe E2E creados.");
  const { error: movementsError } = await client.from("economic_movements").delete().in("entry_id", entryIds);
  if (movementsError) throw new Error("No se pudieron borrar los movimientos E2E creados.");
  const { error: entriesError } = await client.from("economic_entries").delete().in("id", entryIds);
  if (entriesError) throw new Error("No se pudieron borrar las entradas E2E creadas.");
}

async function switchToOtherWorkspace(page: Page) {
  const trigger = page.locator('[data-slot="select-trigger"]:visible').filter({ hasText: "Club" }).first();
  await trigger.waitFor({ state: "visible", timeout: 10000 }).catch(() => undefined);
  if ((await trigger.count()) === 0) return false;
  const currentName = (await trigger.innerText()).replace(/^CLUB\s*/i, "").trim();
  await trigger.click();
  const options = page.getByRole("option");
  await options.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
  for (let index = 0; index < await options.count(); index += 1) {
    const option = options.nth(index);
    if ((await option.innerText()).trim() !== currentName) {
      await option.click();
      return true;
    }
  }
  await page.keyboard.press("Escape");
  return false;
}

test.describe("Economía — administración", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!hasE2EAuthCredentials || !e2eDataEnvironment(), "Requiere credenciales E2E y NEXT_PUBLIC_SUPABASE_*/SUPABASE_SERVICE_ROLE_KEY para fixtures scoped.");

  test.afterEach(async () => {
    await cleanupCreatedEntries();
  });

  test("admin crea cargo, gasto e ingreso; registra parcial, filtra, exporta y cancela", async ({ page }, testInfo) => {
    await openEconomiaAsAdmin(page);
    const fixture = await readFixture(page);
    const testId = `${testInfo.project.name}-${testInfo.retry}-${Date.now()}`;
    const charge = await createEntry(page, fixture, testId, "player_charge");
    await createEntry(page, fixture, testId, "expense");
    const income = await createEntry(page, fixture, testId, "income");

    await page.getByRole("tab", { name: "Movimientos" }).click();
    await page.getByRole("button", { name: `Registrar cobro de ${charge.concept}` }).click();
    const movementDialog = page.getByRole("dialog", { name: "Registrar cobro" });
    await movementDialog.getByLabel("Importe").fill("40,00");
    await movementDialog.getByRole("button", { name: "Registrar cobro" }).click();
    await expect(movementDialog).toHaveCount(0);
    await expect(page.getByText("Parcial", { exact: true })).toBeVisible();

    await page.getByLabel("Tipo").selectOption("income");
    await expect(page).toHaveURL(/\/economia\?tipo=income/);
    await expect(page.getByText(income.concept, { exact: true })).toBeVisible();
    await expect(page.getByText(charge.concept, { exact: true })).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^economia-/);
    await expect(page.getByText(/Exportadas \d+ filas\./)).toBeVisible();

    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await page.getByRole("button", { name: `Ver detalle de ${income.concept}` }).click();
    const entryDialog = page.getByRole("dialog", { name: "Editar entrada económica" });
    await entryDialog.getByRole("button", { name: "Cancelar entrada" }).click();
    const cancellation = entryDialog.getByRole("alertdialog", { name: "Confirmar cancelación" });
    await cancellation.getByLabel("Motivo de la cancelación").fill("Limpieza de fixture E2E");
    await cancellation.getByRole("button", { name: "Confirmar cancelación" }).click();
    await expect(entryDialog.getByRole("status", { name: "Entrada cancelada correctamente." })).toBeVisible();
  });

  test("un rol no autorizado no ve Economía", async ({ page }) => {
    const authenticated = await authenticateE2EPageForRole(page, "entrenador");
    test.skip(!authenticated, "Requiere E2E_ENTRENADOR_EMAIL/E2E_ENTRENADOR_PASSWORD con una membresía entrenador.");
    await page.goto(`${E2E_BASE_URL}/economia`);
    await expect(page.getByRole("heading", { name: "No tienes acceso" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gestión económica", exact: true })).toHaveCount(0);
  });

  test("el cambio de club no muestra la entrada del workspace anterior", async ({ page }, testInfo) => {
    await openEconomiaAsAdmin(page);
    const fixture = await readFixture(page);
    const income = await createEntry(page, fixture, `${testInfo.project.name}-${Date.now()}`, "income");
    const changed = await switchToOtherWorkspace(page);
    test.skip(changed === false, "La cuenta E2E necesita al menos dos clubes para comprobar el aislamiento visual por workspace.");

    await page.getByRole("tab", { name: "Movimientos" }).click();
    await expect(page.getByText(income.concept, { exact: true })).toHaveCount(0);

    const client = await createReadClient();
    const { data, error } = await client
      .from("economic_entries")
      .select("id,workspace_id")
      .eq("id", income.id)
      .eq("workspace_id", fixture.workspaceId)
      .maybeSingle();
    if (error) throw error;
    expect(data?.workspace_id).toBe(fixture.workspaceId);
  });
});

test("un visitante anónimo es redirigido antes de gestionar Economía", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${E2E_BASE_URL}/economia`);
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Gestión económica", exact: true })).toHaveCount(0);
  await context.close();
});

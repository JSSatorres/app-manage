import { expect, test, type Frame, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Database } from "@/types/database.types";
import {
  authenticateE2EPageForRole,
  E2E_BASE_URL,
  getE2EAuthCredentials,
  hasE2EAuthCredentials,
} from "./support/auth";

type StripeEnvironment = {
  connectedAccountId: string;
  connectWebhookSecret: string;
  secretKey: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
};

type StripeFixture = {
  entryId: string;
  workspaceId: string;
};

let fixtureEntryIds: string[] = [];

function stripeEnvironment(): StripeEnvironment | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const connectedAccountId = process.env.E2E_STRIPE_CONNECTED_ACCOUNT_ID;
  const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey || !connectedAccountId || !connectWebhookSecret || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) return null;
  if (!secretKey.startsWith("sk_test_") || !connectedAccountId.startsWith("acct_") || !connectWebhookSecret.startsWith("whsec_")) return null;
  return { connectedAccountId, connectWebhookSecret, secretKey, supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl };
}

function stripePrerequisiteReason() {
  if (!hasE2EAuthCredentials) return "Requiere credenciales de administrador E2E.";
  if (!stripeEnvironment()) {
    return "Requiere STRIPE_SECRET_KEY sk_test_, E2E_STRIPE_CONNECTED_ACCOUNT_ID, STRIPE_CONNECT_WEBHOOK_SECRET y claves Supabase E2E; no se ejecuta Stripe en modo live.";
  }
  if (process.env.E2E_STRIPE_WEBHOOKS_READY !== "true") {
    return "Requiere E2E_STRIPE_WEBHOOKS_READY=true tras arrancar stripe listen para /api/stripe/webhook y /api/stripe/connect-webhook.";
  }
  return null;
}

async function createReadClient(environment: StripeEnvironment): Promise<SupabaseClient<Database>> {
  const { email, password } = getE2EAuthCredentials("admin");
  const client = createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error("No se pudo autenticar el cliente de lectura Stripe E2E.");
  return client;
}

function cleanupClient(environment: StripeEnvironment) {
  return createClient<Database>(environment.supabaseUrl, environment.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function openEconomiaAsAdmin(page: Page) {
  const authenticated = await authenticateE2EPageForRole(page, "admin");
  test.skip(!authenticated, "La cuenta E2E debe pertenecer a un workspace con rol admin.");
  await page.goto(`${E2E_BASE_URL}/economia`);
  await expect(page.getByRole("heading", { name: "Gestión económica", exact: true })).toBeVisible();
}

async function createChargeFixture(page: Page, environment: StripeEnvironment, name: string): Promise<StripeFixture> {
  const workspaceId = await page.evaluate(() => window.localStorage.getItem("sportapp_active_workspace_id"));
  if (!workspaceId) throw new Error("La sesión Stripe E2E no resolvió el club activo.");
  const client = await createReadClient(environment);
  const [{ data: categories, error: categoryError }, { data: players, error: playerError }] = await Promise.all([
    client
      .from("economic_categories")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("direction", "income")
      .eq("is_active", true)
      .limit(1),
    client.from("jugadores").select("id").eq("workspace_id", workspaceId).limit(1),
  ]);
  if (categoryError || playerError || !categories?.[0]?.id || !players?.[0]?.id) {
    throw new Error("El club Stripe E2E requiere una categoría de ingreso activa y un jugador de prueba.");
  }

  await page.getByRole("button", { name: "Nueva entrada" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva entrada económica" });
  await dialog.getByLabel("Tipo").selectOption("player_charge");
  await dialog.getByLabel("Categoría").selectOption(categories[0].id);
  await dialog.getByLabel("Jugador").selectOption(players[0].id);
  await dialog.getByLabel("Concepto").fill(name);
  await dialog.getByLabel("Importe").fill("10,00");
  await dialog.getByLabel("Vencimiento").fill("2030-12-31");
  await dialog.getByRole("button", { name: "Crear entrada" }).click();
  await expect(dialog.getByRole("status", { name: "Entrada creada correctamente." })).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar" }).click();

  const { data, error } = await client
    .from("economic_entries")
    .select("id,workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("concept", name)
    .single();
  if (error || !data) throw error ?? new Error("No se pudo localizar el cargo Stripe E2E recién creado.");
  fixtureEntryIds.push(data.id);
  return { entryId: data.id, workspaceId: data.workspace_id };
}

async function cleanupFixtures(environment: StripeEnvironment) {
  if (fixtureEntryIds.length === 0) return;
  const entryIds = [...fixtureEntryIds];
  fixtureEntryIds = [];
  const client = cleanupClient(environment);
  const { data: attempts, error: attemptsReadError } = await client
    .from("stripe_payment_attempts")
    .select("checkout_session_id,payment_intent_id")
    .in("entry_id", entryIds);
  if (attemptsReadError) throw new Error("No se pudieron localizar los intentos Stripe E2E para limpiar.");

  const { error: attemptsError } = await client.from("stripe_payment_attempts").delete().in("entry_id", entryIds);
  if (attemptsError) throw new Error("No se pudieron borrar los intentos Stripe E2E scoped.");
  const { error: movementsError } = await client.from("economic_movements").delete().in("entry_id", entryIds);
  if (movementsError) throw new Error("No se pudieron borrar los movimientos Stripe E2E scoped.");
  const { error: entriesError } = await client.from("economic_entries").delete().in("id", entryIds);
  if (entriesError) throw new Error("No se pudieron borrar los cargos Stripe E2E scoped.");

  const eventObjectIds = (attempts ?? []).flatMap((attempt) => [attempt.checkout_session_id, attempt.payment_intent_id]).filter(
    (value): value is string => Boolean(value),
  );
  if (eventObjectIds.length > 0) {
    const { error: eventsError } = await client.from("stripe_webhook_events").delete().in("object_id", eventObjectIds);
    if (eventsError) throw new Error("No se pudieron borrar los eventos webhook Stripe E2E scoped.");
  }
}

async function fillFirstVisible(locators: readonly ReturnType<Page["locator"]>[], value: string) {
  for (const locator of locators) {
    if (await locator.count() > 0 && await locator.first().isVisible().catch(() => false)) {
      await locator.first().fill(value);
      return;
    }
  }
  throw new Error("Stripe Checkout no expuso el campo de tarjeta esperado.");
}

function inputLocators(frame: Frame, names: readonly string[]) {
  return names.map((name) => frame.locator(`input[name="${name}"]`));
}

async function completeStripeCheckout(checkout: Page, cardNumber: string) {
  const frames = checkout.frames();
  const cardLocators = [
    checkout.getByPlaceholder(/card number/i),
    checkout.locator('input[name="cardNumber"]'),
    ...frames.flatMap((frame) => inputLocators(frame, ["cardnumber", "cardNumber"])),
  ];
  await fillFirstVisible(cardLocators, cardNumber);
  await fillFirstVisible([
    checkout.getByPlaceholder(/MM \/ YY/i),
    checkout.locator('input[name="exp-date"]'),
    ...frames.flatMap((frame) => inputLocators(frame, ["exp-date", "expDate"])),
  ], "12/34");
  await fillFirstVisible([
    checkout.getByPlaceholder(/CVC/i),
    checkout.locator('input[name="cvc"]'),
    ...frames.flatMap((frame) => inputLocators(frame, ["cvc"])),
  ], "123");
  await checkout.getByRole("button", { name: /pagar|pay/i }).click();
}

async function createCheckout(page: Page) {
  await page.getByRole("tab", { name: "Movimientos" }).click();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Generar enlace de pago" }).click();
  const checkout = await popup;
  await checkout.waitForLoadState("domcontentloaded");
  return checkout;
}

test.describe("Economía — Stripe Connect en test mode", () => {
  test.describe.configure({ mode: "serial" });
  const prerequisite = stripePrerequisiteReason();
  test.skip(Boolean(prerequisite), prerequisite ?? "");

  test.afterEach(async () => {
    const environment = stripeEnvironment();
    if (environment) await cleanupFixtures(environment);
  });

  test("la cuenta conectada pertenece al club, es test-mode y abre onboarding hosted", async ({ page }) => {
    const environment = stripeEnvironment();
    if (!environment) throw new Error("Precondición Stripe E2E no resuelta.");
    const stripe = new Stripe(environment.secretKey);
    const account = await stripe.accounts.retrieve(environment.connectedAccountId);
    const platformBalance = await stripe.balance.retrieve();
    expect(account.id).toBe(environment.connectedAccountId);
    expect(platformBalance.livemode).toBe(false);
    expect(account.controller?.stripe_dashboard?.type).toBe("full");

    await openEconomiaAsAdmin(page);
    const workspaceId = await page.evaluate(() => window.localStorage.getItem("sportapp_active_workspace_id"));
    const client = await createReadClient(environment);
    const { data: connection, error } = await client
      .from("stripe_connected_accounts")
      .select("workspace_id,stripe_account_id,status")
      .eq("workspace_id", workspaceId ?? "")
      .maybeSingle();
    if (error || !connection) throw error ?? new Error("El club E2E no tiene una conexión Stripe fixture.");
    expect(connection.stripe_account_id).toBe(environment.connectedAccountId);
    expect(connection.status).toBe("active");
    await expect(page.getByText("Activa", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Actualizar datos" }).click();
    await page.waitForURL(/stripe\.com/, { timeout: 20000 });
  });

  test("Checkout 4242 confirma una vez por webhook, permite replay y actualiza el neto tras refund", async ({ page }, testInfo) => {
    const environment = stripeEnvironment();
    if (!environment) throw new Error("Precondición Stripe E2E no resuelta.");
    const stripe = new Stripe(environment.secretKey);
    await openEconomiaAsAdmin(page);
    const fixture = await createChargeFixture(page, environment, `E2E Stripe 4242 ${testInfo.project.name}-${Date.now()}`);
    const checkout = await createCheckout(page);
    await completeStripeCheckout(checkout, "4242424242424242");
    await expect(checkout).toHaveURL(/\/economia\?checkout=processing/, { timeout: 30000 });

    const client = cleanupClient(environment);
    const attempt = await expect.poll(async () => {
      const { data, error } = await client
        .from("stripe_payment_attempts")
        .select("id,checkout_session_id,payment_intent_id,stripe_connected_account_id,status")
        .eq("entry_id", fixture.entryId)
        .maybeSingle();
      if (error) throw error;
      return data?.payment_intent_id && data.checkout_session_id ? data : null;
    }, { timeout: 30000 }).not.toBeNull();
    void attempt;

    const { data: paymentAttempt, error: paymentAttemptError } = await client
      .from("stripe_payment_attempts")
      .select("id,checkout_session_id,payment_intent_id,stripe_connected_account_id,status")
      .eq("entry_id", fixture.entryId)
      .single();
    if (paymentAttemptError || !paymentAttempt?.checkout_session_id || !paymentAttempt.payment_intent_id) {
      throw paymentAttemptError ?? new Error("Stripe no registró el intento de pago E2E.");
    }
    expect(paymentAttempt.status).toBe("succeeded");

    const session = await stripe.checkout.sessions.retrieve(paymentAttempt.checkout_session_id, {}, { stripeAccount: environment.connectedAccountId });
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentAttempt.payment_intent_id, {}, { stripeAccount: environment.connectedAccountId });
    expect(session.metadata?.workspace_id).toBe(fixture.workspaceId);
    expect(session.metadata?.entry_id).toBe(fixture.entryId);
    expect(paymentIntent.amount).toBe(1000);
    expect(paymentIntent.livemode).toBe(false);

    await expect.poll(async () => {
      const { count, error } = await client
        .from("economic_movements")
        .select("id", { count: "exact", head: true })
        .eq("entry_id", fixture.entryId)
        .eq("movement_type", "settlement")
        .eq("payment_method", "stripe")
        .eq("external_status", "succeeded");
      if (error) throw error;
      return count;
    }, { timeout: 30000 }).toBe(1);

    const { data: webhookEvent, error: webhookEventError } = await client
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("object_id", paymentAttempt.checkout_session_id)
      .eq("processing_status", "processed")
      .maybeSingle();
    if (webhookEventError || !webhookEvent) throw webhookEventError ?? new Error("No se recibió el webhook checkout.session.completed E2E.");
    const event = await stripe.events.retrieve(webhookEvent.event_id);
    const replayPayload = JSON.stringify({ ...event, account: environment.connectedAccountId });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: replayPayload, secret: environment.connectWebhookSecret });
    const replay = await page.request.post(`${E2E_BASE_URL}/api/stripe/connect-webhook`, {
      data: replayPayload,
      headers: { "stripe-signature": signature },
    });
    expect(replay.ok()).toBe(true);
    const { count: replayedSettlementCount, error: replayCountError } = await client
      .from("economic_movements")
      .select("id", { count: "exact", head: true })
      .eq("entry_id", fixture.entryId)
      .eq("movement_type", "settlement")
      .eq("payment_method", "stripe");
    if (replayCountError) throw replayCountError;
    expect(replayedSettlementCount).toBe(1);

    await page.goto(`${E2E_BASE_URL}/economia`);
    await page.getByRole("tab", { name: "Movimientos" }).click();
    await page.getByRole("button", { name: /Reembolsar cobro Stripe/ }).click();
    const refundDialog = page.getByRole("dialog", { name: "Reembolsar cobro Stripe" });
    await refundDialog.getByLabel(/Importe a reembolsar/).fill("500");
    await refundDialog.getByRole("button", { name: "Solicitar reembolso" }).click();
    await expect(refundDialog.getByRole("status")).toBeVisible();
    await expect.poll(async () => {
      const { data, error } = await client
        .from("economic_movements")
        .select("amount_minor,external_status")
        .eq("entry_id", fixture.entryId)
        .eq("movement_type", "refund")
        .maybeSingle();
      if (error) throw error;
      return data?.external_status === "succeeded" ? data.amount_minor : null;
    }, { timeout: 30000 }).toBe(500);
    await page.reload();
    await page.getByRole("tab", { name: "Movimientos" }).click();
    await expect(page.getByText("Reembolsado parcial", { exact: true })).toBeVisible();
  });

  test("3DS 4000 0025 0000 3155 exige el flujo de autenticación dirigido", async ({ page }, testInfo) => {
    test.skip(process.env.E2E_STRIPE_DIRECTED_CARDS !== "true", "Requiere E2E_STRIPE_DIRECTED_CARDS=true y completar el challenge 3DS del Checkout de prueba.");
    const environment = stripeEnvironment();
    if (!environment) throw new Error("Precondición Stripe E2E no resuelta.");
    await openEconomiaAsAdmin(page);
    await createChargeFixture(page, environment, `E2E Stripe 3DS ${testInfo.project.name}-${Date.now()}`);
    const checkout = await createCheckout(page);
    await completeStripeCheckout(checkout, "4000002500003155");
    await expect(checkout.getByText(/3D Secure|autenticación/i)).toBeVisible({ timeout: 15000 });
  });

  test("4000 0000 0000 9995 muestra el rechazo de pago dirigido", async ({ page }, testInfo) => {
    test.skip(process.env.E2E_STRIPE_DIRECTED_CARDS !== "true", "Requiere E2E_STRIPE_DIRECTED_CARDS=true para ejecutar el rechazo de tarjeta de prueba.");
    const environment = stripeEnvironment();
    if (!environment) throw new Error("Precondición Stripe E2E no resuelta.");
    await openEconomiaAsAdmin(page);
    await createChargeFixture(page, environment, `E2E Stripe decline ${testInfo.project.name}-${Date.now()}`);
    const checkout = await createCheckout(page);
    await completeStripeCheckout(checkout, "4000000000009995");
    await expect(checkout.getByText(/rechazada|declined|no se ha podido/i)).toBeVisible({ timeout: 15000 });
  });
});

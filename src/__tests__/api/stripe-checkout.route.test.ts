import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireWorkspaceAdmin: vi.fn(),
  getSupabaseServiceClient: vi.fn(),
  getStripe: vi.fn(),
  getServerEnv: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireWorkspaceAdmin: mocks.requireWorkspaceAdmin }));
vi.mock("@/services/supabase-server", () => ({ getSupabaseServiceClient: mocks.getSupabaseServiceClient }));
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe }));
vi.mock("@/lib/serverEnv", () => ({ getServerEnv: mocks.getServerEnv }));

import { POST } from "@/app/api/stripe/checkout/route";

const workspaceId = "workspace-1";
const entry = { id: "entry-1", workspace_id: workspaceId, entry_type: "player_charge", lifecycle: "open", amount_minor: 10000, currency_code: "EUR", concept: "Cuota" };
const account = { id: "connection-1", workspace_id: workspaceId, stripe_account_id: "acct_club", status: "active" };
const attempt = { id: "attempt-1", workspace_id: workspaceId, entry_id: entry.id, stripe_connected_account_id: account.id, amount_minor: 6000, currency_code: "EUR", idempotency_key: "00000000-0000-4000-8000-000000000001", checkout_session_id: null, status: "created" };

function request(payload: object = { workspaceId, entryId: entry.id }) {
  return new Request("http://localhost/api/stripe/checkout", { method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: JSON.stringify(payload) });
}

function mockSupabase(options: { entry?: object | null; account?: object | null; settings?: object | null; movements?: object[]; activeAttempt?: object | null } = {}) {
  const rows = {
    economic_entries: options.entry === undefined ? entry : options.entry,
    stripe_connected_accounts: options.account === undefined ? account : options.account,
    economic_settings: options.settings === undefined ? { currency_code: "EUR" } : options.settings,
    economic_movements: options.movements ?? [],
    stripe_payment_attempts: options.activeAttempt === undefined ? null : options.activeAttempt,
  };
  const insertSingle = vi.fn().mockResolvedValue({ data: attempt, error: null });
  const updateEq = vi.fn();
  updateEq.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const insert = vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) }));
  const from = vi.fn((table: keyof typeof rows) => ({
    select: vi.fn(() => {
      const result = rows[table];
      if (table === "economic_movements") {
        return { eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: result, error: null }) })) };
      }
      const maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null });
      const chain = { eq: vi.fn(() => chain), in: vi.fn(() => chain), order: vi.fn(() => chain), limit: vi.fn(() => chain), maybeSingle, single: vi.fn().mockResolvedValue({ data: result, error: null }) };
      return chain;
    }),
    insert,
    update: vi.fn(() => ({ eq: updateEq })),
  }));
  mocks.getSupabaseServiceClient.mockReturnValue({ from });
  return { from, insert };
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceAdmin.mockResolvedValue({ workspaceId, role: "admin", userId: "user-1" });
    mocks.getServerEnv.mockReturnValue({ appUrl: "https://app.test" });
    mocks.getStripe.mockReturnValue({ checkout: { sessions: { create: vi.fn().mockResolvedValue({ id: "cs_checkout", url: "https://checkout.stripe.test/session" }) } } });
  });

  it("crea Checkout de 6.000 tras un cobro parcial confirmado de 4.000", async () => {
    const { insert } = mockSupabase({ movements: [{ movement_type: "settlement", external_status: "succeeded", amount_minor: 4000, currency_code: "EUR" }] });

    const response = await POST(request({ workspaceId, entryId: entry.id, amountMinor: 1, currencyCode: "USD", stripeAccountId: "acct_other" }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ amount_minor: 6000, currency_code: "EUR", workspace_id: workspaceId }));
    expect(mocks.getStripe().checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ mode: "payment", line_items: [expect.objectContaining({ price_data: expect.objectContaining({ currency: "eur", unit_amount: 6000 }) })] }), expect.objectContaining({ stripeAccount: "acct_club", idempotencyKey: attempt.idempotency_key }));
  });

  it("rechaza gastos, monedas no configuradas y accesos no autorizados", async () => {
    mockSupabase({ entry: { ...entry, entry_type: "expense" } });
    expect((await POST(request())).status).toBe(422);
    mocks.requireWorkspaceAdmin.mockRejectedValue({ status: 403 });
    expect((await POST(request())).status).toBe(403);
  });
});

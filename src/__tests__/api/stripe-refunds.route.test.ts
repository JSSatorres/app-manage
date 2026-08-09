import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireWorkspaceAdmin: vi.fn(),
  getSupabaseServiceClient: vi.fn(),
  getStripe: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireWorkspaceAdmin: mocks.requireWorkspaceAdmin }));
vi.mock("@/services/supabase-server", () => ({ getSupabaseServiceClient: mocks.getSupabaseServiceClient }));
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe }));

import { POST } from "@/app/api/stripe/refunds/route";

const workspaceId = "workspace-1";
const settlement = {
  id: "settlement-1",
  workspace_id: workspaceId,
  entry_id: "entry-1",
  movement_type: "settlement",
  payment_method: "stripe",
  amount_minor: 5000,
  currency_code: "EUR",
  external_status: "succeeded",
  external_reference: "stripe:pi_123",
};
const attempt = {
  id: "attempt-1",
  workspace_id: workspaceId,
  stripe_connected_account_id: "connection-1",
  payment_intent_id: "pi_123",
};
const account = {
  id: "connection-1",
  workspace_id: workspaceId,
  stripe_account_id: "acct_club",
  status: "active",
};

function request(payload: object = {
  workspaceId,
  settlementId: settlement.id,
  amountMinor: 2000,
  reason: "requested_by_customer",
}) {
  return new Request("http://localhost/api/stripe/refunds", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function mockSupabase(options: {
  settlement?: object | null;
  attempt?: object | null;
  account?: object | null;
  adjustments?: object[];
} = {}) {
  const economicMovements = [options.settlement === undefined ? settlement : options.settlement, options.adjustments ?? []];
  let economicMovementReads = 0;
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => {
      const result = table === "economic_movements"
        ? economicMovements[economicMovementReads++]
        : table === "stripe_payment_attempts"
          ? options.attempt === undefined ? attempt : options.attempt
          : options.account === undefined ? account : options.account;
      const chain = {
        eq: vi.fn(() => chain),
        maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
        then: (resolve: (value: { data: unknown; error: null }) => unknown) => resolve({ data: result, error: null }),
      };
      return chain;
    }),
  }));
  mocks.getSupabaseServiceClient.mockReturnValue({ from });
}

describe("POST /api/stripe/refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceAdmin.mockResolvedValue({ workspaceId, role: "admin", userId: "user-1" });
    mocks.getStripe.mockReturnValue({
      paymentIntents: { retrieve: vi.fn().mockResolvedValue({ id: "pi_123", status: "succeeded", amount: 5000, currency: "eur" }) },
      refunds: { create: vi.fn().mockResolvedValue({ id: "re_123", status: "pending" }) },
    });
  });

  it("solicita un refund parcial idempotente en la cuenta Stripe del club sin crear un movimiento confirmado", async () => {
    mockSupabase();

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ refundId: "re_123", status: "processing" });
    expect(mocks.getStripe().refunds.create).toHaveBeenCalledWith(
      { payment_intent: "pi_123", amount: 2000, reason: "requested_by_customer" },
      { stripeAccount: "acct_club", idempotencyKey: "refund:settlement-1:2000:requested_by_customer" },
    );
  });

  it("rechaza importes que exceden el neto reembolsable y cuentas que no corresponden al cobro", async () => {
    mockSupabase({ adjustments: [{ movement_type: "refund", external_status: "succeeded", amount_minor: 4000 }] });
    expect((await POST(request())).status).toBe(422);
    expect(mocks.getStripe().refunds.create).not.toHaveBeenCalled();

    mockSupabase({ account: { ...account, id: "connection-other" } });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.getStripe().refunds.create).not.toHaveBeenCalled();
  });

  it("exige un admin y un motivo Stripe válido", async () => {
    mocks.requireWorkspaceAdmin.mockRejectedValue({ status: 403 });
    expect((await POST(request())).status).toBe(403);

    expect((await POST(request({ workspaceId, settlementId: settlement.id, amountMinor: 2000, reason: "otro" }))).status).toBe(400);
  });
});
